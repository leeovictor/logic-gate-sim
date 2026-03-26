import type { EditorState, PendingWire, Point } from "@/core/types";

/** @deprecated Use setPendingWireEndpoint instead */
export function setPendingWire(
  state: EditorState,
  componentId: string,
  pinIndex: number,
): void {
  state.pendingWire = { type: "pin", componentId, pinIndex };
}

export function setPendingWireEndpoint(
  state: EditorState,
  endpoint: PendingWire,
): void {
  state.pendingWire = endpoint;
}

export function addPendingWaypoint(state: EditorState, point: Point): void {
  state.pendingWaypoints.push({ ...point });
}

export function clearPendingWire(state: EditorState): void {
  state.pendingWire = null;
  state.pendingWaypoints = [];
}
