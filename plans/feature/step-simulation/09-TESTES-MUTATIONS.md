# 09 — Testes das Mutations Step

**Fase:** 5.2 — Testes  
**Dependências:** 06-MUTATIONS, 07-BARREL-EXPORT  
**Arquivo alvo:** `src/__tests__/step-mutations.test.ts` (novo)

---

## Objetivo

Testar as mutations de controle do modo step: `setSimulationMode`, `performStep`, `toggleAutoStep`, `setStepInterval`, `resetStep`.

---

## Instruções de Implementação

### Criar `src/__tests__/step-mutations.test.ts`

### Casos de Teste

#### 1. setSimulationMode alterna modos

```ts
it("setSimulationMode alterna entre instant e step", () => {
  const state = createEditorState();
  expect(state.simulationMode).toBe("instant");

  setSimulationMode(state, "step");
  expect(state.simulationMode).toBe("step");

  setSimulationMode(state, "instant");
  expect(state.simulationMode).toBe("instant");
});
```

#### 2. setSimulationMode para step reseta simulação

```ts
it("setSimulationMode para step reseta stepSimulation", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";
  state.stepSimulation.stepCount = 5;

  setSimulationMode(state, "instant");
  setSimulationMode(state, "step");

  expect(state.stepSimulation.stepCount).toBe(0);
});
```

#### 3. performStep executa step

```ts
it("performStep incrementa stepCount", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";

  performStep(state);
  expect(state.stepSimulation.stepCount).toBe(1);
});
```

#### 4. performStep não executa em modo instant

```ts
it("performStep não faz nada em modo instant", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  // simulationMode = "instant" (default)

  performStep(state);
  expect(state.stepSimulation.stepCount).toBe(0);
});
```

#### 5. toggleAutoStep liga e desliga

```ts
it("toggleAutoStep liga e desliga running", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";

  const onStep = vi.fn();

  toggleAutoStep(state, onStep);
  expect(state.stepSimulation.running).toBe(true);
  expect(state.stepSimulation.autoStepTimer).not.toBeNull();

  toggleAutoStep(state, onStep);
  expect(state.stepSimulation.running).toBe(false);
  expect(state.stepSimulation.autoStepTimer).toBeNull();
});
```

#### 6. setStepInterval atualiza intervalo

```ts
it("setStepInterval muda o intervalo", () => {
  const state = createEditorState();
  expect(state.stepSimulation.stepInterval).toBe(500);

  setStepInterval(state, 200);
  expect(state.stepSimulation.stepInterval).toBe(200);
});
```

#### 7. resetStep zera estado

```ts
it("resetStep zera contadores", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";

  performStep(state);
  performStep(state);
  expect(state.stepSimulation.stepCount).toBe(2);

  resetStep(state);
  expect(state.stepSimulation.stepCount).toBe(0);
  expect(state.stepSimulation.stable).toBe(false);
});
```

#### 8. toggleSimulation desabilitando para auto-step

```ts
it("toggleSimulation para auto-step ao desabilitar", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";

  toggleAutoStep(state, vi.fn());
  expect(state.stepSimulation.running).toBe(true);

  toggleSimulation(state); // disables
  expect(state.simulationEnabled).toBe(false);
  expect(state.stepSimulation.running).toBe(false);
  expect(state.stepSimulation.stepCount).toBe(0);
});
```

### Imports

```ts
import { describe, it, expect, vi } from "vitest";
import {
  createEditorState,
  setSimulationMode,
  performStep,
  toggleAutoStep,
  setStepInterval,
  resetStep,
  toggleSimulation,
} from "@/state";
```

---

## Validação

```bash
npm run test -- src/__tests__/step-mutations.test.ts
```

---

## Checklist

- [ ] Arquivo de teste criado
- [ ] 8 casos de teste implementados
- [ ] Todos os testes passando
