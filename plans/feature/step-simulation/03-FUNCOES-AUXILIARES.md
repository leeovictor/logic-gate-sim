# 03 — Funções Auxiliares de Controle

**Fase:** 1.3 — Core  
**Dependências:** 01-TIPOS, 02-STEP-CIRCUIT  
**Arquivo alvo:** `src/core/simulation.ts`

---

## Objetivo

Criar funções para resetar o estado step, iniciar e parar o auto-step (simulação automática com timer).

---

## Instruções de Implementação

### 1. `resetStepSimulation()`

Adicionar ao final de `src/core/simulation.ts`, antes de `clearAllPinValues()`:

```ts
export function resetStepSimulation(state: EditorState): void {
  stopAutoStep(state);
  state.stepSimulation.stepCount = 0;
  state.stepSimulation.stable = false;
  state.stepSimulation.previousNetValues.clear();
  clearAllPinValues(state);
  // Reset net signals to 0
  for (const net of state.nets) {
    net.signalValue = 0;
  }
}
```

### 2. `startAutoStep()`

```ts
export function startAutoStep(
  state: EditorState,
  onStep: () => void,
): void {
  if (state.stepSimulation.running) return;
  state.stepSimulation.running = true;
  state.stepSimulation.autoStepTimer = setInterval(() => {
    stepCircuit(state);
    onStep();
  }, state.stepSimulation.stepInterval);
}
```

O callback `onStep` é necessário para que o chamador (main.ts) possa executar side-effects após cada step automático (ex: `save()`).

### 3. `stopAutoStep()`

```ts
export function stopAutoStep(state: EditorState): void {
  if (state.stepSimulation.autoStepTimer !== null) {
    clearInterval(state.stepSimulation.autoStepTimer);
    state.stepSimulation.autoStepTimer = null;
  }
  state.stepSimulation.running = false;
}
```

### 4. Ordem das funções no arquivo

Posicionar na seguinte ordem, após `stepCircuit()`:

1. `resetStepSimulation()`
2. `startAutoStep()`
3. `stopAutoStep()`
4. `clearAllPinValues()` (já existente, fica por último)

---

## Decisões de Design

- **`startAutoStep` recebe callback em vez de importar `save()`** — mantém `simulation.ts` como módulo core puro, sem dependência de `storage/`.
- **`resetStepSimulation()` chama `clearAllPinValues()`** — garante que ao resetar, todos os componentes voltam ao visual de "sem simulação".
- **`stopAutoStep` é seguro para chamar mesmo sem timer ativo** — verifica `null` antes de limpar.

---

## Validação

```bash
npm run build
npm run test -- src/__tests__/simulation.test.ts
```

As funções novas não afetam o fluxo existente. Testes de uso serão adicionados na Fase 5.1.

---

## Checklist

- [ ] `resetStepSimulation()` exportada
- [ ] `startAutoStep()` exportada
- [ ] `stopAutoStep()` exportada
- [ ] Testes existentes passando
