import "./ui/style.css";
import {
  createEditorState,
  setSelectedTool,
  clearSelection,
  deleteSelected,
  clearPendingWire,
  toggleSimulation,
} from "@/state";
import { createToolbar } from "@/ui/toolbar";
import { drawAll } from "@/ui/renderer";
import { evaluateCircuit } from "@/core/simulation";
import { handleCanvasClick, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp } from "@/ui/handlers";
import { saveCircuit, loadCircuit } from "@/storage/persistence";
import { loadFromUrl, copyShareUrl } from "@/storage/sharing";
import { showToast } from "@/ui/toast";

const state = createEditorState();

// Try to load from URL first (shared circuit), then fall back to localStorage
const urlLoaded = loadFromUrl();
if (urlLoaded) {
  state.components = urlLoaded.components;
  state.wireSegments = urlLoaded.wireSegments;
  state.junctions = urlLoaded.junctions;
  state._nextId = urlLoaded._nextId;
  state._nextWireId = urlLoaded._nextWireId;
  state._nextJunctionId = urlLoaded._nextJunctionId;
} else {
  // Fall back to localStorage
  const loaded = loadCircuit();
  if (loaded) {
    state.components = loaded.components;
    state.wireSegments = loaded.wireSegments;
    state.junctions = loaded.junctions;
    state._nextId = loaded._nextId;
    state._nextWireId = loaded._nextWireId;
    state._nextJunctionId = loaded._nextJunctionId;
  }
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
  state.events,
  async () => {
    // Share button callback
    const success = await copyShareUrl(state);
    if (success) {
      showToast("Link copied to clipboard!");
    } else {
      showToast("Failed to copy link");
    }
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

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
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
