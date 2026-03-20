# Plano: Extrair Lógica de Formato Binário para Módulo Separado

## Objetivo

Separar a lógica de construção/leitura do formato binário (v3) de `persistence.ts` em um módulo dedicado `storage/binary-format.ts`, respeitando o princípio de responsabilidade única.

**Motivação:** `persistence.ts` atualmente mistura três responsabilidades distintas:
1. Persistência localStorage (save/load JSON)
2. Serialização binária compacta (v3) + compressão + Base64
3. Migração de formatos (v1→v2)

O módulo tem ~280 linhas e a lógica binária sozinha representa ~60% do arquivo. Isolar o formato binário melhora testabilidade, legibilidade e permite evolução independente do formato.

## Análise de Responsabilidades Atual

```
persistence.ts (~280 linhas)
├── localStorage (save/load)
│   ├── serializeCircuit()          → JSON v2
│   ├── saveCircuit()               → localStorage.setItem
│   ├── loadCircuit()               → localStorage.getItem + parse
│   ├── isValidCircuit()            → validação
│   ├── migrateV1toV2()             → migração
│   └── stripPinValues()            → helper
│
├── Formato binário v3              ← EXTRAIR
│   ├── COMPONENT_TYPES[]           → enum mapping
│   ├── FORMAT_VERSION              → constante
│   ├── wireEndpointSize()          → cálculo de tamanho
│   ├── writeWireEndpoint()         → escrita binária
│   ├── readWireEndpoint()          → leitura binária
│   ├── serializeToBinary()         → EditorState → Uint8Array
│   └── deserializeFromBinary()     → Uint8Array → SerializedCircuitV2
│
└── Encoding/compressão             ← EXTRAIR (junto com binário)
    ├── uint8ArrayToBase64Url()     → Base64 URL-safe
    ├── base64UrlToUint8Array()     → decode Base64
    ├── compressBytes()             → deflate via fflate
    ├── decompressBytes()           → inflate via fflate
    ├── exportCircuitToBase64()     → pipeline completo encode
    └── importCircuitFromBase64()   → pipeline completo decode
```

## Estrutura Alvo

```
src/storage/
├── persistence.ts          # localStorage: save/load, validação, migração, tipos serializados
├── binary-format.ts        # formato binário v3: serialize/deserialize, Base64, compressão
├── sharing.ts              # URL sharing (sem mudanças)
└── index.ts                # (não existe hoje — opcional, barrel export)
```

## Plano de Extração

### Fase 1 — Criar `storage/binary-format.ts`

**Novo arquivo:** `src/storage/binary-format.ts`

Mover as seguintes funções e constantes de `persistence.ts`:

| Elemento | Tipo | Visibilidade no novo módulo |
|---|---|---|
| `COMPONENT_TYPES` | constante | interna |
| `FORMAT_VERSION` | constante | interna |
| `uint8ArrayToBase64Url()` | função | interna |
| `base64UrlToUint8Array()` | função | interna |
| `compressBytes()` | função | interna |
| `decompressBytes()` | função | interna |
| `wireEndpointSize()` | função | interna |
| `writeWireEndpoint()` | função | interna |
| `readWireEndpoint()` | função | interna |
| `serializeToBinary()` | função | **export** |
| `deserializeFromBinary()` | função | **export** |
| `exportCircuitToBase64()` | função | **export** |
| `importCircuitFromBase64()` | função | **export** |

**Imports no novo módulo:**
```typescript
import { deflateSync, inflateSync } from "fflate";
import type { ComponentType, EditorState, PlacedComponent, WireSegment, WireJunction } from "@/core/types";
import type { SerializedCircuitV2 } from "./persistence";
```

**Nota:** `importCircuitFromBase64()` usa `isValidCircuit()` e `migrateV1toV2()` internamente para o fallback de formato JSON legado. Duas opções:

- **Opção A (preferida):** Exportar `isValidCircuit` e `migrateV1toV2` de `persistence.ts` para uso em `binary-format.ts`
- **Opção B:** Mover o fallback JSON para `persistence.ts` e ter `binary-format.ts` retornar `null` quando não é formato binário, delegando o fallback ao chamador

**Recomendação:** Opção A — mantém a API pública idêntica e não exige mudanças nos consumidores.

### Fase 2 — Atualizar `persistence.ts`

Remover todo o código movido. O arquivo ficará com ~100 linhas:

```
persistence.ts (~100 linhas)
├── SerializedCircuitV1 (interface, interna)
├── SerializedCircuitV2 (interface, export)
├── SerializedCircuit (type union, interna)
├── serializeCircuit()              → interna
├── stripPinValues()                → interna
├── saveCircuit()                   → export
├── loadCircuit()                   → export
├── migrateV1toV2()                 → export (usado por binary-format.ts)
├── isValidCircuit()                → export (usado por binary-format.ts)
└── STORAGE_KEY                     → interna
```

### Fase 3 — Atualizar imports nos consumidores

| Arquivo | Antes | Depois |
|---|---|---|
| `src/storage/sharing.ts` | `import { exportCircuitToBase64, importCircuitFromBase64, type SerializedCircuitV2 } from "./persistence"` | `import { exportCircuitToBase64, importCircuitFromBase64 } from "./binary-format"` + `import type { SerializedCircuitV2 } from "./persistence"` |
| `src/__tests__/sharing.test.ts` | `import { exportCircuitToBase64, importCircuitFromBase64, serializeToBinary, deserializeFromBinary } from "@/storage/persistence"` | `import { exportCircuitToBase64, importCircuitFromBase64, serializeToBinary, deserializeFromBinary } from "@/storage/binary-format"` |
| `src/main.ts` | sem mudanças (usa apenas `saveCircuit`/`loadCircuit`) | sem mudanças |
| `src/__tests__/persistence.test.ts` | sem mudanças (testa apenas save/load) | sem mudanças |

### Fase 4 — Validação

```bash
npm run test      # todos os testes passam
npm run build     # build sem erros
```

## Resultado Esperado

| Módulo | Responsabilidade | Linhas (aprox.) |
|---|---|---|
| `persistence.ts` | Persistência localStorage, tipos serializados, validação, migração | ~100 |
| `binary-format.ts` | Formato binário v3, compressão, encoding Base64 URL-safe | ~180 |
| `sharing.ts` | Compartilhamento via URL (sem mudanças) | ~30 |

## Checklist de Segurança

- [ ] Nenhuma mudança na API pública do módulo `storage/` (mesmas funções exportadas, só mudam os arquivos de origem)
- [ ] `sharing.ts` continua funcionando com imports atualizados
- [ ] Testes existentes passam sem modificação de lógica (apenas imports)
- [ ] `npm run build` sem erros de tipo
- [ ] Nenhuma dependência circular introduzida (`binary-format.ts` → `persistence.ts` para tipos, não vice-versa)
