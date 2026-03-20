export interface Point {
  x: number;
  y: number;
}

export type ComponentType = "and-gate";

export interface ComponentDef {
  type: ComponentType;
  label: string;
  width: number;
  height: number;
  draw(ctx: CanvasRenderingContext2D, x: number, y: number): void;
}

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  position: Point;
}

export interface EditorState {
  selectedTool: ComponentType | null;
  components: PlacedComponent[];
}
