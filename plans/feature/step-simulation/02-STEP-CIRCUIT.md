# 02 — Função `stepCircuit()`

**Fase:** 1.2 — Core  
**Dependências:** 01-TIPOS  
**Arquivo alvo:** `src/core/simulation.ts`

---

## Objetivo

Criar a função `stepCircuit()` que executa exatamente **uma iteração** de propagação de sinal. Extrair a lógica de uma única iteração do loop de convergência existente em `evaluateCircuit()`.

---

## Instruções de Implementação

### 1. Extrair helper `evaluateOneIteration()`

O loop dentro de `evaluateCircuit()` (linhas ~176–220) contém a lógica de uma iteração. Extrair essa lógica para uma função interna reutilizável:

```ts
/**
 * Executa uma iteração de avaliação: para cada componente, lê inputs das nets,
 * avalia, escreve pinValues; depois resolve sinais das nets.
 */
function evaluateOneIteration(state: EditorState): void {
  for (const comp of state.components) {
    const def = getComponentDef(comp.type);
    if (!def) continue;

    const inputPins = def.pins.filter((p) => p.direction === "input");
    const inputValues: SignalValue[] = inputPins.map((_pin, pinIdx) => {
      const absPinIndex = def.pins.indexOf(inputPins[pinIdx]);
      const net = state.nets.find((n) =>
        n.pinReferences.some(
          (p) => p.componentId === comp.id && p.pinIndex === absPinIndex
        )
      );
      return net?.signalValue ?? 0;
    });

    const outputValues = def.evaluate(inputValues, comp.state);

    const pinValues: SignalValue[] = new Array(def.pins.length).fill(0);
    let inputIdx = 0;
    let outputIdx = 0;
    for (let p = 0; p < def.pins.length; p++) {
      if (def.pins[p].direction === "input") {
        pinValues[p] = inputValues[inputIdx++];
      } else {
        pinValues[p] = outputValues[outputIdx++] ?? 0;
      }
    }
    comp.state.pinValues = pinValues;
  }

  for (const net of state.nets) {
    net.signalValue = resolveNetSignal(net, state);
  }
}
```

### 2. Refatorar `evaluateCircuit()` para usar o helper

Substituir o corpo do loop de convergência para chamar `evaluateOneIteration(state)` em cada iteração. A lógica de comparação e convergência permanece no loop.

```ts
for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
  const prevNetValues = new Map(state.nets.map((n) => [n.id, n.signalValue]));

  evaluateOneIteration(state);

  // Check for convergence (inalterado)
  let converged = true;
  for (const net of state.nets) {
    if (prevNetValues.get(net.id) !== net.signalValue) {
      converged = false;
      break;
    }
  }
  if (converged) break;
  if (iter === MAX_ITERATIONS - 1) didNotConverge = true;
}
```

### 3. Criar `stepCircuit()`

Adicionar a função pública exportada:

```ts
export function stepCircuit(state: EditorState): void {
  if (!state.simulationEnabled) return;

  // Build/rebuild nets if needed (first step or topology changed)
  if (state.stepSimulation.stepCount === 0 || state.nets.length === 0) {
    state.nets = buildNets(state);
    // Initialize net signals to 0 on first step only
    if (state.stepSimulation.stepCount === 0) {
      for (const net of state.nets) {
        net.signalValue = 0;
      }
    }
  }

  // Snapshot current net values for stability detection
  const prevNetValues = new Map(
    state.nets.map((n) => [n.id, n.signalValue])
  );

  // Execute one propagation iteration
  evaluateOneIteration(state);

  // Detect stability: compare current net values with previous
  let stable = true;
  for (const net of state.nets) {
    if (prevNetValues.get(net.id) !== net.signalValue) {
      stable = false;
      break;
    }
  }

  state.stepSimulation.previousNetValues = prevNetValues;
  state.stepSimulation.stable = stable;
  state.stepSimulation.stepCount++;
}
```

### 4. Importar `StepSimulationState` se necessário

O import no topo do arquivo já puxa de `@/core/types`. Verificar que `StepSimulationState` está acessível via `EditorState` (acesso indireto — não precisa importar separadamente).

---

## Decisões de Design

- **`evaluateOneIteration` é uma função interna (não exportada)** — é um detalhe de implementação compartilhado entre `evaluateCircuit()` e `stepCircuit()`.
- **Nets são construídas no primeiro step ou quando `nets.length === 0`** — isso permite que mudanças estruturais (que limpam nets) forcem reconstrução no próximo step.
- **`stepCircuit()` não limpa pinValues em caso de ciclo** — ciclos são comportamento esperado no modo step.

---

## Validação

```bash
npm run test -- src/__tests__/simulation.test.ts
```

Todos os testes existentes devem continuar passando, pois `evaluateCircuit()` continua com o mesmo comportamento — apenas o corpo do loop foi extraído para um helper.

---

## Checklist

- [ ] `evaluateOneIteration()` extraída como função interna
- [ ] `evaluateCircuit()` refatorada para usar `evaluateOneIteration()`
- [ ] `stepCircuit()` exportada e funcional
- [ ] Testes existentes de `simulation.test.ts` passando
