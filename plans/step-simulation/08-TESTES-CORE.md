# 08 — Testes do Core (stepCircuit)

**Fase:** 5.1 — Testes  
**Dependências:** 02-STEP-CIRCUIT, 03-FUNCOES-AUXILIARES, 05-FACTORY-STATE  
**Arquivo alvo:** `src/__tests__/step-simulation.test.ts` (novo)

---

## Objetivo

Testar `stepCircuit()`, `resetStepSimulation()` e o comportamento geral da simulação por step: propagação por camada, estabilidade, ciclos e multi-driver.

---

## Instruções de Implementação

### Criar `src/__tests__/step-simulation.test.ts`

Seguir o padrão dos testes existentes em `simulation.test.ts`: usar `createEditorState()`, `addComponent()`, `addWire()` para montar circuitos e verificar valores de `pinValues` e `signalValue` das nets.

### Casos de Teste

#### 1. Step propaga sinais progressivamente

```ts
it("step propaga sinal: Switch → NOT → Light em 2 steps", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";

  const sw = addComponent(state, "switch", { x: 0, y: 0 });
  const not = addComponent(state, "not-gate", { x: 100, y: 0 });
  const light = addComponent(state, "light", { x: 200, y: 0 });

  sw.state.value = 1;

  // sw(pin 0) → not(pin 0), not(pin 1) → light(pin 0)
  addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 },
                  { type: "pin", componentId: not.id, pinIndex: 0 });
  addWire(state, { type: "pin", componentId: not.id, pinIndex: 1 },
                  { type: "pin", componentId: light.id, pinIndex: 0 });

  // Step 1: switch output propaga, NOT avalia, light recebe
  stepCircuit(state);
  expect(state.stepSimulation.stepCount).toBe(1);

  // Step 2: valores estabilizam
  stepCircuit(state);
  expect(state.stepSimulation.stepCount).toBe(2);
  expect(state.stepSimulation.stable).toBe(true);

  // NOT(1) = 0 → light should be off
  expect(light.state.value).toBe(0);
});
```

#### 2. Step counter incrementa corretamente

```ts
it("stepCount incrementa a cada step", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";
  addComponent(state, "switch", { x: 0, y: 0 });

  stepCircuit(state);
  expect(state.stepSimulation.stepCount).toBe(1);
  stepCircuit(state);
  expect(state.stepSimulation.stepCount).toBe(2);
  stepCircuit(state);
  expect(state.stepSimulation.stepCount).toBe(3);
});
```

#### 3. Estabilidade detectada em circuito acíclico

```ts
it("detecta estabilidade em circuito acíclico", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";

  const sw = addComponent(state, "switch", { x: 0, y: 0 });
  const light = addComponent(state, "light", { x: 100, y: 0 });
  sw.state.value = 1;

  addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 },
                  { type: "pin", componentId: light.id, pinIndex: 0 });

  stepCircuit(state);
  // First step may or may not be stable depending on initial net state
  stepCircuit(state);
  expect(state.stepSimulation.stable).toBe(true);
});
```

#### 4. Ciclo NÃO gera erro (diferente do modo instant)

```ts
it("ciclo NOT→NOT oscila sem erro", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";

  const not1 = addComponent(state, "not-gate", { x: 0, y: 0 });
  const not2 = addComponent(state, "not-gate", { x: 100, y: 0 });

  // NOT1 output(pin 1) → NOT2 input(pin 0)
  // NOT2 output(pin 1) → NOT1 input(pin 0)
  addWire(state, { type: "pin", componentId: not1.id, pinIndex: 1 },
                  { type: "pin", componentId: not2.id, pinIndex: 0 });
  addWire(state, { type: "pin", componentId: not2.id, pinIndex: 1 },
                  { type: "pin", componentId: not1.id, pinIndex: 0 });

  // Run several steps — should not crash, no 'E' values
  for (let i = 0; i < 10; i++) {
    stepCircuit(state);
  }

  // Should oscillate and never be stable
  expect(state.stepSimulation.stable).toBe(false);

  // No error signals — values are 0 or 1, not 'E'
  const not1Pins = not1.state.pinValues as (0 | 1)[];
  const not2Pins = not2.state.pinValues as (0 | 1)[];
  expect(not1Pins[1]).not.toBe('E');
  expect(not2Pins[1]).not.toBe('E');
});
```

#### 5. Ciclo estável (AND com input 0)

```ts
it("ciclo AND estabiliza em 0", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";

  const gate1 = addComponent(state, "and-gate", { x: 0, y: 0 });
  const gate2 = addComponent(state, "and-gate", { x: 200, y: 0 });

  addWire(state, { type: "pin", componentId: gate1.id, pinIndex: 2 },
                  { type: "pin", componentId: gate2.id, pinIndex: 0 });
  addWire(state, { type: "pin", componentId: gate2.id, pinIndex: 2 },
                  { type: "pin", componentId: gate1.id, pinIndex: 0 });

  stepCircuit(state);
  stepCircuit(state);
  stepCircuit(state);

  expect(state.stepSimulation.stable).toBe(true);
});
```

#### 6. Reset limpa estado

```ts
it("resetStepSimulation zera contadores e pinValues", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";

  const sw = addComponent(state, "switch", { x: 0, y: 0 });
  const light = addComponent(state, "light", { x: 100, y: 0 });
  sw.state.value = 1;

  addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 },
                  { type: "pin", componentId: light.id, pinIndex: 0 });

  stepCircuit(state);
  stepCircuit(state);
  expect(state.stepSimulation.stepCount).toBe(2);

  resetStepSimulation(state);
  expect(state.stepSimulation.stepCount).toBe(0);
  expect(state.stepSimulation.stable).toBe(false);
  expect(sw.state.pinValues).toBeUndefined();
});
```

#### 7. Multi-driver conflict gera 'E'

```ts
it("multi-driver conflitante gera E no step", () => {
  const state = createEditorState();
  state.simulationEnabled = true;
  state.simulationMode = "step";

  const sw1 = addComponent(state, "switch", { x: 0, y: 0 });
  const sw2 = addComponent(state, "switch", { x: 100, y: 0 });
  const light = addComponent(state, "light", { x: 200, y: 0 });

  state.junctions.push({ id: "junc-0", position: { x: 150, y: 50 } });

  addWire(state, { type: "pin", componentId: sw1.id, pinIndex: 0 },
                  { type: "junction", junctionId: "junc-0" });
  addWire(state, { type: "junction", junctionId: "junc-0" },
                  { type: "pin", componentId: light.id, pinIndex: 0 });
  addWire(state, { type: "pin", componentId: sw2.id, pinIndex: 0 },
                  { type: "junction", junctionId: "junc-0" });

  sw1.state.value = 1;
  sw2.state.value = 0;

  stepCircuit(state);

  expect(light.state.value).toBe("E");
});
```

#### 8. Simulação desabilitada não executa step

```ts
it("stepCircuit não faz nada se simulação desabilitada", () => {
  const state = createEditorState();
  state.simulationMode = "step";
  // simulationEnabled = false (default)

  addComponent(state, "switch", { x: 0, y: 0 });
  stepCircuit(state);

  expect(state.stepSimulation.stepCount).toBe(0);
});
```

### Imports necessários

```ts
import { describe, it, expect } from "vitest";
import { createEditorState, addComponent, addWire } from "@/state";
import { stepCircuit, resetStepSimulation } from "@/core/simulation";
import type { SignalValue } from "@/core/types";
```

---

## Validação

```bash
npm run test -- src/__tests__/step-simulation.test.ts
```

Todos os 8 testes devem passar.

---

## Checklist

- [ ] Arquivo de teste criado
- [ ] 8 casos de teste implementados
- [ ] Todos os testes passando
