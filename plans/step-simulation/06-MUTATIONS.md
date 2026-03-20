# 06 — Mutations para Modo Step

**Fase:** 2.2 — State  
**Dependências:** 01-TIPOS, 02-STEP-CIRCUIT, 03-FUNCOES-AUXILIARES, 05-FACTORY-STATE  
**Arquivo alvo:** `src/state/mutations.ts`

---

## Objetivo

Criar as funções de mutação que controlam o modo step: alternar modo, executar step, play/pause, ajustar velocidade e resetar.

---

## Instruções de Implementação

### 1. Adicionar imports

No topo de `src/state/mutations.ts`, expandir os imports:

```ts
import type { EditorState, ComponentType, ToolMode, Point, PlacedComponent, WireSegment, WireJunction, WireEndpoint, PendingWire, SimulationMode } from "@/core/types";
```

Adicionar import das funções de simulação step:

```ts
import { stepCircuit, resetStepSimulation, startAutoStep, stopAutoStep } from "@/core/simulation";
```

### 2. Adicionar `setSimulationMode()`

Ao final do arquivo, antes das funções de selection box:

```ts
export function setSimulationMode(state: EditorState, mode: SimulationMode): void {
  if (state.simulationMode === mode) return;
  state.simulationMode = mode;

  // When switching modes, reset step state and clear simulation values
  if (mode === "step") {
    resetStepSimulation(state);
  }
}
```

### 3. Adicionar `performStep()`

```ts
export function performStep(state: EditorState): void {
  if (!state.simulationEnabled || state.simulationMode !== "step") return;
  stepCircuit(state);
}
```

### 4. Adicionar `toggleAutoStep()`

```ts
export function toggleAutoStep(state: EditorState, onStep: () => void): void {
  if (!state.simulationEnabled || state.simulationMode !== "step") return;

  if (state.stepSimulation.running) {
    stopAutoStep(state);
  } else {
    startAutoStep(state, onStep);
  }
}
```

### 5. Adicionar `setStepInterval()`

```ts
export function setStepInterval(state: EditorState, ms: number): void {
  state.stepSimulation.stepInterval = ms;

  // If auto-step is running, restart timer with new interval
  if (state.stepSimulation.running) {
    const onStep = state.stepSimulation.autoStepTimer !== null
      ? () => {} // placeholder — caller should re-bind
      : () => {};
    stopAutoStep(state);
    startAutoStep(state, onStep);
  }
}
```

> **Nota:** O pattern de re-bind do callback no `setStepInterval` é limitado. Uma alternativa melhor é armazenar o callback no `StepSimulationState`. Porém, para manter o state serializável, a abordagem mais simples é: quando o usuário muda a velocidade durante auto-step, parar e reiniciar via `toggleAutoStep()` do caller. Assim, `setStepInterval` apenas atualiza o valor e a UI é responsável por reiniciar o timer se necessário.

**Implementação simplificada:**

```ts
export function setStepInterval(state: EditorState, ms: number): void {
  state.stepSimulation.stepInterval = ms;
  // If running, the caller (UI) should stop and restart auto-step
  // to apply the new interval
}
```

### 6. Adicionar `resetStep()`

```ts
export function resetStep(state: EditorState): void {
  if (state.simulationMode !== "step") return;
  resetStepSimulation(state);
}
```

### 7. Atualizar `toggleSimulation()`

Localizar a função existente:

```ts
export function toggleSimulation(state: EditorState): void {
  state.simulationEnabled = !state.simulationEnabled;
  if (state.simulationEnabled) {
    state.selectedTool = null;
    state.events.dispatchEvent(new CustomEvent("toolchange", { detail: null }));
  }
}
```

Adicionar cleanup do auto-step quando a simulação é desabilitada:

```ts
export function toggleSimulation(state: EditorState): void {
  state.simulationEnabled = !state.simulationEnabled;
  if (state.simulationEnabled) {
    state.selectedTool = null;
    state.events.dispatchEvent(new CustomEvent("toolchange", { detail: null }));
  } else {
    stopAutoStep(state);
    resetStepSimulation(state);
  }
}
```

---

## Decisões de Design

- **`performStep` é um thin wrapper sobre `stepCircuit`** — existe para manter a camada de mutations como ponto único de entrada para mudanças de estado.
- **`setStepInterval` não reinicia o timer** — delega essa responsabilidade para a UI. Isso evita capturar e armazenar callbacks no state.
- **`setSimulationMode("step")` reseta a simulação** — ao entrar no modo step, o circuito começa limpo para o usuário avançar step-by-step.

---

## Validação

```bash
npm run build
npm run test
```

---

## Checklist

- [ ] Import de `SimulationMode` adicionado
- [ ] Import das funções de simulation step adicionado
- [ ] `setSimulationMode()` exportada
- [ ] `performStep()` exportada
- [ ] `toggleAutoStep()` exportada
- [ ] `setStepInterval()` exportada
- [ ] `resetStep()` exportada
- [ ] `toggleSimulation()` atualizada com cleanup
- [ ] Build e testes passando
