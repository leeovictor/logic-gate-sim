# Plano: Formato Binário + Compressão para URL de Compartilhamento

## Contexto

Atualmente, a URL de compartilhamento serializa o circuito como JSON → Base64 URL-safe. Isso é extremamente verboso: chaves repetidas (`"type"`, `"position"`, `"componentId"`, etc.), IDs como strings (`"comp-0"`, `"wire-3"`), e coordenadas como texto decimal. Um circuito com 10 componentes e 10 fios gera ~2500-3500 caracteres na URL.

### Exemplo do JSON atual (2 componentes + 1 fio)

```json
{
  "version":2,
  "components":[
    {"id":"comp-0","type":"and-gate","position":{"x":100,"y":200},"state":{}},
    {"id":"comp-1","type":"switch","position":{"x":10,"y":20},"state":{"value":0}}
  ],
  "wireSegments":[
    {"id":"wire-0","from":{"type":"pin","componentId":"comp-1","pinIndex":0},"to":{"type":"pin","componentId":"comp-0","pinIndex":0}}
  ],
  "junctions":[],
  "_nextId":2,
  "_nextWireId":1,
  "_nextJunctionId":0
}
```

**→ 338 bytes JSON → 452 chars Base64** (para apenas 2 componentes!)

### Fontes de desperdício no JSON

| Causa | Impacto |
|---|---|
| Chaves repetidas (`"type"`, `"position"`, `"componentId"`, `"pinIndex"`) | ~40% do payload |
| IDs como strings (`"comp-0"`, `"wire-3"`) | ~15% do payload |
| Overhead JSON (aspas, chaves, colchetes, vírgulas) | ~20% do payload |
| Coordenadas como texto decimal (`"100"` = 3 bytes vs uint16 = 2 bytes) | ~5% do payload |
| Campo `version`, contadores `_next*` | ~5% do payload |

## Estratégia

Duas camadas independentes de otimização, aplicadas em sequência:

1. **Formato binário compacto** — elimina toda a redundância estrutural do JSON
2. **Compressão deflate** — comprime padrões repetitivos nos bytes binários

Pipeline: `EditorState → Binary → Deflate → Base64 URL-safe → URL`

### Estimativa de redução

| Circuito | JSON Base64 | Binário Base64 | Binário+Deflate Base64 |
|---|---|---|---|
| 2 comp + 1 fio | ~452 chars | ~40 chars | ~36 chars |
| 10 comp + 10 fios | ~3000 chars | ~200 chars | ~140 chars |
| 30 comp + 40 fios | ~10000 chars | ~600 chars | ~350 chars |

**Redução total esperada: ~93-97%**

## Parte 1: Formato Binário

### Design do formato

Todos os valores multi-byte usam **little-endian**. O formato é um stream de bytes sequenciais sem alinhamento.

#### Header (13 bytes fixos)

| Offset | Tamanho | Campo | Descrição |
|---|---|---|---|
| 0 | 1 byte | `formatVersion` | Sempre `3` (distingue de JSON que começa com `{` = 0x7B) |
| 1 | 2 bytes | `componentCount` | uint16 — quantidade de componentes |
| 3 | 2 bytes | `wireCount` | uint16 — quantidade de wire segments |
| 5 | 2 bytes | `junctionCount` | uint16 — quantidade de junctions |
| 7 | 2 bytes | `nextId` | uint16 — `_nextId` |
| 9 | 2 bytes | `nextWireId` | uint16 — `_nextWireId` |
| 11 | 2 bytes | `nextJunctionId` | uint16 — `_nextJunctionId` |

#### ComponentType enum (1 byte)

| Valor | Tipo |
|---|---|
| 0 | `and-gate` |
| 1 | `or-gate` |
| 2 | `not-gate` |
| 3 | `switch` |
| 4 | `light` |

> Novos componentes adicionados futuramente recebem o próximo valor sequencial. O mapeamento é definido por um array fixo em `src/persistence.ts`.

#### Component (6 bytes cada)

| Offset | Tamanho | Campo |
|---|---|---|
| +0 | 1 byte | `typeEnum` — ComponentType enum |
| +1 | 2 bytes | `x` — uint16 position.x |
| +3 | 2 bytes | `y` — uint16 position.y |
| +5 | 1 byte | `stateFlags` — bitfield para estado do componente |

**stateFlags** (bitfield):
- Bit 0: `value` (usado por switch: 0=off, 1=on)
- Bits 1-7: reservados para futuros estados

> **Nota sobre IDs**: Os IDs dos componentes (`comp-0`, `comp-1`, ...) **não são armazenados**. O índice do componente no array binário **é** seu ID numérico. Na desserialização, reconstrói-se `id = "comp-" + index`.

#### WireEndpoint (variável: 3-5 bytes)

| Byte 0 | Valor | Payload | Total |
|---|---|---|---|
| `0` (pin) | componentIndex: uint16 + pinIndex: uint8 | 3 bytes | 4 bytes |
| `1` (point) | x: uint16 + y: uint16 | 4 bytes | 5 bytes |
| `2` (junction) | junctionIndex: uint16 | 2 bytes | 3 bytes |

#### WireSegment (variável: 6-10 bytes cada)

Cada wire segment é simplesmente `from: WireEndpoint` seguido de `to: WireEndpoint`, sem ID armazenado (reconstruído como `"wire-" + index`).

#### Junction (4 bytes cada)

| Offset | Tamanho | Campo |
|---|---|---|
| +0 | 2 bytes | `x` — uint16 position.x |
| +2 | 2 bytes | `y` — uint16 position.y |

> ID reconstruído como `"junc-" + index`.

### Exemplo concreto: 2 componentes + 1 fio (pin-to-pin)

```
Header:     03 02 00 01 00 00 00 02 00 01 00 00 00   (13 bytes)
Comp 0:     00 64 00 C8 00 00                          (6 bytes: and-gate, x=100, y=200, state=0)
Comp 1:     03 0A 00 14 00 00                          (6 bytes: switch, x=10, y=20, state=0)
Wire 0:     00 01 00 00  00 00 00 00                   (8 bytes: from=pin,comp1,pin0 → to=pin,comp0,pin0)
Total:      33 bytes → 44 chars Base64
```

**vs JSON atual: 338 bytes → 452 chars Base64 — redução de 90%**

## Parte 2: Compressão Deflate

### Biblioteca escolhida: `fflate`

| Critério | `fflate` | `pako` | `CompressionStream` (Web API) |
|---|---|---|---|
| Tamanho | ~8 KB gzipped | ~45 KB gzipped | 0 KB (built-in) |
| API | Síncrona | Síncrona | Assíncrona (streams) |
| Performance | Muito rápida | Boa | Boa |
| Compatibilidade | Todos os browsers | Todos os browsers | Chrome 80+, FF 113+, Safari 16.4+ |
| Tree-shaking | Sim (ESM) | Parcial | N/A |

**Decisão: `fflate`** — síncrona (a API de export/import atual é síncrona), tree-shakeable (importa apenas `deflateSync`/`inflateSync`), e bundle mínimo (~3-4 KB gzipped com tree-shaking).

### Pipeline de codificação

```
EditorState
  → serializeToBinary(): Uint8Array        (formato binário v3)
  → deflateSync(bytes): Uint8Array          (compressão fflate)
  → uint8ArrayToBase64Url(): string         (Base64 URL-safe)
  → URL query param ?c=<string>
```

### Pipeline de decodificação

```
URL query param ?c=<string>
  → base64UrlToUint8Array(): Uint8Array     (decode Base64)
  → inflateSync(bytes): Uint8Array          (descompressão fflate)
  → deserializeFromBinary(): SerializedCircuitV2  (parse binário v3)
  → carregar no EditorState
```

### Detecção de formato (backward compatibility)

A decodificação precisa aceitar tanto o formato antigo (JSON/Base64) quanto o novo (binário+deflate/Base64). A detecção é feita pelo primeiro byte após decode do Base64:

- **Formato antigo**: O JSON começa com `{` (0x7B), logo o Base64 começa com `eyJ...`
- **Formato novo**: O byte comprimido pelo deflate começa com um header deflate (tipicamente 0x78), e mesmo o formato binário sem compressão começa com `0x03`

Algoritmo de detecção em `importCircuitFromBase64`:

```typescript
function importCircuitFromBase64(encoded: string): SerializedCircuitV2 | null {
  const bytes = base64UrlToUint8Array(encoded);
  
  // Tenta formato novo: deflate + binary
  const decompressed = tryInflate(bytes);
  if (decompressed && decompressed[0] === 3) {
    return deserializeFromBinary(decompressed);
  }
  
  // Tenta formato binário sem compressão
  if (bytes[0] === 3) {
    return deserializeFromBinary(bytes);
  }
  
  // Fallback: formato JSON legado
  const json = new TextDecoder().decode(bytes);
  return parseJsonCircuit(json);
}
```

## Tarefas

### 1. Instalar `fflate` (`package.json`)

- `npm install fflate`
- Dependência de produção (não dev), pois é usada no bundle final

### 2. Funções de serialização binária (`src/persistence.ts`)

- Definir array constante `COMPONENT_TYPES: ComponentType[]` para mapeamento enum ↔ string
- Implementar `serializeToBinary(state: EditorState): Uint8Array`:
  - Calcular tamanho total do buffer (header + componentes + wires + junctions)
  - Alocar `Uint8Array` com `DataView` para escrita
  - Escrever header, componentes, wire segments, junctions sequencialmente
- Implementar `deserializeFromBinary(bytes: Uint8Array): SerializedCircuitV2 | null`:
  - Validar formatVersion === 3
  - Ler header, iterar componentes (reconstruindo IDs com `"comp-" + i`)
  - Ler wire segments (reconstruindo IDs com `"wire-" + i`)
  - Ler junctions (reconstruindo IDs com `"junc-" + i`)
  - Resolver referências de endpoints (componentIndex → `"comp-" + index`)

### 3. Integrar compressão deflate (`src/persistence.ts`)

- Importar `deflateSync` e `inflateSync` de `fflate`
- Implementar helper `compressBytes(data: Uint8Array): Uint8Array` — wrapper de `deflateSync` com level 6 (bom balanço velocidade/tamanho)
- Implementar helper `decompressBytes(data: Uint8Array): Uint8Array | null` — wrapper de `inflateSync` com try/catch

### 4. Atualizar `exportCircuitToBase64` e `importCircuitFromBase64` (`src/persistence.ts`)

- **`exportCircuitToBase64`**: Mudar pipeline para `serialize → binary → compress → base64url`
- **`importCircuitFromBase64`**: Implementar detecção de formato (novo binário+deflate / binário sem compressão / JSON legado)
- Implementar `uint8ArrayToBase64Url(bytes: Uint8Array): string` e `base64UrlToUint8Array(str: string): Uint8Array` que usam `btoa`/`atob` com conversão de chars URL-safe
- `saveCircuit` e `loadCircuit` (localStorage) continuam usando JSON — o formato binário é **exclusivo para URLs de compartilhamento**

### 5. Testes (`src/__tests__/sharing.test.ts`)

- **Round-trip binário**: `serializeToBinary` → `deserializeFromBinary` preserva todos os dados
- **Round-trip compressão**: `compress` → `decompress` preserva bytes
- **Round-trip completo**: `exportCircuitToBase64` (novo) → `importCircuitFromBase64` funciona
- **Backward compatibility**: URLs geradas no formato antigo (JSON/Base64) ainda são decodificadas corretamente
- **Componentes com estado**: Switch com `value: 1` preserva estado
- **Todos os tipos de endpoint**: pin, point, junction
- **Circuito vazio**: 0 componentes, 0 wires, 0 junctions
- **Circuito grande**: 50+ componentes para verificar que uint16 funciona
- **Tamanho da URL**: Verificar que a URL para 10 componentes + 10 fios é significativamente menor que antes (assert < 300 chars)

### 6. Remover `shareIcon` não utilizado (`src/toolbar-icons.ts`)

- A função `shareIcon()` foi desconectada da toolbar (botão agora é só texto). Removê-la para manter o código limpo.

## Ordem de implementação

1. `npm install fflate`
2. Constante `COMPONENT_TYPES` + `serializeToBinary()` + `deserializeFromBinary()`
3. Helpers de compressão (`compressBytes`, `decompressBytes`)
4. Helpers de Base64 para `Uint8Array` (`uint8ArrayToBase64Url`, `base64UrlToUint8Array`)
5. Atualizar `exportCircuitToBase64` e `importCircuitFromBase64` com novo pipeline + detecção de formato
6. Testes: round-trip, backward compat, tamanho
7. Cleanup: remover `shareIcon()`

## Riscos e considerações

- **Limite de coordenadas**: uint16 suporta 0-65535. Como a canvas raramente excede 4000px, é mais que suficiente. Se no futuro houver zoom/pan com coordenadas negativas, será necessário usar int16 (signed) no lugar.
- **Novos tipos de componente**: Ao adicionar um novo `ComponentType`, basta adicioná-lo ao array `COMPONENT_TYPES`. URLs existentes não são afetadas pois referenciam pelo índice, e novos tipos recebem índices maiores.
- **Novos campos de estado**: O `stateFlags` bitfield tem 7 bits reservados. Se um componente futuro precisar de mais estado, pode-se adicionar bytes extras condicionais baseados no `typeEnum`.
- **Backward compatibility de URLs**: URLs antigas (JSON/Base64) continuarão funcionando indefinidamente. A detecção de formato é robusta (primeiro byte diferencia JSON de binário).
- **Dependência `fflate`**: É uma biblioteca madura (2.5M downloads/semana), sem dependências transitivas, e contribui apenas ~3-4 KB gzipped ao bundle. A compressão pode ser removida no futuro sem impacto no formato binário (a detecção trata os dois casos).

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `package.json` | Adicionar `fflate` como dependência |
| `src/persistence.ts` | `COMPONENT_TYPES`, `serializeToBinary()`, `deserializeFromBinary()`, helpers de compressão e Base64, atualizar `exportCircuitToBase64`/`importCircuitFromBase64` |
| `src/toolbar-icons.ts` | Remover `shareIcon()` |
| `src/__tests__/sharing.test.ts` | Novos testes de round-trip binário, compressão, backward compat, e tamanho |
