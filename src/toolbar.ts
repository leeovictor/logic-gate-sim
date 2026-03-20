import type { ToolMode } from "./types";

interface ToolDef {
  id: ToolMode;
  label: string;
}

const tools: ToolDef[] = [
  { id: "select", label: "Select" },
  { id: "wire", label: "Wire" },
  { id: "and-gate", label: "AND Gate" },
  { id: "switch", label: "Switch" },
  { id: "light", label: "Light" },
];

export function createToolbar(
  onToolSelect: (tool: ToolMode | null) => void,
  onSimulationToggle: (enabled: boolean) => void,
): HTMLDivElement {
  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";

  const buttons: HTMLButtonElement[] = [];

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const btn = document.createElement("button");

    const label = document.createElement("span");
    label.textContent = tool.label;
    const hint = document.createElement("span");
    hint.className = "shortcut-hint";
    hint.textContent = String(i + 1);
    btn.appendChild(label);
    btn.appendChild(hint);

    btn.dataset.tool = tool.id;

    btn.addEventListener("click", () => {
      const isActive = btn.classList.contains("active");
      for (const b of buttons) b.classList.remove("active");
      if (!isActive) {
        btn.classList.add("active");
        onToolSelect(tool.id);
      } else {
        onToolSelect(null);
      }
    });

    buttons.push(btn);
    toolbar.appendChild(btn);
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
    simBtn.classList.toggle("active");
    onSimulationToggle(simBtn.classList.contains("active"));
  });
  toolbar.appendChild(simBtn);

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.key >= "1" && e.key <= String(tools.length)) {
      buttons[Number(e.key) - 1].click();
    } else if (e.key === "t" || e.key === "T") {
      simBtn.click();
    }
  });

  return toolbar;
}
