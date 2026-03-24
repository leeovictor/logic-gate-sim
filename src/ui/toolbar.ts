import type { ToolMode } from "@/core/types";
import {
  selectIcon,
  wireIcon,
  andGateIcon,
  orGateIcon,
  notGateIcon,
  nandGateIcon,
  norGateIcon,
  xorGateIcon,
  xnorGateIcon,
  switchIcon,
  lightIcon,
  simulateIcon,
  sunIcon,
  moonIcon,
} from "./toolbar-icons";

export interface StepControls {
  onModeToggle: () => void;
  onStep: () => void;
  onPlayPause: () => void;
  onReset: () => void;
  onSpeedChange: (ms: number) => void;
}

const toolIcons: Partial<Record<ToolMode, () => SVGSVGElement>> = {
  select: selectIcon,
  wire: wireIcon,
  "and-gate": andGateIcon,
  "or-gate": orGateIcon,
  "not-gate": notGateIcon,
  "nand-gate": nandGateIcon,
  "nor-gate": norGateIcon,
  "xor-gate": xorGateIcon,
  "xnor-gate": xnorGateIcon,
  switch: switchIcon,
  light: lightIcon,
};

interface ToolDef {
  id: ToolMode;
  label: string;
}

interface ToolGroup {
  label: string;
  items: ToolDef[];
}

type ToolEntry = ToolDef | ToolGroup;

function isGroup(entry: ToolEntry): entry is ToolGroup {
  return "items" in entry;
}

const toolEntries: ToolEntry[] = [
  { id: "select", label: "Select" },
  {
    label: "Gates",
    items: [
      { id: "and-gate", label: "AND" },
      { id: "or-gate", label: "OR" },
      { id: "not-gate", label: "NOT" },
      { id: "nand-gate", label: "NAND" },
      { id: "nor-gate", label: "NOR" },
      { id: "xor-gate", label: "XOR" },
      { id: "xnor-gate", label: "XNOR" },
    ],
  },
  { id: "wire", label: "Wire" },
  { id: "switch", label: "Input" },
  { id: "light", label: "Output" },
];

interface DropdownController {
  wrapper: HTMLDivElement;
  trigger: HTMLButtonElement;
  itemButtons: HTMLButtonElement[];
  open(): void;
  close(): void;
  isOpen(): boolean;
  activate(): void;
  deactivate(): void;
  setTriggerIcon(iconFactory: () => SVGSVGElement): void;
}

interface ShortcutBindings {
  topButtons: HTMLButtonElement[];
  dropdown: DropdownController | null;
  simButton: HTMLButtonElement;
}

function createToolButton(
  tool: ToolDef,
  shortcut: number,
  onSelect: (toolId: ToolMode | null) => void,
  deactivateAll: () => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.appendChild((toolIcons[tool.id] ?? selectIcon)());

  const hint = document.createElement("span");
  hint.className = "shortcut-hint";
  hint.textContent = String(shortcut);
  btn.appendChild(hint);

  btn.dataset.tool = tool.id;
  btn.title = tool.label;
  btn.setAttribute("aria-label", tool.label);

  btn.addEventListener("click", () => {
    const isActive = btn.classList.contains("active");
    deactivateAll();
    if (!isActive) {
      btn.classList.add("active");
      onSelect(tool.id);
    } else {
      onSelect(null);
    }
  });

  return btn;
}

function createToolGroup(
  group: ToolGroup,
  shortcut: number,
  onSelect: (toolId: ToolMode | null) => void,
  deactivateTopButtons: () => void,
): DropdownController {
  const wrapper = document.createElement("div");
  wrapper.className = "tool-group";

  const trigger = document.createElement("button");
  trigger.className = "tool-group-trigger";
  let currentIcon: SVGSVGElement = andGateIcon();
  const chevron = document.createElement("span");
  chevron.textContent = " \u25BE";
  const trigHint = document.createElement("span");
  trigHint.className = "shortcut-hint";
  trigHint.textContent = String(shortcut);
  trigger.appendChild(currentIcon);
  trigger.appendChild(chevron);
  trigger.appendChild(trigHint);
  trigger.title = group.label;
  trigger.setAttribute("aria-label", group.label);

  const controller: DropdownController = {
    wrapper,
    trigger,
    itemButtons: [],
    open() { wrapper.classList.add("open"); },
    close() { wrapper.classList.remove("open"); },
    isOpen() { return wrapper.classList.contains("open"); },
    activate() { wrapper.classList.add("active"); },
    deactivate() { wrapper.classList.remove("active"); },
    setTriggerIcon(iconFactory: () => SVGSVGElement) {
      const newIcon = iconFactory();
      trigger.replaceChild(newIcon, currentIcon);
      currentIcon = newIcon;
    },
  };

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (wrapper.classList.contains("active")) {
      controller.deactivate();
      controller.close();
      controller.setTriggerIcon(andGateIcon);
      onSelect(null);
    } else if (controller.isOpen()) {
      controller.close();
    } else {
      deactivateTopButtons();
      controller.open();
    }
  });

  wrapper.appendChild(trigger);

  const dropdownPanel = document.createElement("div");
  dropdownPanel.className = "dropdown";

  for (let j = 0; j < group.items.length; j++) {
    const item = group.items[j];
    const itemBtn = document.createElement("button");
    itemBtn.appendChild((toolIcons[item.id] ?? andGateIcon)());
    const itemHint = document.createElement("span");
    itemHint.className = "shortcut-hint";
    itemHint.textContent = String(j + 1);
    itemBtn.appendChild(itemHint);
    itemBtn.dataset.tool = item.id;
    itemBtn.title = item.label;
    itemBtn.setAttribute("aria-label", item.label);

    const itemId = item.id;
    itemBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deactivateTopButtons();
      controller.deactivate();
      controller.close();
      controller.activate();
      controller.setTriggerIcon(toolIcons[itemId] ?? andGateIcon);
      onSelect(itemId);
    });

    controller.itemButtons.push(itemBtn);
    dropdownPanel.appendChild(itemBtn);
  }

  wrapper.appendChild(dropdownPanel);
  return controller;
}

function createThemeToggleButton(
  currentTheme: "light" | "dark",
  onToggle: (theme: "light" | "dark") => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  let theme = currentTheme;

  function update() {
    btn.innerHTML = "";
    btn.appendChild(theme === "dark" ? sunIcon() : moonIcon());
    btn.title = theme === "dark" ? "Tema Claro" : "Tema Escuro";
    btn.setAttribute("aria-label", theme === "dark" ? "Tema Claro" : "Tema Escuro");
  }

  update();

  btn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    update();
    onToggle(theme);
  });

  return btn;
}

function createSimToggle(
  onToggle: (enabled: boolean) => void,
  onBeforeToggle?: () => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  const label = document.createElement("span");
  label.textContent = "\u26A1 Simulate";
  const hint = document.createElement("span");
  hint.className = "shortcut-hint";
  hint.textContent = "T";
  btn.appendChild(label);
  btn.appendChild(hint);
  btn.className = "sim-toggle";

  btn.addEventListener("click", () => {
    onBeforeToggle?.();
    btn.classList.toggle("active");
    onToggle(btn.classList.contains("active"));
  });

  return btn;
}

function createShareButton(onShare: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  const label = document.createElement("span");
  label.textContent = "Compartilhar";
  btn.appendChild(label);
  btn.className = "share-button";
  btn.title = "Compartilhar";
  btn.setAttribute("aria-label", "Compartilhar");

  btn.addEventListener("click", () => {
    onShare();
  });

  return btn;
}

function createStepPanel(controls: StepControls): HTMLDivElement {
  const panel = document.createElement("div");
  panel.className = "step-panel";
  panel.style.display = "none";

  // Mode toggle button
  const modeBtn = document.createElement("button");
  modeBtn.className = "step-btn";
  modeBtn.dataset.stepMode = "true";
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
  stepBtn.dataset.stepExecute = "true";
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
  playBtn.dataset.stepPlay = "true";
  playBtn.textContent = "▶";
  playBtn.title = "Auto-Step (P)";
  const playHint = document.createElement("span");
  playHint.className = "shortcut-hint";
  playHint.textContent = "P";
  playBtn.appendChild(playHint);
  playBtn.addEventListener("click", controls.onPlayPause);

  // Reset button
  const resetBtn = document.createElement("button");
  resetBtn.className = "step-btn";
  resetBtn.dataset.stepReset = "true";
  resetBtn.textContent = "⟲";
  resetBtn.title = "Reset (R)";
  resetBtn.addEventListener("click", controls.onReset);

  // Speed slider
  const speedLabel = document.createElement("span");
  speedLabel.className = "step-label";
  speedLabel.textContent = "500ms";
  speedLabel.dataset.speedLabel = "true";

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

  // Step counter
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


function bindToolbarShortcuts(bindings: ShortcutBindings): void {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      bindings.dropdown?.close();
      return;
    }
    if (e.key === "t" || e.key === "T") {
      bindings.simButton.click();
      return;
    }
    if (e.key === "m" || e.key === "M") {
      const modeBtn = document.querySelector("[data-step-mode]") as HTMLButtonElement;
      modeBtn?.click();
      return;
    }
    if (e.key === "n" || e.key === "N") {
      const stepBtn = document.querySelector("[data-step-execute]") as HTMLButtonElement;
      stepBtn?.click();
      return;
    }
    if (e.key === "p" || e.key === "P") {
      const playBtn = document.querySelector("[data-step-play]") as HTMLButtonElement;
      playBtn?.click();
      return;
    }
    if (e.key === "r" || e.key === "R") {
      const resetBtn = document.querySelector("[data-step-reset]") as HTMLButtonElement;
      resetBtn?.click();
      return;
    }

    const num = Number(e.key);
    if (num < 1) return;

    // Sub-shortcuts when dropdown is open
    if (bindings.dropdown?.isOpen()) {
      const items = bindings.dropdown.itemButtons;
      if (num >= 1 && num <= items.length) {
        items[num - 1].click();
        return;
      }
    }

    // Top-level shortcuts
    if (num >= 1 && num <= toolEntries.length) {
      let idx = 0;
      for (const entry of toolEntries) {
        idx++;
        if (idx === num) {
          if (isGroup(entry)) {
            bindings.dropdown?.trigger.click();
          } else {
            const btn = bindings.topButtons.find(
              (b) => b.dataset.tool === entry.id,
            );
            btn?.click();
          }
          break;
        }
      }
    }
  });
}

export function createToolbar(
  onToolSelect: (tool: ToolMode | null) => void,
  onSimulationToggle: (enabled: boolean) => void,
  events: EventTarget,
  onShare?: () => void,
  stepControls?: StepControls,
  onThemeToggle?: (theme: "light" | "dark") => void,
  initialTheme?: "light" | "dark",
): HTMLDivElement {
  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";

  const topButtons: HTMLButtonElement[] = [];
  let dropdown: DropdownController | null = null;

  function deactivateAll() {
    for (const b of topButtons) b.classList.remove("active");
    dropdown?.deactivate();
    dropdown?.close();
  }

  events.addEventListener("toolchange", (e: Event) => {
    const detail = (e as CustomEvent<ToolMode | null>).detail;
    if (detail === null) deactivateAll();
  });

  let shortcutIndex = 1;
  for (const entry of toolEntries) {
    if (!isGroup(entry)) {
      const btn = createToolButton(entry, shortcutIndex, onToolSelect, deactivateAll);
      topButtons.push(btn);
      toolbar.appendChild(btn);
    } else {
      const deactivateTopButtons = () => {
        for (const b of topButtons) b.classList.remove("active");
      };
      const controller = createToolGroup(entry, shortcutIndex, onToolSelect, deactivateTopButtons);
      dropdown = controller;
      toolbar.appendChild(controller.wrapper);
    }
    shortcutIndex++;
  }

  const separator = document.createElement("div");
  separator.className = "separator";
  toolbar.appendChild(separator);

  const simBtn = createSimToggle(onSimulationToggle, () => dropdown?.close());
  toolbar.appendChild(simBtn);

  if (onShare) {
    const shareBtn = createShareButton(onShare);
    toolbar.appendChild(shareBtn);
  }

  let stepPanel: HTMLDivElement | null = null;
  if (stepControls) {
    stepPanel = createStepPanel(stepControls);
    toolbar.appendChild(stepPanel);
  }

  if (onThemeToggle) {
    const themeSeparator = document.createElement("div");
    themeSeparator.className = "separator";
    toolbar.appendChild(themeSeparator);
    const themeBtn = createThemeToggleButton(initialTheme ?? "light", onThemeToggle);
    toolbar.appendChild(themeBtn);
  }

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

  document.addEventListener("click", (e) => {
    if (dropdown && !dropdown.wrapper.contains(e.target as Node)) {
      dropdown.close();
    }
  });

  bindToolbarShortcuts({ topButtons, dropdown, simButton: simBtn });

  return toolbar;
}
