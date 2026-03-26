import type { EditorState, Point } from "@/core/types";

function collectWaypointOffsets(state: EditorState, clickPoint: Point): Map<string, Point[]> {
  const waypointOffsets = new Map<string, Point[]>();
  for (const wireId of state.selectedWireIds) {
    const wire = state.wireSegments.find((w) => w.id === wireId);
    if (!wire?.waypoints || wire.waypoints.length === 0) continue;
    waypointOffsets.set(
      wireId,
      wire.waypoints.map((wp) => ({
        x: clickPoint.x - wp.x,
        y: clickPoint.y - wp.y,
      })),
    );
  }
  return waypointOffsets;
}

export function startDrag(state: EditorState, componentId: string, offset: Point): void {
  const offsets = new Map<string, Point>();
  const junctionOffsets = new Map<string, Point>();
  let waypointOffsets = new Map<string, Point[]>();
  if (state.selectedComponentIds.has(componentId)) {
    const anchor = state.components.find((c) => c.id === componentId)!;
    const clickPoint: Point = {
      x: anchor.position.x + offset.x,
      y: anchor.position.y + offset.y,
    };
    for (const id of state.selectedComponentIds) {
      const comp = state.components.find((c) => c.id === id);
      if (!comp) continue;
      offsets.set(id, {
        x: clickPoint.x - comp.position.x,
        y: clickPoint.y - comp.position.y,
      });
    }
    for (const jid of state.selectedJunctionIds) {
      const junction = state.junctions.find((j) => j.id === jid);
      if (!junction) continue;
      junctionOffsets.set(jid, {
        x: clickPoint.x - junction.position.x,
        y: clickPoint.y - junction.position.y,
      });
    }
    waypointOffsets = collectWaypointOffsets(state, clickPoint);
  } else {
    offsets.set(componentId, offset);
  }
  state.dragging = { componentId, offset, offsets, junctionOffsets, waypointOffsets };
}

export function startJunctionDrag(state: EditorState, junctionId: string, clickPoint: Point): void {
  const offsets = new Map<string, Point>();
  const junctionOffsets = new Map<string, Point>();
  let waypointOffsets = new Map<string, Point[]>();
  if (state.selectedJunctionIds.has(junctionId)) {
    for (const jid of state.selectedJunctionIds) {
      const junction = state.junctions.find((j) => j.id === jid);
      if (!junction) continue;
      junctionOffsets.set(jid, {
        x: clickPoint.x - junction.position.x,
        y: clickPoint.y - junction.position.y,
      });
    }
    for (const id of state.selectedComponentIds) {
      const comp = state.components.find((c) => c.id === id);
      if (!comp) continue;
      offsets.set(id, {
        x: clickPoint.x - comp.position.x,
        y: clickPoint.y - comp.position.y,
      });
    }
    waypointOffsets = collectWaypointOffsets(state, clickPoint);
  } else {
    const junction = state.junctions.find((j) => j.id === junctionId);
    if (junction) {
      junctionOffsets.set(junctionId, {
        x: clickPoint.x - junction.position.x,
        y: clickPoint.y - junction.position.y,
      });
    }
  }
  state.dragging = { componentId: junctionId, offset: { x: 0, y: 0 }, offsets, junctionOffsets, waypointOffsets };
}

export function updateDrag(state: EditorState, cursor: Point): void {
  if (!state.dragging) return;
  for (const [id, offset] of state.dragging.offsets) {
    const comp = state.components.find((c) => c.id === id);
    if (!comp) continue;
    comp.position = {
      x: cursor.x - offset.x,
      y: cursor.y - offset.y,
    };
  }
  for (const [jid, offset] of state.dragging.junctionOffsets) {
    const junction = state.junctions.find((j) => j.id === jid);
    if (!junction) continue;
    junction.position = {
      x: cursor.x - offset.x,
      y: cursor.y - offset.y,
    };
  }
  for (const [wireId, wpOffsets] of state.dragging.waypointOffsets) {
    const wire = state.wireSegments.find((w) => w.id === wireId);
    if (!wire?.waypoints) continue;
    for (let i = 0; i < wire.waypoints.length && i < wpOffsets.length; i++) {
      wire.waypoints[i] = {
        x: cursor.x - wpOffsets[i].x,
        y: cursor.y - wpOffsets[i].y,
      };
    }
  }
}

export function endDrag(state: EditorState): void {
  state.dragging = null;
}
