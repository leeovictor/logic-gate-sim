import type { EditorState, Point } from "./types";
import {
  addComponent,
  selectComponent,
  toggleComponentSelection,
  clearSelection,
  addWire,
  setPendingWire,
  clearPendingWire,
  toggleSwitchValue,
} from "./state";
import { hitTest, hitTestPin } from "./renderer";
import { getComponentDef } from "./registry";

export interface HandlerContext {
  reEvaluate(): void;
}

function handleNullToolClick(state: EditorState, point: Point, ctx: HandlerContext): void {
  const hit = hitTest(state, point);
  if (hit && hit.type === "switch") {
    toggleSwitchValue(state, hit.id);
    ctx.reEvaluate();
  }
}

function handleSelectClick(state: EditorState, point: Point, e: MouseEvent): void {
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
}

function handleWireClick(state: EditorState, point: Point, ctx: HandlerContext): void {
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
        ctx.reEvaluate();
      } else {
        setPendingWire(state, hit.componentId, hit.pinIndex);
      }
    }
  } else {
    clearPendingWire(state);
  }
}

function handlePlaceComponent(state: EditorState, point: Point, ctx: HandlerContext): void {
  if (!state.selectedTool || state.selectedTool === "select" || state.selectedTool === "wire") return;
  addComponent(state, state.selectedTool, point);
  clearSelection(state);
  ctx.reEvaluate();
}

export function handleCanvasClick(
  state: EditorState,
  e: MouseEvent,
  ctx: HandlerContext,
): void {
  const point = { x: e.offsetX, y: e.offsetY };

  if (state.selectedTool === null) {
    handleNullToolClick(state, point, ctx);
  } else if (state.selectedTool === "select") {
    handleSelectClick(state, point, e);
  } else if (state.selectedTool === "wire") {
    handleWireClick(state, point, ctx);
  } else {
    handlePlaceComponent(state, point, ctx);
  }
}
