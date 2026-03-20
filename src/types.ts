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

export type ComponentType = "and-gate";

export type ToolMode = "select" | "wire" | ComponentType;

export interface ComponentDef {
  type: ComponentType;
  label: string;
  width: number;
  height: number;
  pins: PinDef[];
  draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
}

export interface Wire {
  id: string;
  fromComponentId: string;
  fromPinIndex: number;
  toComponentId: string;
  toPinIndex: number;
}

export interface PendingWire {
  componentId: string;
  pinIndex: number;
}

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  position: Point;
}

export interface EditorState {
  selectedTool: ToolMode | null;
  components: PlacedComponent[];
  cursorPosition: Point | null;
  selectedComponentIds: Set<string>;
  wires: Wire[];
  pendingWire: PendingWire | null;
}
