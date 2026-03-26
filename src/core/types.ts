export interface Point {
  x: number;
  y: number;
}

export type PinDirection = "input" | "output";

export interface PinDef {
  direction: PinDirection;
  /** Posição relativa ao top-left do componente */
  x: number;
  y: number;
}

export type ComponentType =
  | "and-gate"
  | "or-gate"
  | "not-gate"
  | "nand-gate"
  | "nor-gate"
  | "xor-gate"
  | "xnor-gate"
  | "switch"
  | "light";

export type ToolMode = "select" | "wire" | ComponentType;

export interface ComponentDef {
  type: ComponentType;
  label: string;
  width: number;
  height: number;
  pins: PinDef[];
  defaultState?: Record<string, unknown>;
  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    state?: Record<string, unknown>,
  ): void;
  evaluate(
    inputs: SignalValue[],
    state: Record<string, unknown>,
  ): SignalValue[];
}

/** Signal value: 0 (off), 1 (on), or 'E' (error/conflict) */
export type SignalValue = 0 | 1 | "E";

/** Represents one end of a wire segment */
export type WireEndpoint =
  | { type: "pin"; componentId: string; pinIndex: number }
  | { type: "point"; x: number; y: number }
  | { type: "junction"; junctionId: string };

/** A wire segment connecting two endpoints */
export interface WireSegment {
  id: string;
  from: WireEndpoint;
  to: WireEndpoint;
  waypoints?: Point[];
}

/** A junction where multiple wire segments meet */
export interface WireJunction {
  id: string;
  position: Point;
}

/** A net is a group of connected wire segments and pins sharing the same signal */
export interface Net {
  id: string;
  pinReferences: { componentId: string; pinIndex: number }[];
  wireSegmentIds: string[];
  junctionIds: string[];
  signalValue: SignalValue;
}

/** Legacy Wire type for backward compatibility */
export interface Wire {
  id: string;
  fromComponentId: string;
  fromPinIndex: number;
  toComponentId: string;
  toPinIndex: number;
}

/** Represents an ongoing wire being drawn */
export type PendingWire =
  | { type: "pin"; componentId: string; pinIndex: number }
  | { type: "point"; x: number; y: number }
  | { type: "junction"; junctionId: string };

export interface HoveredPin {
  componentId: string;
  pinIndex: number;
}

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  position: Point;
  state: Record<string, unknown>;
}

export interface SelectionBox {
  start: Point;
  current: Point;
}

export interface DragState {
  componentId: string;
  offset: Point;
  offsets: Map<string, Point>;
  junctionOffsets: Map<string, Point>;
  waypointOffsets: Map<string, Point[]>;
}

export interface Viewport {
  /** Horizontal pan offset in screen coordinates */
  panX: number;
  /** Vertical pan offset in screen coordinates */
  panY: number;
  /** Zoom level (1.0 = 100%, clamped to [0.1, 5]) */
  zoom: number;
}

export interface EditorState {
  theme: "light" | "dark";
  selectedTool: ToolMode | null;
  components: PlacedComponent[];
  cursorPosition: Point | null;
  selectedComponentIds: Set<string>;
  selectedWireIds: Set<string>;
  selectedJunctionIds: Set<string>;
  wireSegments: WireSegment[];
  junctions: WireJunction[];
  pendingWire: PendingWire | null;
  pendingWaypoints: Point[];
  hoveredPin: HoveredPin | null;
  dragging: DragState | null;
  selectionBox: SelectionBox | null;
  events: EventTarget;
  nets: Net[];
  _nextId: number;
  _nextWireId: number;
  _nextJunctionId: number;
  viewport: Viewport;
  panning: boolean;
}

/** Snapshot of circuit-structural state for undo/redo */
export interface CircuitSnapshot {
  components: PlacedComponent[];
  wireSegments: WireSegment[];
  junctions: WireJunction[];
  _nextId: number;
  _nextWireId: number;
  _nextJunctionId: number;
}
