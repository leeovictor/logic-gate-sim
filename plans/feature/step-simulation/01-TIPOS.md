# 01 — Novos Tipos para Simulação por Step

**Fase:** 1.1 — Core  
**Dependências:** Nenhuma  
**Arquivo alvo:** `src/core/types.ts`

---

## Objetivo

Definir os tipos `SimulationMode` e `StepSimulationState` e expandir `EditorState` com os novos campos necessários para o modo step.

---

## Instruções de Implementação

### 1. Adicionar `SimulationMode` após a definição de `SignalValue`

Localizar a linha:

```ts
export type SignalValue = 0 | 1 | "E";
```

Adicionar abaixo:

```ts
/** Simulation mode: instant (converge in one call) or step (one propagation layer per step) */
export type SimulationMode = "instant" | "step";
```

### 2. Adicionar `StepSimulationState` após `DragState`

Localizar a interface `DragState` e após seu fechamento, adicionar:

```ts
export interface StepSimulationState {
  /** Steps executed since simulation start/reset */
  stepCount: number;
  /** Whether auto-step is running */
  running: boolean;
  /** Interval in ms between auto-steps */
  stepInterval: number;
  /** Timer ID for auto-step (for cancellation) */
  autoStepTimer: ReturnType<typeof setInterval> | null;
  /** Net values from the previous step (for stability detection) */
  previousNetValues: Map<string, SignalValue>;
  /** Whether the circuit has stabilized (no net changed in last step) */
  stable: boolean;
}
```

### 3. Expandir `EditorState`

Adicionar dois campos novos à interface `EditorState`, antes de `_nextId`:

```ts
export interface EditorState {
  // ... campos existentes ...
  simulationEnabled: boolean;
  simulationMode: SimulationMode;          // ← NOVO
  stepSimulation: StepSimulationState;     // ← NOVO
  events: EventTarget;
  nets: Net[];
  _nextId: number;
  _nextWireId: number;
  _nextJunctionId: number;
}
```

---

## Validação

Após as alterações:

```bash
npm run build
```

O build vai falhar em `src/state/editor-state.ts` porque `createEditorState()` não retorna os campos novos — isso é esperado e será resolvido na Fase 2.1. O objetivo aqui é apenas definir os tipos.

Para validar isoladamente, verificar que `src/core/types.ts` não tem erros de sintaxe TypeScript:

```bash
npx tsc --noEmit src/core/types.ts 2>&1 | head -20
```

---

## Checklist

- [ ] `SimulationMode` type exportado
- [ ] `StepSimulationState` interface exportada
- [ ] `EditorState` contém `simulationMode` e `stepSimulation`
- [ ] Sem erros de sintaxe no arquivo
