import "./style.css";
import {
  createEditorState,
  addComponent,
  setSelectedTool,
  selectComponent,
  toggleComponentSelection,
  clearSelection,
  deleteSelected,
  addWire,
  setPendingWire,
  clearPendingWire,
  toggleSwitchValue,
  toggleSimulation,
} from "./state";
import { createToolbar } from "./toolbar";
import { drawAll, hitTest, hitTestPin, getComponentDef } from "./renderer";

const state = createEditorState();

const toolbar = createToolbar(
  (tool) => {
    setSelectedTool(state, tool);
    clearSelection(state);
    clearPendingWire(state);
  },
  () => {
    toggleSimulation(state);
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
  const point = { x: e.offsetX, y: e.offsetY };

  if (state.selectedTool === null) {
    const hit = hitTest(state, point);
    if (hit && hit.type === "switch") {
      toggleSwitchValue(state, hit.id);
    }
  } else if (state.selectedTool === "select") {
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
  } else if (state.selectedTool === "wire") {
    const hit = hitTestPin(state, point);
    if (hit) {
      const comp = state.components.find((c) => c.id === hit.componentId);
      if (!comp) return;
      const def = getComponentDef(comp.type);
      if (!def) return;
      const pin = def.pins[hit.pinIndex];
      if (!pin) return;

      if (state.pendingWire === null) {
        if (pin.direction === "output") {
          setPendingWire(state, hit.componentId, hit.pinIndex);
        }
      } else {
        if (pin.direction === "input") {
          addWire(state, state.pendingWire, hit);
          clearPendingWire(state);
        } else {
          // Clicked another output — switch origin
          setPendingWire(state, hit.componentId, hit.pinIndex);
        }
      }
    } else {
      clearPendingWire(state);
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
