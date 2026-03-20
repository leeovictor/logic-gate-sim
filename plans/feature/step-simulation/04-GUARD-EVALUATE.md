# 04 — Guard em `evaluateCircuit()`

**Fase:** 1.4 — Core  
**Dependências:** 01-TIPOS  
**Arquivo alvo:** `src/core/simulation.ts`

---

## Objetivo

Modificar `evaluateCircuit()` para que no modo `"step"` ela apenas reconstrua nets sem executar o loop de convergência. Isso garante que a topologia esteja sempre atualizada, mas a propagação de sinal fica sob controle do usuário.

---

## Instruções de Implementação

### 1. Adicionar guard após o check de `simulationEnabled`

Localizar no início de `evaluateCircuit()`:

```ts
export function evaluateCircuit(state: EditorState): void {
  if (!state.simulationEnabled) {
    clearAllPinValues(state);
    return;
  }

  // Build nets
  state.nets = buildNets(state);
```

Inserir o guard do modo step **entre** o check de `simulationEnabled` e o build de nets:

```ts
export function evaluateCircuit(state: EditorState): void {
  if (!state.simulationEnabled) {
    clearAllPinValues(state);
    return;
  }

  // In step mode, only rebuild nets — propagation is user-controlled
  if (state.simulationMode === "step") {
    state.nets = buildNets(state);
    return;
  }

  // Build nets
  state.nets = buildNets(state);
```

### 2. Verificar que o resto do fluxo instant permanece inalterado

O corpo após o guard (inicialização de nets, loop de convergência, check de convergência, `clearAllPinValues` em falha) não deve ser alterado.

---

## Impacto nos Callers

| Caller | Comportamento no modo step |
|---|---|
| `main.ts: reEvaluate()` | Reconstrói nets, retorna sem propagar |
| `main.ts: toggleSimulation` | Reconstrói nets, retorna sem propagar |
| Modo instant | Comportamento inalterado |

---

## Validação

```bash
npm run test -- src/__tests__/simulation.test.ts
```

Todos os testes existentes usam o modo default (`"instant"` via `createEditorState()`), então devem continuar passando.

---

## Checklist

- [ ] Guard `if (state.simulationMode === "step")` adicionado
- [ ] Modo instant inalterado
- [ ] Testes existentes passando
