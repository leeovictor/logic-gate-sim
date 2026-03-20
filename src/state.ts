import type { EditorState, ComponentType, ToolMode, Point, PlacedComponent, WireSegment, WireJunction, PendingWire } from "./types";
import { getComponentDef } from "./registry";

export function createEditorState(): EditorState {
  return {
    selectedTool: null,
    components: [],
    cursorPosition: null,
    selectedComponentIds: new Set(),
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

export function clearSelection(state: EditorState): void {
  state.selectedComponentIds.clear();
}

export function deleteSelected(state: EditorState): void {
  if (state.selectedComponentIds.size === 0) return;
  for (const id of state.selectedComponentIds) {
    removeWiresForComponent(state, id);
  }
  state.components = state.components.filter(
    (c) => !state.selectedComponentIds.has(c.id),
  );
  state.selectedComponentIds.clear();
}

export function addWire(
  state: EditorState,
  from: PendingWire,
  to: PendingWire,
): WireSegment | null {
  // Both must be pin endpoints for validation in Phase 1
  if (from.type !== "pin" || to.type !== "pin") return null;

  // Cannot connect a component to itself
  if (from.componentId === to.componentId) return null;

  const fromComp = state.components.find((c) => c.id === from.componentId);
  const toComp = state.components.find((c) => c.id === to.componentId);
  if (!fromComp || !toComp) return null;

  const fromDef = getComponentDef(fromComp.type);
  const toDef = getComponentDef(toComp.type);
  if (!fromDef || !toDef) return null;

  const fromPin = fromDef.pins[from.pinIndex];
  const toPin = toDef.pins[to.pinIndex];
  if (!fromPin || !toPin) return null;

  // from must be output, to must be input
  if (fromPin.direction !== "output" || toPin.direction !== "input") return null;

  // No duplicate wire segments between these pins
  const isDuplicate = state.wireSegments.some(
    (w) =>
      w.from.type === "pin" &&
      w.to.type === "pin" &&
      w.from.componentId === from.componentId &&
      w.from.pinIndex === from.pinIndex &&
      w.to.componentId === to.componentId &&
      w.to.pinIndex === to.pinIndex,
  );
  if (isDuplicate) return null;

  const wireSegment: WireSegment = {
    id: `wire-${state._nextWireId++}`,
    from: {
      type: "pin",
      componentId: from.componentId,
      pinIndex: from.pinIndex,
    },
    to: {
      type: "pin",
      componentId: to.componentId,
      pinIndex: to.pinIndex,
    },
  };
  state.wireSegments.push(wireSegment);
  return wireSegment;
}

export function removeWiresForComponent(state: EditorState, componentId: string): void {
  // Remove wire segments connected to this component
  state.wireSegments = state.wireSegments.filter((w) => {
    const fromConnected = w.from.type === "pin" && w.from.componentId === componentId;
    const toConnected = w.to.type === "pin" && w.to.componentId === componentId;
    return !fromConnected && !toConnected;
  });
}

export function setPendingWire(state: EditorState, componentId: string, pinIndex: number): void {
  state.pendingWire = { type: "pin", componentId, pinIndex };
}

export function clearPendingWire(state: EditorState): void {
  state.pendingWire = null;
}

export function startDrag(state: EditorState, componentId: string, offset: Point): void {
  const offsets = new Map<string, Point>();
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
  } else {
    offsets.set(componentId, offset);
  }
  state.dragging = { componentId, offset, offsets };
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

  state.selectionBox = null;
}
