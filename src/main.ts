import "./style.css";
import {
  createEditorState,
  setSelectedTool,
  clearSelection,
  deleteSelected,
  clearPendingWire,
  toggleSimulation,
} from "./state";
import { createToolbar } from "./toolbar";
import { drawAll } from "./renderer";
import { evaluateCircuit } from "./simulation";
import { handleCanvasClick } from "./handlers";

const state = createEditorState();

function reEvaluate() {
  if (state.simulationEnabled) evaluateCircuit(state);
}

const handlerCtx = { reEvaluate };

const toolbar = createToolbar(
  (tool) => {
    setSelectedTool(state, tool);
    clearSelection(state);
    clearPendingWire(state);
  },
  () => {
    toggleSimulation(state);
    evaluateCircuit(state);
  },
);
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
  handleCanvasClick(state, e, handlerCtx);
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Delete") {
    deleteSelected(state);
    reEvaluate();
  }
  if (e.key === "Escape") {
    clearPendingWire(state);
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
