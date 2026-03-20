import type { ComponentType } from "./types";

export function createToolbar(
  onToolSelect: (tool: ComponentType | null) => void,
): HTMLDivElement {
  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";

  const btn = document.createElement("button");
  btn.textContent = "AND Gate";
  btn.dataset.tool = "and-gate";

  btn.addEventListener("click", () => {
    const isActive = btn.classList.contains("active");
    btn.classList.toggle("active", !isActive);
    onToolSelect(isActive ? null : "and-gate");
  });

  toolbar.appendChild(btn);
  return toolbar;
}
