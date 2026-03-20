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
];

export function createToolbar(
  onToolSelect: (tool: ToolMode | null) => void,
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

  return toolbar;
}
