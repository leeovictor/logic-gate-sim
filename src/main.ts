import "./ui/style.css";
import {
  createEditorState,
  setSelectedTool,
  clearSelection,
  deleteSelected,
  clearPendingWire,
  toggleSimulation,
  setSimulationMode,
  performStep,
  toggleAutoStep,
  setStepInterval,
  resetStep,
  createHistory,
  pushSnapshot,
  popLastSnapshot,
  undo,
  redo,
} from "@/state";
import { createToolbar } from "@/ui/toolbar";
import { drawAll } from "@/ui/renderer";
import { evaluateCircuit, buildNets, resetStepSimulation } from "@/core/simulation";
import { handleCanvasClick, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp } from "@/ui/handlers";
import { saveCircuit, loadCircuit } from "@/storage/persistence";
import { loadFromUrl, copyShareUrl } from "@/storage/sharing";
import { showToast } from "@/ui/toast";

const state = createEditorState();
const history = createHistory();

// Try to load from URL first (shared circuit), then fall back to localStorage
const urlLoaded = loadFromUrl();
if (urlLoaded) {
  state.components = urlLoaded.components;
  state.wireSegments = urlLoaded.wireSegments;
  state.junctions = urlLoaded.junctions;
  state._nextId = urlLoaded._nextId;
  state._nextWireId = urlLoaded._nextWireId;
  state._nextJunctionId = urlLoaded._nextJunctionId;
  if (urlLoaded.simulationMode) {
    state.simulationMode = urlLoaded.simulationMode;
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
    if (loaded.simulationMode) {
      state.simulationMode = loaded.simulationMode;
    }
  }
}

function reEvaluate(structural = true) {
  if (!state.simulationEnabled) return;
  if (state.simulationMode === "step") {
    if (structural) {
      // Structural change: rebuild nets and reset step counter
      state.nets = buildNets(state);
      resetStepSimulation(state);
    }
    dispatchStepUpdate();
  } else {
    evaluateCircuit(state);
  }
}

function dispatchStepUpdate() {
  state.events.dispatchEvent(
    new CustomEvent("stepupdate", {
      detail: {
        stepCount: state.stepSimulation.stepCount,
        stable: state.stepSimulation.stable,
        mode: state.simulationMode,
      },
    })
  );
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

const stepCallbacks = {
  onModeToggle: () => {
    const newMode = state.simulationMode === "instant" ? "step" : "instant";
    setSimulationMode(state, newMode);
    if (newMode === "instant") {
      evaluateCircuit(state);
    }
    dispatchStepUpdate();
  },
  onStep: () => {
    performStep(state);
    dispatchStepUpdate();
    save();
  },
  onPlayPause: () => {
    toggleAutoStep(state, () => {
      dispatchStepUpdate();
    });
  },
  onReset: () => {
    resetStep(state);
    dispatchStepUpdate();
  },
  onSpeedChange: (ms: number) => {
    setStepInterval(state, ms);
    // If running, restart with new interval
    if (state.stepSimulation.running) {
      toggleAutoStep(state, () => dispatchStepUpdate()); // stop
      toggleAutoStep(state, () => dispatchStepUpdate()); // restart
    }
  },
};

const toolbar = createToolbar(
  (tool) => {
    setSelectedTool(state, tool);
    clearSelection(state);
    clearPendingWire(state);
  },
  () => {
    toggleSimulation(state);
    reEvaluate();
    dispatchStepUpdate();
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
  stepCallbacks,
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
  if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
    e.preventDefault();
    if (redo(history, state)) {
      clearSelection(state);
      clearPendingWire(state);
      reEvaluate();
      save();
    }
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
