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

  for (const tool of tools) {
    const btn = document.createElement("button");
    btn.textContent = tool.label;
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
  simBtn.textContent = "\u26A1 Simulate";
  simBtn.className = "sim-toggle";
  simBtn.addEventListener("click", () => {
    simBtn.classList.toggle("active");
    onSimulationToggle(simBtn.classList.contains("active"));
  });
  toolbar.appendChild(simBtn);

  return toolbar;
}
