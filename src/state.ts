import type { EditorState, ComponentType, ToolMode, Point, PlacedComponent, WireSegment, WireJunction, WireEndpoint, PendingWire } from "./types";
import { getComponentDef } from "./registry";

export function createEditorState(): EditorState {
  return {
    selectedTool: null,
    components: [],
    cursorPosition: null,
    selectedComponentIds: new Set(),
    selectedWireIds: new Set(),
    selectedJunctionIds: new Set(),
    wireSegments: [],
    junctions: [],
    pendingWire: null,
    hoveredPin: null,
    dragging: null,
    selectionBox: null,
    simulationEnabled: false,
    events: new EventTarget(),
    nets: [],
    _nextId: 0,
    _nextWireId: 0,
    _nextJunctionId: 0,
  };
}

export function addComponent(
  state: EditorState,
  type: ComponentType,
  position: Point,
): PlacedComponent {
  const def = getComponentDef(type);
  const component: PlacedComponent = {
    id: `comp-${state._nextId++}`,
    type,
    position,
    state: def?.defaultState ? { ...def.defaultState } : {},
  };
  state.components.push(component);
  return component;
}

export function setSelectedTool(
  state: EditorState,
  tool: ToolMode | null,
): void {
  state.selectedTool = tool;
  state.events.dispatchEvent(new CustomEvent("toolchange", { detail: tool }));
}

export function selectComponent(state: EditorState, id: string): void {
  state.selectedComponentIds.clear();
  state.selectedComponentIds.add(id);
}

export function toggleComponentSelection(state: EditorState, id: string): void {
  if (state.selectedComponentIds.has(id)) {
    state.selectedComponentIds.delete(id);
  } else {
    state.selectedComponentIds.add(id);
  }
}

export function selectWire(state: EditorState, wireId: string): void {
  state.selectedComponentIds.clear();
  state.selectedWireIds.clear();
  state.selectedWireIds.add(wireId);
}

export function toggleWireSelection(state: EditorState, wireId: string): void {
  if (state.selectedWireIds.has(wireId)) {
    state.selectedWireIds.delete(wireId);
  } else {
    state.selectedWireIds.add(wireId);
  }
}

export function selectJunction(state: EditorState, junctionId: string): void {
  state.selectedComponentIds.clear();
  state.selectedWireIds.clear();
  state.selectedJunctionIds.clear();
  state.selectedJunctionIds.add(junctionId);
}

export function toggleJunctionSelection(state: EditorState, junctionId: string): void {
  if (state.selectedJunctionIds.has(junctionId)) {
    state.selectedJunctionIds.delete(junctionId);
  } else {
    state.selectedJunctionIds.add(junctionId);
  }
}

export function clearSelection(state: EditorState): void {
  state.selectedComponentIds.clear();
  state.selectedWireIds.clear();
  state.selectedJunctionIds.clear();
}

export function deleteSelected(state: EditorState): void {
  if (state.selectedComponentIds.size === 0 && state.selectedWireIds.size === 0 && state.selectedJunctionIds.size === 0) return;
  for (const id of state.selectedComponentIds) {
    removeSegmentsForComponent(state, id);
  }
  state.components = state.components.filter(
    (c) => !state.selectedComponentIds.has(c.id),
  );
  state.selectedComponentIds.clear();
  for (const wireId of state.selectedWireIds) {
    removeWireSegment(state, wireId);
  }
  state.selectedWireIds.clear();
  // Delete junction + all segments connecting to it
  for (const junctionId of state.selectedJunctionIds) {
    state.wireSegments = state.wireSegments.filter(
      (w) =>
        !(w.from.type === "junction" && w.from.junctionId === junctionId) &&
        !(w.to.type === "junction" && w.to.junctionId === junctionId),
    );
    state.junctions = state.junctions.filter((j) => j.id !== junctionId);
  }
  state.selectedJunctionIds.clear();
}

function endpointsEqual(a: WireEndpoint, b: WireEndpoint): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "pin" && b.type === "pin") {
    return a.componentId === b.componentId && a.pinIndex === b.pinIndex;
  }
  if (a.type === "point" && b.type === "point") {
    return a.x === b.x && a.y === b.y;
  }
  if (a.type === "junction" && b.type === "junction") {
    return a.junctionId === b.junctionId;
  }
  return false;
}

export function addWireSegment(
  state: EditorState,
  from: WireEndpoint,
  to: WireEndpoint,
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
  state.wireSegments.push({
    id: `wire-${state._nextWireId++}`,
    from: seg.from,
    to: junctionEndpoint,
  });
  state.wireSegments.push({
    id: `wire-${state._nextWireId++}`,
    from: junctionEndpoint,
    to: seg.to,
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

export function setPendingWire(state: EditorState, componentId: string, pinIndex: number): void {
  state.pendingWire = { type: "pin", componentId, pinIndex };
}

export function setPendingWireEndpoint(state: EditorState, endpoint: PendingWire): void {
  state.pendingWire = endpoint;
}

export function clearPendingWire(state: EditorState): void {
  state.pendingWire = null;
}

export function startDrag(state: EditorState, componentId: string, offset: Point): void {
  const offsets = new Map<string, Point>();
  const junctionOffsets = new Map<string, Point>();
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
  } else {
    offsets.set(componentId, offset);
  }
  state.dragging = { componentId, offset, offsets, junctionOffsets };
}

export function startJunctionDrag(state: EditorState, junctionId: string, clickPoint: Point): void {
  const offsets = new Map<string, Point>();
  const junctionOffsets = new Map<string, Point>();
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
  } else {
    const junction = state.junctions.find((j) => j.id === junctionId);
    if (junction) {
      junctionOffsets.set(junctionId, {
        x: clickPoint.x - junction.position.x,
        y: clickPoint.y - junction.position.y,
      });
    }
  }
  state.dragging = { componentId: junctionId, offset: { x: 0, y: 0 }, offsets, junctionOffsets };
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
}

export function endDrag(state: EditorState): void {
  state.dragging = null;
}

export function toggleSwitchValue(state: EditorState, componentId: string): void {
  const comp = state.components.find((c) => c.id === componentId);
  if (!comp || comp.type !== "switch") return;
  comp.state.value = comp.state.value ? 0 : 1;
}

export function toggleSimulation(state: EditorState): void {
  state.simulationEnabled = !state.simulationEnabled;
  if (state.simulationEnabled) {
    state.selectedTool = null;
    state.events.dispatchEvent(new CustomEvent("toolchange", { detail: null }));
  }
}

export function startSelectionBox(state: EditorState, point: Point): void {
  state.selectionBox = { start: { ...point }, current: { ...point } };
}

export function updateSelectionBox(state: EditorState, point: Point): void {
  if (!state.selectionBox) return;
  state.selectionBox.current = point;
}

export function endSelectionBox(state: EditorState, ctrlKey: boolean): void {
  if (!state.selectionBox) return;
  const { start, current } = state.selectionBox;
  const left = Math.min(start.x, current.x);
  const right = Math.max(start.x, current.x);
  const top = Math.min(start.y, current.y);
  const bottom = Math.max(start.y, current.y);

  if (!ctrlKey) {
    state.selectedComponentIds.clear();
    state.selectedWireIds.clear();
    state.selectedJunctionIds.clear();
  }

  for (const comp of state.components) {
    const def = getComponentDef(comp.type);
    if (!def) continue;
    const cx = comp.position.x;
    const cy = comp.position.y;
    if (
      cx >= left &&
      cy >= top &&
      cx + def.width <= right &&
      cy + def.height <= bottom
    ) {
      state.selectedComponentIds.add(comp.id);
    }
  }

  for (const wire of state.wireSegments) {
    const fromPos = resolveEndpoint(state, wire.from);
    const toPos = resolveEndpoint(state, wire.to);
    if (!fromPos || !toPos) continue;
    if (
      fromPos.x >= left && fromPos.x <= right && fromPos.y >= top && fromPos.y <= bottom &&
      toPos.x >= left && toPos.x <= right && toPos.y >= top && toPos.y <= bottom
    ) {
      state.selectedWireIds.add(wire.id);
    }
  }

  for (const junction of state.junctions) {
    const { x, y } = junction.position;
    if (x >= left && x <= right && y >= top && y <= bottom) {
      state.selectedJunctionIds.add(junction.id);
    }
  }

  state.selectionBox = null;
}

function resolveEndpoint(state: EditorState, endpoint: WireEndpoint): Point | null {
  if (endpoint.type === "pin") {
    const comp = state.components.find((c) => c.id === endpoint.componentId);
    if (!comp) return null;
    const def = getComponentDef(comp.type);
    if (!def) return null;
    const pin = def.pins[endpoint.pinIndex];
    if (!pin) return null;
    return { x: comp.position.x + pin.x, y: comp.position.y + pin.y };
  }
  if (endpoint.type === "point") {
    return { x: endpoint.x, y: endpoint.y };
  }
  if (endpoint.type === "junction") {
    const junction = state.junctions.find((j) => j.id === endpoint.junctionId);
    return junction ? junction.position : null;
  }
  return null;
}
