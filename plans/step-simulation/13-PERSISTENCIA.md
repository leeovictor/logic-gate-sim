# 13 — Persistência e Compartilhamento

**Fase:** 4 — Storage  
**Dependências:** 01-TIPOS  
**Arquivos alvo:** `src/storage/persistence.ts`, `src/storage/sharing.ts`

---

## Objetivo

Persistir o `simulationMode` no localStorage e incluí-lo no payload de compartilhamento. O `stepSimulation` runtime (timer, stepCount) **não** é persistido — é estado transiente.

---

## Instruções de Implementação

### 1. Atualizar serialização em `persistence.ts`

#### 1.1 Expandir `SerializedCircuitV2`

Adicionar campo opcional:

```ts
export interface SerializedCircuitV2 {
  version: 2;
  components: PlacedComponent[];
  wireSegments: WireSegment[];
  junctions: WireJunction[];
  _nextId: number;
  _nextWireId: number;
  _nextJunctionId: number;
  simulationMode?: "instant" | "step";   // ← NOVO (opcional para backward-compat)
}
```

#### 1.2 Atualizar `serializeCircuit()`

Adicionar o campo ao objeto serializado. Omitir se `"instant"` (default) para manter payloads menores:

```ts
function serializeCircuit(state: EditorState): SerializedCircuitV2 {
  const components = state.components.map((c) => ({
    id: c.id,
    type: c.type,
    position: { ...c.position },
    state: stripPinValues(c.state),
  }));

  const serialized: SerializedCircuitV2 = {
    version: 2,
    components,
    wireSegments: state.wireSegments.map((w) => ({ ...w })),
    junctions: state.junctions.map((j) => ({ ...j })),
    _nextId: state._nextId,
    _nextWireId: state._nextWireId,
    _nextJunctionId: state._nextJunctionId,
  };

  // Only include simulationMode if not default
  if (state.simulationMode !== "instant") {
    serialized.simulationMode = state.simulationMode;
  }

  return serialized;
}
```

#### 1.3 Atualizar `loadCircuit()` return type

Expandir o Pick type para incluir o novo campo:

```ts
export function loadCircuit(): Pick<
  SerializedCircuitV2,
  "components" | "wireSegments" | "junctions" | "_nextId" | "_nextWireId" | "_nextJunctionId" | "simulationMode"
> | null {
```

No branch de v2, retornar o campo:

```ts
if (data.version === 2) {
  return {
    components: data.components,
    wireSegments: data.wireSegments,
    junctions: data.junctions,
    _nextId: data._nextId,
    _nextWireId: data._nextWireId,
    _nextJunctionId: data._nextJunctionId,
    simulationMode: data.simulationMode,   // ← NOVO (undefined se ausente)
  };
}
```

### 2. Atualizar `main.ts` para restaurar `simulationMode`

Localizar a seção de loading em `main.ts`:

```ts
if (urlLoaded) {
  state.components = urlLoaded.components;
  // ...
} else {
  const loaded = loadCircuit();
  if (loaded) {
    state.components = loaded.components;
    // ...
  }
}
```

Adicionar após os assignments de cada branch:

```ts
if (urlLoaded.simulationMode) {
  state.simulationMode = urlLoaded.simulationMode;
}
```

E analogamente para o branch `loaded`.

### 3. Atualizar sharing

#### 3.1 `src/storage/binary-format.ts`

Se o binary format exporta/importa `SerializedCircuitV2`, verificar se o campo `simulationMode` é incluído na serialização binária. Se o format usa JSON internamente, o campo será incluído automaticamente.

Se usa encoding binário customizado, adicionar o campo ao schema:
- 1 byte: `0x00` = instant, `0x01` = step
- Posicionar no final do payload para backward-compat (bytes extras são ignorados por decoders antigos)

#### 3.2 `loadFromUrl()` em `src/storage/sharing.ts`

O retorno já é `SerializedCircuitV2 | null` — o campo `simulationMode` estará presente se foi serializado. Nenhuma mudança necessária no código de sharing.

---

## Backward-Compatibility

- **Circuitos v2 sem `simulationMode`** → campo é `undefined` → tratado como `"instant"` (default).
- **Circuitos v1** → migração para v2 já existente, não inclui simulationMode → default `"instant"`.
- **Nenhuma nova versão de formato necessária** — o campo é opcional dentro de v2.

---

## Validação

```bash
npm run test -- src/__tests__/persistence.test.ts
```

Verificar que testes existentes continuam passando.

Teste manual:
1. Salvar circuito em modo step → recarregar → modo step preservado
2. Salvar circuito em modo instant → recarregar → modo instant (default)
3. Compartilhar em modo step → carregar URL → modo step

---

## Checklist

- [ ] `SerializedCircuitV2` expandida com `simulationMode?`
- [ ] `serializeCircuit()` inclui campo se não-default
- [ ] `loadCircuit()` retorna `simulationMode`
- [ ] `main.ts` restaura `simulationMode` no load
- [ ] Backward-compat com circuitos existentes (campo undefined → instant)
- [ ] Testes de persistência passando
