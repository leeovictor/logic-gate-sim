import "./ui/style.css";
import { evaluateCircuit } from "@/core/simulation";
import {
  clearPendingWire,
  clearSelection,
  createEditorState,
  createHistory,
  deleteSelected,
  popLastSnapshot,
  pushSnapshot,
  redo,
  resetViewport,
  setSelectedTool,
  setTheme,
  undo,
} from "@/state";
import { loadCircuit, saveCircuit } from "@/storage/persistence";
import { copyShareUrl, loadFromUrl } from "@/storage/sharing";
import {
  handleCanvasClick,
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleWheel,
  setSpaceHeld,
} from "@/ui/handlers";
import { drawAll } from "@/ui/renderer";
import { showToast } from "@/ui/toast";
import { createToolbar } from "@/ui/toolbar";

const state = createEditorState();
const history = createHistory();

// Load persisted theme preference
const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
if (savedTheme === "dark" || savedTheme === "light") {
  setTheme(state, savedTheme);
}

// Try to load from URL first (shared circuit), then fall back to localStorage
const urlLoaded = loadFromUrl();
if (urlLoaded) {
  state.components = urlLoaded.components;
  state.wireSegments = urlLoaded.wireSegments;
  state.junctions = urlLoaded.junctions;
  state._nextId = urlLoaded._nextId;
  state._nextWireId = urlLoaded._nextWireId;
  state._nextJunctionId = urlLoaded._nextJunctionId;
  // Apply loaded viewport if available
  if (urlLoaded.viewport) {
    state.viewport = { ...urlLoaded.viewport };
  }
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
    // Apply loaded viewport if available
    if (loaded.viewport) {
      state.viewport = { ...loaded.viewport };
    }
  }
}

// Evaluate circuit on startup
evaluateCircuit(state);

function reEvaluate() {
  evaluateCircuit(state);
}

function save() {
  saveCircuit(state);
}

const handlerCtx = {
  reEvaluate,
  save,
  pushSnapshot: () => pushSnapshot(history, state),
  popSnapshot: () => popLastSnapshot(history),
};

const toolbar = createToolbar(
  (tool) => {
    setSelectedTool(state, tool);
    clearSelection(state);
    clearPendingWire(state);
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
  (theme) => {
    setTheme(state, theme);
    localStorage.setItem("theme", theme);
  },
  state.theme,
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
  handleCanvasMouseDown(state, e, handlerCtx);
});

canvas.addEventListener("mouseup", (e) => {
  handleCanvasMouseUp(state, e, handlerCtx);
});

window.addEventListener("keydown", (e) => {
  if (e.key === " " && !e.repeat) {
    e.preventDefault();
    setSpaceHeld(true);
  }
  if (e.key === "Home") {
    e.preventDefault();
    resetViewport(state);
    save();
  }
  if (e.key === "Delete") {
    pushSnapshot(history, state);
    deleteSelected(state);
    reEvaluate();
    save();
  }
  if (e.key === "Escape") {
    clearPendingWire(state);
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    if (undo(history, state)) {
      clearSelection(state);
      clearPendingWire(state);
      reEvaluate();
      save();
    }
  }
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === "y" || (e.key === "z" && e.shiftKey))
  ) {
    e.preventDefault();
    if (redo(history, state)) {
      clearSelection(state);
      clearPendingWire(state);
      reEvaluate();
      save();
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === " ") {
    e.preventDefault();
    setSpaceHeld(false);
  }
});

canvas.addEventListener("mousemove", (e) => {
  handleCanvasMouseMove(state, e);
});

canvas.addEventListener("mouseleave", () => {
  state.cursorPosition = null;
});

canvas.addEventListener(
  "wheel",
  (e) => {
    handleWheel(state, e);
    save();
  },
  { passive: false },
);

function render() {
  drawAll(ctx, state, canvas.width, canvas.height);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
