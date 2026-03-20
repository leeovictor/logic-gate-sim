# 14 — Testes de Regressão

**Fase:** 5.3 — Testes  
**Dependências:** Todas as fases anteriores  
**Arquivos alvo:** Testes existentes + validação geral

---

## Objetivo

Confirmar que todas as funcionalidades existentes continuam operacionais após a introdução do modo step. A premissa é que o modo default `"instant"` (usado por `createEditorState()`) mantém o comportamento original sem alterações.

---

## Instruções de Implementação

### 1. Executar toda a suíte de testes

```bash
npm run test
```

**Todos os seguintes arquivos de teste devem passar sem modificações:**

| Arquivo | O que testa |
|---|---|
| `simulation.test.ts` | `evaluateCircuit()` em modo instant — todos os cenários originais |
| `state.test.ts` | `createEditorState()`, mutations gerais |
| `persistence.test.ts` | Serialização/deserialização v1/v2 |
| `sharing.test.ts` | URL encoding/decoding |
| `and-gate.test.ts` | Componente AND gate |
| `or-gate.test.ts` | Componente OR gate |
| `not-gate.test.ts` | Componente NOT gate |
| `switch.test.ts` | Componente Switch |
| `light.test.ts` | Componente Light |
| `wire.test.ts` | Wire management |
| `net.test.ts` | Net building |

### 2. Pontos de atenção para regressão

#### 2.1 `evaluateCircuit()` em modo instant

Os testes de `simulation.test.ts` usam `createEditorState()` que retorna `simulationMode: "instant"`. O guard adicionado na Fase 04 só é acionado quando `simulationMode === "step"`, portanto o fluxo instant é inalterado.

**Se algum teste falhar**, verificar:
- O guard em `evaluateCircuit()` não intercepta acidentalmente o modo instant
- A extração de `evaluateOneIteration()` na Fase 02 não alterou a semântica

#### 2.2 `createEditorState()` 

Os testes que usam `createEditorState()` agora recebem um state com dois campos a mais (`simulationMode`, `stepSimulation`). Isso **não deve** quebrar nenhum teste porque:
- Nenhum teste faz assertion sobre os campos ausentes do state (ex: `expect(Object.keys(state).length).toBe(N)`)
- Os campos são aditivos com defaults neutros

#### 2.3 `toggleSimulation()`

A mudança na Fase 06 adiciona `stopAutoStep()` e `resetStepSimulation()` ao desabilitar. Para o modo instant, `stopAutoStep()` é no-op (timer é null) e `resetStepSimulation()` limpa `pinValues` (que seria limpado de qualquer forma por `evaluateCircuit()` com `simulationEnabled = false`).

**Se `state.test.ts` falhar** no teste de `toggleSimulation`, verificar que `resetStepSimulation` não altera `comp.state.value` quando `defaultState` não define `value`.

#### 2.4 Persistência

Circuitos salvos sem `simulationMode` devem carregar com campo `undefined`, tratado como `"instant"`. O `isValidCircuit()` não verifica esse campo, então validação não deve falhar.

### 3. Teste adicional de backward-compat (se necessário)

Se houver qualquer dúvida, adicionar ao final de `simulation.test.ts`:

```ts
it("modo default é instant — evaluateCircuit funciona normalmente", () => {
  const state = createEditorState();
  expect(state.simulationMode).toBe("instant");
  
  const sw = addComponent(state, "switch", { x: 0, y: 0 });
  const light = addComponent(state, "light", { x: 100, y: 0 });
  addWire(state,
    { type: "pin", componentId: sw.id, pinIndex: 0 },
    { type: "pin", componentId: light.id, pinIndex: 0 }
  );
  
  state.simulationEnabled = true;
  sw.state.value = 1;
  evaluateCircuit(state);
  
  expect(light.state.value).toBe(1);
});
```

---

## Validação

```bash
npm run test
```

**Critério de sucesso:** 0 falhas. Todos os testes existentes + os novos devem passar.

```bash
npm run build
```

**Critério de sucesso:** Build produção sem erros de tipo.

---

## Checklist

- [ ] `npm run test` — 0 falhas
- [ ] `npm run build` — 0 erros
- [ ] Testes existentes não foram modificados (exceto se estritamente necessário)
- [ ] Todos os novos testes (step-simulation, step-mutations) passando
