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
  startDrag,
  updateDrag,
  endDrag,
  startSelectionBox,
  updateSelectionBox,
  endSelectionBox,
} from "./state";
import { hitTest, hitTestPin } from "./renderer";
import { getComponentDef } from "./registry";
import type { HoveredPin } from "./types";

export interface HandlerContext {
  reEvaluate(): void;
  save(): void;
}

const DRAG_THRESHOLD = 3;

let mouseDownPoint: Point | null = null;
let dragOccurred = false;

function handleNullToolClick(state: EditorState, point: Point, ctx: HandlerContext): void {
  const hit = hitTest(state, point);
  if (hit && hit.type === "switch") {
    toggleSwitchValue(state, hit.id);
    ctx.reEvaluate();
    ctx.save();
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
        const hitWireEndpoint = { type: "pin" as const, componentId: hit.componentId, pinIndex: hit.pinIndex };
        addWire(state, state.pendingWire, hitWireEndpoint);
        clearPendingWire(state);
        ctx.reEvaluate();
        ctx.save();
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
  ctx.save();
}

export function handleCanvasClick(
  state: EditorState,
  e: MouseEvent,
  ctx: HandlerContext,
): void {
  if (dragOccurred) {
    dragOccurred = false;
    return;
  }

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

export function handleCanvasMouseDown(state: EditorState, e: MouseEvent): void {
  if (state.selectedTool !== "select") return;
  const point: Point = { x: e.offsetX, y: e.offsetY };
  mouseDownPoint = point;
  dragOccurred = false;

  const hit = hitTest(state, point);
  if (hit) {
    if (!state.selectedComponentIds.has(hit.id) && !e.ctrlKey) {
      selectComponent(state, hit.id);
    }
    const offset: Point = {
      x: point.x - hit.position.x,
      y: point.y - hit.position.y,
    };
    startDrag(state, hit.id, offset);
  } else {
    startSelectionBox(state, point);
  }
}

export function handleCanvasMouseMove(state: EditorState, e: MouseEvent): void {
  const point: Point = { x: e.offsetX, y: e.offsetY };
  state.cursorPosition = point;

  if (state.selectedTool === "wire") {
    const hit = hitTestPin(state, point);
    state.hoveredPin = hit as HoveredPin | null;
  } else {
    state.hoveredPin = null;
  }

  if (state.dragging && mouseDownPoint) {
    const dx = point.x - mouseDownPoint.x;
    const dy = point.y - mouseDownPoint.y;
    if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
      dragOccurred = true;
    }
    if (dragOccurred) {
      updateDrag(state, point);
    }
  }

  if (state.selectionBox && mouseDownPoint) {
    const dx = point.x - mouseDownPoint.x;
    const dy = point.y - mouseDownPoint.y;
    if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
      dragOccurred = true;
    }
    updateSelectionBox(state, point);
  }
}

export function handleCanvasMouseUp(state: EditorState, e: MouseEvent, ctx: HandlerContext): void {
  if (state.selectionBox) {
    endSelectionBox(state, e.ctrlKey);
  }
  if (state.dragging) {
    endDrag(state);
    if (dragOccurred) {
      ctx.save();
    }
  }
  mouseDownPoint = null;
}
