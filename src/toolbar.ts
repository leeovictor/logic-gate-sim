import type { ToolMode } from "./types";

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
  { id: "wire", label: "Wire" },
  {
    label: "Gates",
    items: [
      { id: "and-gate", label: "AND Gate" },
      { id: "or-gate", label: "OR Gate" },
      { id: "not-gate", label: "NOT Gate" },
    ],
  },
  { id: "switch", label: "Switch" },
  { id: "light", label: "Light" },
];

export function createToolbar(
  onToolSelect: (tool: ToolMode | null) => void,
  onSimulationToggle: (enabled: boolean) => void,
): HTMLDivElement {
  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";

  // Track all top-level clickable elements for deactivation
  const topButtons: HTMLButtonElement[] = [];
  // Track the group wrapper (if any) for dropdown state
  let groupWrapper: HTMLDivElement | null = null;
  let groupTrigger: HTMLButtonElement | null = null;
  let groupTriggerLabel: HTMLSpanElement | null = null;
  let groupDropdownButtons: HTMLButtonElement[] = [];
  let groupDefaultLabel = "";

  function deactivateAll() {
    for (const b of topButtons) b.classList.remove("active");
    if (groupWrapper) groupWrapper.classList.remove("active");
    closeDropdown();
  }

  function closeDropdown() {
    if (groupWrapper) groupWrapper.classList.remove("open");
  }

  function openDropdown() {
    if (groupWrapper) groupWrapper.classList.add("open");
  }

  function isDropdownOpen() {
    return groupWrapper?.classList.contains("open") ?? false;
  }

  let shortcutIndex = 1;

  for (const entry of toolEntries) {
    if (!isGroup(entry)) {
      // Regular button
      const btn = document.createElement("button");
      const label = document.createElement("span");
      label.textContent = entry.label;
      const hint = document.createElement("span");
      hint.className = "shortcut-hint";
      hint.textContent = String(shortcutIndex);
      btn.appendChild(label);
      btn.appendChild(hint);
      btn.dataset.tool = entry.id;

      const toolId = entry.id;
      btn.addEventListener("click", () => {
        const isActive = btn.classList.contains("active");
        deactivateAll();
        if (!isActive) {
          btn.classList.add("active");
          onToolSelect(toolId);
        } else {
          onToolSelect(null);
        }
      });

      topButtons.push(btn);
      toolbar.appendChild(btn);
      shortcutIndex++;
    } else {
      // Dropdown group
      groupDefaultLabel = entry.label;
      const wrapper = document.createElement("div");
      wrapper.className = "tool-group";
      groupWrapper = wrapper;

      const trigger = document.createElement("button");
      trigger.className = "tool-group-trigger";
      const trigLabel = document.createElement("span");
      trigLabel.textContent = entry.label + " \u25BE";
      groupTriggerLabel = trigLabel;
      const trigHint = document.createElement("span");
      trigHint.className = "shortcut-hint";
      trigHint.textContent = String(shortcutIndex);
      trigger.appendChild(trigLabel);
      trigger.appendChild(trigHint);
      groupTrigger = trigger;

      trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        if (wrapper.classList.contains("active")) {
          // Already a gate selected — deselect
          deactivateAll();
          trigLabel.textContent = groupDefaultLabel + " \u25BE";
          onToolSelect(null);
        } else if (isDropdownOpen()) {
          closeDropdown();
        } else {
          // Deactivate other buttons, open dropdown
          for (const b of topButtons) b.classList.remove("active");
          openDropdown();
        }
      });

      wrapper.appendChild(trigger);

      // Dropdown panel
      const dropdown = document.createElement("div");
      dropdown.className = "dropdown";

      groupDropdownButtons = [];
      for (let j = 0; j < entry.items.length; j++) {
        const item = entry.items[j];
        const itemBtn = document.createElement("button");
        const itemLabel = document.createElement("span");
        itemLabel.textContent = item.label;
        const itemHint = document.createElement("span");
        itemHint.className = "shortcut-hint";
        itemHint.textContent = String(j + 1);
        itemBtn.appendChild(itemLabel);
        itemBtn.appendChild(itemHint);
        itemBtn.dataset.tool = item.id;

        const itemId = item.id;
        const itemLabelText = item.label;
        itemBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deactivateAll();
          wrapper.classList.add("active");
          trigLabel.textContent = itemLabelText + " \u25BE";
          onToolSelect(itemId);
        });

        groupDropdownButtons.push(itemBtn);
        dropdown.appendChild(itemBtn);
      }

      wrapper.appendChild(dropdown);
      toolbar.appendChild(wrapper);
      shortcutIndex++;
    }
  }

  // Separator before sim toggle
  const separator = document.createElement("div");
  separator.className = "separator";
  toolbar.appendChild(separator);

  // Simulation toggle
  const simBtn = document.createElement("button");
  const simLabel = document.createElement("span");
  simLabel.textContent = "\u26A1 Simulate";
  const simHint = document.createElement("span");
  simHint.className = "shortcut-hint";
  simHint.textContent = "T";
  simBtn.appendChild(simLabel);
  simBtn.appendChild(simHint);
  simBtn.className = "sim-toggle";
  simBtn.addEventListener("click", () => {
    closeDropdown();
    simBtn.classList.toggle("active");
    onSimulationToggle(simBtn.classList.contains("active"));
  });
  toolbar.appendChild(simBtn);

  // Close dropdown on outside click
  document.addEventListener("click", (e) => {
    if (groupWrapper && !groupWrapper.contains(e.target as Node)) {
      closeDropdown();
    }
  });

  // Keyboard shortcuts
  const topLevelCount = toolEntries.length;
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDropdown();
      return;
    }
    if (e.key === "t" || e.key === "T") {
      simBtn.click();
      return;
    }

    const num = Number(e.key);
    if (num < 1) return;

    // If dropdown is open, sub-shortcuts select a gate
    if (isDropdownOpen() && num >= 1 && num <= groupDropdownButtons.length) {
      groupDropdownButtons[num - 1].click();
      return;
    }

    // Top-level shortcuts
    if (num >= 1 && num <= topLevelCount) {
      let idx = 0;
      for (const entry of toolEntries) {
        idx++;
        if (idx === num) {
          if (isGroup(entry)) {
            groupTrigger?.click();
          } else {
            // Find the matching top button
            const btn = topButtons.find((b) => b.dataset.tool === entry.id);
            btn?.click();
          }
          break;
        }
      }
    }
  });

  return toolbar;
}
