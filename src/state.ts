import type { EditorState, ComponentType, ToolMode, Point, PlacedComponent, Wire, PendingWire } from "./types";
import { getComponentDef } from "./renderer";
import { evaluateCircuit } from "./simulation";

let nextId = 0;
let nextWireId = 0;

export function createEditorState(): EditorState {
  return {
    selectedTool: null,
    components: [],
    cursorPosition: null,
    selectedComponentIds: new Set(),
    wires: [],
    pendingWire: null,
    simulationEnabled: false,
  };
}

export function addComponent(
  state: EditorState,
  type: ComponentType,
  position: Point,
): PlacedComponent {
  const def = getComponentDef(type);
  const component: PlacedComponent = {
    id: `comp-${nextId++}`,
    type,
    position,
    state: def?.defaultState ? { ...def.defaultState } : {},
  };
  state.components.push(component);
  if (state.simulationEnabled) evaluateCircuit(state);
  return component;
}

export function setSelectedTool(
  state: EditorState,
  tool: ToolMode | null,
): void {
  state.selectedTool = tool;
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
  if (state.simulationEnabled) evaluateCircuit(state);
}

export function addWire(
  state: EditorState,
  from: PendingWire,
  to: PendingWire,
): Wire | null {
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

  // No duplicate wires
  const isDuplicate = state.wires.some(
    (w) =>
      w.fromComponentId === from.componentId &&
      w.fromPinIndex === from.pinIndex &&
      w.toComponentId === to.componentId &&
      w.toPinIndex === to.pinIndex,
  );
  if (isDuplicate) return null;

  const wire: Wire = {
    id: `wire-${nextWireId++}`,
    fromComponentId: from.componentId,
    fromPinIndex: from.pinIndex,
    toComponentId: to.componentId,
    toPinIndex: to.pinIndex,
  };
  state.wires.push(wire);
  if (state.simulationEnabled) evaluateCircuit(state);
  return wire;
}

export function removeWiresForComponent(state: EditorState, componentId: string): void {
  state.wires = state.wires.filter(
    (w) => w.fromComponentId !== componentId && w.toComponentId !== componentId,
  );
}

export function setPendingWire(state: EditorState, componentId: string, pinIndex: number): void {
  state.pendingWire = { componentId, pinIndex };
}

export function clearPendingWire(state: EditorState): void {
  state.pendingWire = null;
}

export function toggleSwitchValue(state: EditorState, componentId: string): void {
  const comp = state.components.find((c) => c.id === componentId);
  if (!comp || comp.type !== "switch") return;
  comp.state.value = comp.state.value ? 0 : 1;
  if (state.simulationEnabled) evaluateCircuit(state);
}

export function toggleSimulation(state: EditorState): void {
  state.simulationEnabled = !state.simulationEnabled;
  evaluateCircuit(state);
}
