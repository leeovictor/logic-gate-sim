import type { EditorState, Point } from "@/core/types";
import {
  addComponent,
  selectComponent,
  toggleComponentSelection,
  clearSelection,
  selectWire,
  toggleWireSelection,
  selectJunction,
  toggleJunctionSelection,
  addWireSegment,
  addJunction,
  splitWireAtJunction,
  setPendingWireEndpoint,
  addPendingWaypoint,
  clearPendingWire,
  toggleSwitchValue,
  startDrag,
  startJunctionDrag,
  updateDrag,
  endDrag,
  startSelectionBox,
  updateSelectionBox,
  endSelectionBox,
} from "@/state";
import { hitTest, hitTestPin, hitTestWire, hitTestJunction } from "./hit-test";
import type { HoveredPin } from "@/core/types";

export interface HandlerContext {
  reEvaluate(structural?: boolean): void;
  save(): void;
  pushSnapshot(): void;
  popSnapshot(): void;
}

const DRAG_THRESHOLD = 3;

let mouseDownPoint: Point | null = null;
let dragOccurred = false;

function handleNullToolClick(state: EditorState, point: Point, ctx: HandlerContext): void {
  const hit = hitTest(state, point);
  if (hit && hit.type === "switch") {
    ctx.pushSnapshot();
    toggleSwitchValue(state, hit.id);
    ctx.reEvaluate(false); // not structural — don't rebuild nets or reset step sim
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
    return;
  }

  const junctionId = hitTestJunction(state, point);
  if (junctionId) {
    if (e.ctrlKey) {
      toggleJunctionSelection(state, junctionId);
    } else {
      selectJunction(state, junctionId);
    }
    return;
  }

  const wireHit = hitTestWire(state, point);
  if (wireHit) {
    if (e.ctrlKey) {
      toggleWireSelection(state, wireHit.wireId);
    } else {
      selectWire(state, wireHit.wireId);
    }
    return;
  }

  if (!e.ctrlKey) {
    clearSelection(state);
  }
}

function handleWireClick(state: EditorState, point: Point, ctx: HandlerContext, e: MouseEvent): void {
  if (e.button === 2) {
    clearPendingWire(state);
    return;
  }

  const pinHit = hitTestPin(state, point);

  if (state.pendingWire === null) {
    // First click: start a wire
    if (pinHit) {
      setPendingWireEndpoint(state, { type: "pin", componentId: pinHit.componentId, pinIndex: pinHit.pinIndex });
    } else {
      const wireHit = hitTestWire(state, point);
      if (wireHit) {
        ctx.pushSnapshot();
        const junction = addJunction(state, wireHit.position);
        splitWireAtJunction(state, wireHit.wireId, junction.id);
        setPendingWireEndpoint(state, { type: "junction", junctionId: junction.id });
      } else {
        setPendingWireEndpoint(state, { type: "point", x: point.x, y: point.y });
      }
    }
  } else {
    // When pendingWire is set: check for pin/junction/wire hits to complete, or add waypoint on empty canvas
    if (pinHit) {
      // Complete the wire at a pin
      ctx.pushSnapshot();
      const toEndpoint = { type: "pin", componentId: pinHit.componentId, pinIndex: pinHit.pinIndex } as const;
      addWireSegment(state, state.pendingWire, toEndpoint, state.pendingWaypoints);
      clearPendingWire(state);
      ctx.reEvaluate();
      ctx.save();
    } else {
      const wireHit = hitTestWire(state, point);
      if (wireHit) {
        // Complete the wire at a wire intersection (junction)
        ctx.pushSnapshot();
        const junction = addJunction(state, wireHit.position);
        splitWireAtJunction(state, wireHit.wireId, junction.id);
        const toEndpoint = { type: "junction", junctionId: junction.id } as const;
        addWireSegment(state, state.pendingWire, toEndpoint, state.pendingWaypoints);
        clearPendingWire(state);
        ctx.reEvaluate();
        ctx.save();
      } else {
        // Empty canvas: add a waypoint (not a completion)
        addPendingWaypoint(state, point);
      }
    }
  }
}

function handlePlaceComponent(state: EditorState, point: Point, ctx: HandlerContext): void {
  if (!state.selectedTool || state.selectedTool === "select" || state.selectedTool === "wire") return;
  ctx.pushSnapshot();
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
    handleWireClick(state, point, ctx, e);
  } else {
    handlePlaceComponent(state, point, ctx);
  }
}

export function handleCanvasMouseDown(state: EditorState, e: MouseEvent, ctx: HandlerContext): void {
  if (state.selectedTool !== "select") return;
  const point: Point = { x: e.offsetX, y: e.offsetY };
  mouseDownPoint = point;
  dragOccurred = false;

  const hit = hitTest(state, point);
  if (hit) {
    if (!state.selectedComponentIds.has(hit.id) && !e.ctrlKey) {
      selectComponent(state, hit.id);
    }
    ctx.pushSnapshot();
    const offset: Point = {
      x: point.x - hit.position.x,
      y: point.y - hit.position.y,
    };
    startDrag(state, hit.id, offset);
    return;
  }

  const junctionId = hitTestJunction(state, point);
  if (junctionId) {
    if (!state.selectedJunctionIds.has(junctionId) && !e.ctrlKey) {
      selectJunction(state, junctionId);
    }
    ctx.pushSnapshot();
    startJunctionDrag(state, junctionId, point);
    return;
  }

  startSelectionBox(state, point);
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
    if (!dragOccurred) {
      ctx.popSnapshot();
    }
    endDrag(state);
    if (dragOccurred) {
      ctx.save();
    }
  }
  mouseDownPoint = null;
}
