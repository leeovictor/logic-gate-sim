import type { EditorState, Point, WireEndpoint, Viewport } from "@/core/types";
import { getComponentDef } from "@/core/registry";

export function createEditorState(): EditorState {
  return {
    theme: "light",
    selectedTool: null,
    components: [],
    cursorPosition: null,
    selectedComponentIds: new Set(),
    selectedWireIds: new Set(),
    selectedJunctionIds: new Set(),
    wireSegments: [],
    junctions: [],
    pendingWire: null,
    pendingWaypoints: [],
    hoveredPin: null,
    dragging: null,
    selectionBox: null,
    simulationEnabled: false,
    simulationMode: "instant",
    stepSimulation: {
      stepCount: 0,
      running: false,
      stepInterval: 500,
      autoStepTimer: null,
      previousNetValues: new Map(),
      stable: false,
    },
    events: new EventTarget(),
    nets: [],
    _nextId: 0,
    _nextWireId: 0,
    _nextJunctionId: 0,
    viewport: { panX: 0, panY: 0, zoom: 1 },
    panning: false,
  };
}

export function endpointsEqual(a: WireEndpoint, b: WireEndpoint): boolean {
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

export function resolveEndpoint(state: EditorState, endpoint: WireEndpoint): Point | null {
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

export function screenToWorld(screen: Point, viewport: Viewport): Point {
  return {
    x: (screen.x - viewport.panX) / viewport.zoom,
    y: (screen.y - viewport.panY) / viewport.zoom,
  };
}
