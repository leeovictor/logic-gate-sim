import "./style.css";
import {
  createEditorState,
  addComponent,
  setSelectedTool,
  selectComponent,
  toggleComponentSelection,
  clearSelection,
  deleteSelected,
} from "./state";
import { createToolbar } from "./toolbar";
import { drawAll, hitTest } from "./renderer";

const state = createEditorState();

const toolbar = createToolbar((tool) => {
  setSelectedTool(state, tool);
  clearSelection(state);
});
document.body.prepend(toolbar);

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const toolbarHeight = toolbar.offsetHeight;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - toolbarHeight;
}

window.addEventListener("resize", resize);
resize();

canvas.addEventListener("click", (e) => {
  const point = { x: e.offsetX, y: e.offsetY };

  if (state.selectedTool === "select") {
    const hit = hitTest(state, point);
    if (hit) {
      if (e.ctrlKey) {
        toggleComponentSelection(state, hit.id);
      } else {
        selectComponent(state, hit.id);
      }
    } else if (!e.ctrlKey) {
      clearSelection(state);
    }
  } else if (state.selectedTool) {
    addComponent(state, state.selectedTool, point);
    clearSelection(state);
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Delete") {
    deleteSelected(state);
  }
});

canvas.addEventListener("mousemove", (e) => {
  state.cursorPosition = { x: e.offsetX, y: e.offsetY };
});

canvas.addEventListener("mouseleave", () => {
  state.cursorPosition = null;
});

function render() {
  drawAll(ctx, state, canvas.width, canvas.height);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
