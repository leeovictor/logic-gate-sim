# 10 — Controles de Step na Toolbar

**Fase:** 3.1 — UI  
**Dependências:** 06-MUTATIONS, 07-BARREL-EXPORT  
**Arquivos alvo:** `src/ui/toolbar.ts`, `src/ui/style.css`

---

## Objetivo

Adicionar controles de simulação step na toolbar: toggle de modo (instant/step), botão de step manual, play/pause, reset, slider de velocidade, contador e indicador de estabilidade.

---

## Instruções de Implementação

### 1. Expandir a assinatura de `createToolbar()`

A função `createToolbar()` atualmente recebe callbacks para tool select, simulation toggle, events e share. Adicionar um objeto de callbacks para controle step:

```ts
export interface StepControls {
  onModeToggle: () => void;
  onStep: () => void;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (ms: number) => void;
}

export function createToolbar(
  onToolSelect: (tool: ToolMode | null) => void,
  onSimulationToggle: (enabled: boolean) => void,
  events: EventTarget,
  onShare?: () => void,
  stepControls?: StepControls,
): HTMLDivElement {
```

### 2. Criar `createStepPanel()`

Função interna que cria o painel HTML de controles step:

```ts
function createStepPanel(controls: StepControls): HTMLDivElement {
  const panel = document.createElement("div");
  panel.className = "step-panel";
  panel.style.display = "none"; // Hidden by default

  // Mode toggle: instant ↔ step
  const modeBtn = document.createElement("button");
  modeBtn.className = "step-btn";
  modeBtn.textContent = "Step";
  modeBtn.title = "Modo Step (M)";
  const modeHint = document.createElement("span");
  modeHint.className = "shortcut-hint";
  modeHint.textContent = "M";
  modeBtn.appendChild(modeHint);
  modeBtn.addEventListener("click", controls.onModeToggle);

  // Step button
  const stepBtn = document.createElement("button");
  stepBtn.className = "step-btn";
  stepBtn.textContent = "▶|";
  stepBtn.title = "Executar Step (N)";
  const stepHint = document.createElement("span");
  stepHint.className = "shortcut-hint";
  stepHint.textContent = "N";
  stepBtn.appendChild(stepHint);
  stepBtn.addEventListener("click", controls.onStep);

  // Play/Pause button
  const playBtn = document.createElement("button");
  playBtn.className = "step-btn";
  playBtn.textContent = "▶";
  playBtn.title = "Auto-Step (P)";
  const playHint = document.createElement("span");
  playHint.className = "shortcut-hint";
  playHint.textContent = "P";
  playBtn.appendChild(playHint);
  playBtn.addEventListener("click", () => {
    controls.onPlayPause();
    // Toggle visual state — actual state tracked externally
    playBtn.textContent = playBtn.textContent === "▶" ? "⏸" : "▶";
    playBtn.appendChild(playHint);
  });

  // Reset button
  const resetBtn = document.createElement("button");
  resetBtn.className = "step-btn";
  resetBtn.textContent = "⟲";
  resetBtn.title = "Reset (R)";
  resetBtn.addEventListener("click", controls.onReset);

  // Speed slider
  const speedLabel = document.createElement("span");
  speedLabel.className = "step-label";
  speedLabel.textContent = "500ms";
  const speedSlider = document.createElement("input");
  speedSlider.type = "range";
  speedSlider.className = "step-slider";
  speedSlider.min = "100";
  speedSlider.max = "2000";
  speedSlider.step = "100";
  speedSlider.value = "500";
  speedSlider.addEventListener("input", () => {
    const ms = parseInt(speedSlider.value, 10);
    speedLabel.textContent = `${ms}ms`;
    controls.onSpeedChange(ms);
  });

  // Step counter (read-only)
  const counter = document.createElement("span");
  counter.className = "step-counter";
  counter.textContent = "Step: 0";
  counter.dataset.counter = "true";

  // Stability indicator
  const indicator = document.createElement("span");
  indicator.className = "step-indicator";
  indicator.textContent = "●";
  indicator.dataset.indicator = "true";

  panel.appendChild(modeBtn);
  panel.appendChild(stepBtn);
  panel.appendChild(playBtn);
  panel.appendChild(resetBtn);
  panel.appendChild(speedSlider);
  panel.appendChild(speedLabel);
  panel.appendChild(counter);
  panel.appendChild(indicator);

  return panel;
}
```

### 3. Integrar o painel na toolbar

Dentro de `createToolbar()`, após o botão de simulação, criar e anexar o step panel:

```ts
let stepPanel: HTMLDivElement | null = null;
if (stepControls) {
  stepPanel = createStepPanel(stepControls);
  toolbar.appendChild(stepPanel);
}
```

### 4. Expor método de atualização via evento customizado

O step panel precisa ser atualizado externamente (stepCount, stable). Usar o `events` EventTarget:

```ts
events.addEventListener("stepupdate", (e: Event) => {
  if (!stepPanel) return;
  const detail = (e as CustomEvent<{ stepCount: number; stable: boolean; mode: string }>).detail;
  
  const counter = stepPanel.querySelector("[data-counter]");
  if (counter) counter.textContent = `Step: ${detail.stepCount}`;
  
  const indicator = stepPanel.querySelector("[data-indicator]") as HTMLElement;
  if (indicator) {
    indicator.style.color = detail.stable ? "#22c55e" : "#eab308";
    indicator.title = detail.stable ? "Estável" : "Propagando";
  }

  stepPanel.style.display = detail.mode === "step" ? "flex" : "none";
});
```

### 5. CSS para o step panel em `src/ui/style.css`

```css
.step-panel {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid #d1d5db;
}

.step-btn {
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
}

.step-btn:hover {
  background: #f3f4f6;
}

.step-slider {
  width: 80px;
}

.step-label {
  font-size: 11px;
  color: #6b7280;
  min-width: 40px;
}

.step-counter {
  font-size: 12px;
  font-family: monospace;
  color: #374151;
}

.step-indicator {
  font-size: 14px;
  color: #eab308;
}
```

---

## Decisões de Design

- **Step panel é um container `flex` inline** — posicionado logo após o botão de simulação, na mesma linha da toolbar.
- **O play button muda visualmente entre ▶ e ⏸** — reflete o estado running/paused.
- **Atualização via `stepupdate` event** — mantém o toolbar desacoplado do state direto. O `main.ts` é responsável por disparar o evento após cada step.
- **Escondido por padrão** — `display: none`. Mostrado quando `mode === "step"` via evento.

---

## Validação

Validação visual — requer dev server:

```bash
npm run dev
```

1. Ativar simulação → step panel aparece ao mudar para modo step
2. Clicar nos botões → callbacks são chamados
3. Slider muda o label de velocidade

---

## Checklist

- [ ] `StepControls` interface exportada
- [ ] `createStepPanel()` implementada
- [ ] Panel integrado na toolbar
- [ ] Evento `stepupdate` handled
- [ ] CSS adicionado
- [ ] Dev server mostra panel corretamente
