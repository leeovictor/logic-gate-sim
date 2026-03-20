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
import { handleCanvasClick, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp } from "./handlers";
import { saveCircuit, loadCircuit } from "./persistence";

const state = createEditorState();

const loaded = loadCircuit();
if (loaded) {
  state.components = loaded.components;
  state.wires = loaded.wires;
  state._nextId = loaded._nextId;
  state._nextWireId = loaded._nextWireId;
}

function reEvaluate() {
  if (state.simulationEnabled) evaluateCircuit(state);
}

function save() {
  saveCircuit(state);
}

const handlerCtx = { reEvaluate, save };

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

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resize);
resize();

canvas.addEventListener("click", (e) => {
  handleCanvasClick(state, e, handlerCtx);
});

canvas.addEventListener("mousedown", (e) => {
  handleCanvasMouseDown(state, e);
});

canvas.addEventListener("mouseup", (e) => {
  handleCanvasMouseUp(state, e, handlerCtx);
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Delete") {
    deleteSelected(state);
    reEvaluate();
    save();
  }
  if (e.key === "Escape") {
    clearPendingWire(state);
  }
});

canvas.addEventListener("mousemove", (e) => {
  handleCanvasMouseMove(state, e);
});

canvas.addEventListener("mouseleave", () => {
  state.cursorPosition = null;
});

function render() {
  drawAll(ctx, state, canvas.width, canvas.height);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
