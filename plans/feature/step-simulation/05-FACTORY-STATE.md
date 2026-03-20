# 05 — Factory `createEditorState()`

**Fase:** 2.1 — State  
**Dependências:** 01-TIPOS  
**Arquivo alvo:** `src/state/editor-state.ts`

---

## Objetivo

Inicializar os novos campos `simulationMode` e `stepSimulation` em `createEditorState()` para que o `EditorState` cumpra a interface expandida.

---

## Instruções de Implementação

### 1. Adicionar campos ao retorno de `createEditorState()`

Localizar a função em `src/state/editor-state.ts` e adicionar os dois campos novos ao objeto retornado. Posicioná-los após `simulationEnabled`:

```ts
export function createEditorState(): EditorState {
  return {
    selectedTool: null,
    components: [],
    cursorPosition: null,
    selectedComponentIds: new Set(),
    selectedWireIds: new Set(),
    selectedJunctionIds: new Set(),
    wireSegments: [],
    junctions: [],
    pendingWire: null,
    hoveredPin: null,
    dragging: null,
    selectionBox: null,
    simulationEnabled: false,
    simulationMode: "instant",                    // ← NOVO
    stepSimulation: {                             // ← NOVO
      stepCount: 0,
      running: false,
      stepInterval: 500,
      autoStepTimer: null,
      previousNetValues: new Map(),
      stable: false,
    },
    events: new EventTarget(),
    nets: [],
    _nextId: 0,
    _nextWireId: 0,
    _nextJunctionId: 0,
  };
}
```

### 2. Não precisa de import adicional

Os tipos `SimulationMode` e `StepSimulationState` são referenciados indiretamente via `EditorState`. O import existente de `EditorState` do `@/core/types` já é suficiente.

---

## Validação

Após esta fase + Fase 01, o projeto deve compilar sem erros:

```bash
npm run build
```

Se a Fase 01 e esta Fase 05 forem feitas juntas, o build deve passar. Se feitas separadamente, o build vai falhar na Fase 01 até esta fase ser aplicada.

```bash
npm run test
```

Todos os testes devem passar — os testes usam `createEditorState()` que agora retorna o state completo com os defaults corretos.

---

## Checklist

- [ ] `simulationMode: "instant"` adicionado ao factory
- [ ] `stepSimulation` completo com todos os campos e defaults adicionado ao factory
- [ ] Build passa
- [ ] Todos os testes passam
