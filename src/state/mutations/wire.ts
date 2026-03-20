import type { EditorState, Point, WireSegment, WireJunction, WireEndpoint, PendingWire } from "@/core/types";
import { endpointsEqual } from "../editor-state";

export function addWireSegment(
  state: EditorState,
  from: WireEndpoint,
  to: WireEndpoint,
  waypoints?: Point[],
): WireSegment | null {
  // Prevent self-loop: pin-to-pin on same component
  if (from.type === "pin" && to.type === "pin" && from.componentId === to.componentId) return null;

  // No duplicate segments (in either direction)
  const isDuplicate = state.wireSegments.some(
    (w) =>
      (endpointsEqual(w.from, from) && endpointsEqual(w.to, to)) ||
      (endpointsEqual(w.from, to) && endpointsEqual(w.to, from)),
  );
  if (isDuplicate) return null;

  const wireSegment: WireSegment = {
    id: `wire-${state._nextWireId++}`,
    from,
    to,
    waypoints: waypoints && waypoints.length > 0 ? [...waypoints] : undefined,
  };
  state.wireSegments.push(wireSegment);
  return wireSegment;
}

/** @deprecated Use addWireSegment instead */
export function addWire(
  state: EditorState,
  from: PendingWire,
  to: PendingWire,
): WireSegment | null {
  return addWireSegment(state, from, to);
}

export function addJunction(state: EditorState, position: Point): WireJunction {
  const junction: WireJunction = {
    id: `junction-${state._nextJunctionId++}`,
    position: { ...position },
  };
  state.junctions.push(junction);
  return junction;
}

export function splitWireAtJunction(
  state: EditorState,
  wireSegmentId: string,
  junctionId: string,
): boolean {
  const segIndex = state.wireSegments.findIndex((w) => w.id === wireSegmentId);
  if (segIndex === -1) return false;
  const junction = state.junctions.find((j) => j.id === junctionId);
  if (!junction) return false;

  const seg = state.wireSegments[segIndex];
  state.wireSegments.splice(segIndex, 1);

  const junctionEndpoint: WireEndpoint = { type: "junction", junctionId };
  
  // Distribute waypoints to the two new segments based on which sub-segment the split occurs on
  const waypointsBeforeJunction: Point[] = [];
  const waypointsAfterJunction: Point[] = [];
  
  if (seg.waypoints && seg.waypoints.length > 0) {
    // For now, put all waypoints before the junction
    // In a full implementation, we'd calculate which waypoints come before/after the split point
    waypointsBeforeJunction.push(...seg.waypoints);
  }
  
  state.wireSegments.push({
    id: `wire-${state._nextWireId++}`,
    from: seg.from,
    to: junctionEndpoint,
    waypoints: waypointsBeforeJunction.length > 0 ? waypointsBeforeJunction : undefined,
  });
  state.wireSegments.push({
    id: `wire-${state._nextWireId++}`,
    from: junctionEndpoint,
    to: seg.to,
    waypoints: waypointsAfterJunction.length > 0 ? waypointsAfterJunction : undefined,
  });
  return true;
}

export function removeWireSegment(state: EditorState, segmentId: string): void {
  state.wireSegments = state.wireSegments.filter((w) => w.id !== segmentId);
  // Clean up junctions no longer referenced by any segment
  const referencedJunctionIds = new Set<string>();
  for (const seg of state.wireSegments) {
    if (seg.from.type === "junction") referencedJunctionIds.add(seg.from.junctionId);
    if (seg.to.type === "junction") referencedJunctionIds.add(seg.to.junctionId);
  }
  state.junctions = state.junctions.filter((j) => referencedJunctionIds.has(j.id));
}

export function removeSegmentsForComponent(state: EditorState, componentId: string): void {
  state.wireSegments = state.wireSegments.filter((w) => {
    const fromConnected = w.from.type === "pin" && w.from.componentId === componentId;
    const toConnected = w.to.type === "pin" && w.to.componentId === componentId;
    return !fromConnected && !toConnected;
  });
}

/** @deprecated Use removeSegmentsForComponent instead */
export function removeWiresForComponent(state: EditorState, componentId: string): void {
  removeSegmentsForComponent(state, componentId);
}
