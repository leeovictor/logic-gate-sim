# 12 — Atalhos de Teclado e Integração com main.ts

**Fase:** 3.3 + 3.4 — UI/Integração  
**Dependências:** 06-MUTATIONS, 07-BARREL-EXPORT, 10-TOOLBAR-CONTROLES  
**Arquivo alvo:** `src/main.ts`

---

## Objetivo

Conectar os controles de step ao fluxo principal: atalhos de teclado, callbacks da toolbar, e mudança no comportamento de `reEvaluate()` para o modo step.

---

## Instruções de Implementação

### 1. Expandir imports em `main.ts`

Adicionar os novos imports de mutations e simulation:

```ts
import {
  createEditorState,
  setSelectedTool,
  clearSelection,
  deleteSelected,
  clearPendingWire,
  toggleSimulation,
  setSimulationMode,     // ← NOVO
  performStep,           // ← NOVO
  toggleAutoStep,        // ← NOVO
  setStepInterval,       // ← NOVO
  resetStep,             // ← NOVO
} from "@/state";
import { evaluateCircuit, buildNets, resetStepSimulation } from "@/core/simulation";
```

### 2. Alterar `reEvaluate()` para respeitar o modo step

Substituir:

```ts
function reEvaluate() {
  if (state.simulationEnabled) evaluateCircuit(state);
}
```

Por:

```ts
function reEvaluate() {
  if (!state.simulationEnabled) return;
  if (state.simulationMode === "step") {
    // Structural change: rebuild nets and reset step counter
    state.nets = buildNets(state);
    resetStepSimulation(state);
    dispatchStepUpdate();
  } else {
    evaluateCircuit(state);
  }
}
```

### 3. Criar helper `dispatchStepUpdate()`

Função que emite o evento para atualizar a toolbar:

```ts
function dispatchStepUpdate() {
  state.events.dispatchEvent(
    new CustomEvent("stepupdate", {
      detail: {
        stepCount: state.stepSimulation.stepCount,
        stable: state.stepSimulation.stable,
        mode: state.simulationMode,
      },
    })
  );
}
```

### 4. Criar objeto `StepControls` para a toolbar

Antes da criação da toolbar:

```ts
const stepCallbacks = {
  onModeToggle: () => {
    const newMode = state.simulationMode === "instant" ? "step" : "instant";
    setSimulationMode(state, newMode);
    if (newMode === "instant") {
      evaluateCircuit(state);
    }
    dispatchStepUpdate();
  },
  onStep: () => {
    performStep(state);
    dispatchStepUpdate();
    save();
  },
  onPlayPause: () => {
    toggleAutoStep(state, () => {
      dispatchStepUpdate();
    });
  },
  onReset: () => {
    resetStep(state);
    dispatchStepUpdate();
  },
  onSpeedChange: (ms: number) => {
    setStepInterval(state, ms);
    // If running, restart with new interval
    if (state.stepSimulation.running) {
      toggleAutoStep(state, () => dispatchStepUpdate()); // stop
      toggleAutoStep(state, () => dispatchStepUpdate()); // restart
    }
  },
};
```

### 5. Passar `stepCallbacks` ao `createToolbar()`

Atualizar a chamada:

```ts
const toolbar = createToolbar(
  (tool) => {
    setSelectedTool(state, tool);
    clearSelection(state);
    clearPendingWire(state);
  },
  () => {
    toggleSimulation(state);
    evaluateCircuit(state);
    dispatchStepUpdate();
  },
  state.events,
  async () => {
    const success = await copyShareUrl(state);
    if (success) showToast("Link copied to clipboard!");
    else showToast("Failed to copy link");
  },
  stepCallbacks,   // ← NOVO (5º argumento)
);
```

### 6. Adicionar atalhos de teclado

Expandir o `keydown` listener existente:

```ts
window.addEventListener("keydown", (e) => {
  if (e.key === "Delete") {
    deleteSelected(state);
    reEvaluate();
    save();
  }
  if (e.key === "Escape") {
    clearPendingWire(state);
  }

  // Step simulation shortcuts
  if (state.simulationEnabled && state.simulationMode === "step") {
    if (e.key === "n" || e.key === "N") {
      performStep(state);
      dispatchStepUpdate();
      save();
    }
    if (e.key === "p" || e.key === "P") {
      toggleAutoStep(state, () => dispatchStepUpdate());
    }
    if (e.key === "r" || e.key === "R") {
      resetStep(state);
      dispatchStepUpdate();
    }
  }

  // Mode toggle (works whenever simulation is enabled)
  if (e.key === "m" || e.key === "M") {
    if (state.simulationEnabled) {
      stepCallbacks.onModeToggle();
    }
  }
});
```

**Nota:** Os atalhos `N`, `P`, `R` só funcionam quando no modo step com simulação ativa. `M` funciona quando a simulação está ativa em qualquer modo.

### 7. Dispatch initial step update após toggle de simulação

Garantir que ao ativar a simulação, o step panel recebe o estado inicial:

Já coberto pelo `dispatchStepUpdate()` adicionado ao callback de simulation toggle no passo 5.

---

## Decisões de Design

- **`reEvaluate()` no modo step reseta o stepCount** — qualquer mudança estrutural (adicionar wire, componente, deletar) invalida o estado de propagação anterior.
- **Switch toggle no modo step não propaga** — é chamado via `handleNullToolClick()` → `ctx.reEvaluate()` → que no modo step apenas reconstrói nets e reseta. O valor do switch é atualizado em `comp.state.value` e será propagado no próximo step manual.
- **`dispatchStepUpdate()` centraliza a atualização da toolbar** — todo ponto que altera o estado step chama essa função.

---

## Validação

```bash
npm run dev
```

1. Ativar simulação → `T`
2. Trocar para modo step → `M` → step panel aparece
3. Executar step → `N` → counter incrementa
4. Auto-step → `P` → steps automáticos
5. Reset → `R` → counter volta a 0
6. Trocar para instant → `M` → step panel esconde, circuito avalia instantaneamente

---

## Checklist

- [ ] Imports expandidos
- [ ] `reEvaluate()` respeita modo step
- [ ] `dispatchStepUpdate()` implementada
- [ ] `stepCallbacks` criados e passados à toolbar
- [ ] Atalhos `N`, `P`, `R`, `M` funcionando
- [ ] Switch toggle no modo step não propaga imediatamente
