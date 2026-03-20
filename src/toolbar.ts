import type { ToolMode } from "./types";
import {
  selectIcon,
  wireIcon,
  andGateIcon,
  orGateIcon,
  notGateIcon,
  switchIcon,
  lightIcon,
  simulateIcon,
} from "./toolbar-icons";

const toolIcons: Partial<Record<ToolMode, () => SVGSVGElement>> = {
  select: selectIcon,
  wire: wireIcon,
  "and-gate": andGateIcon,
  "or-gate": orGateIcon,
  "not-gate": notGateIcon,
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

  document.addEventListener("click", (e) => {
    if (dropdown && !dropdown.wrapper.contains(e.target as Node)) {
      dropdown.close();
    }
  });

  bindToolbarShortcuts({ topButtons, dropdown, simButton: simBtn });

  return toolbar;
}
