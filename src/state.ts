import type { EditorState, ComponentType, Point, PlacedComponent } from "./types";

let nextId = 0;

export function createEditorState(): EditorState {
  return {
    selectedTool: null,
    components: [],
  };
}

export function addComponent(
  state: EditorState,
  type: ComponentType,
  position: Point,
): PlacedComponent {
  const component: PlacedComponent = {
    id: `comp-${nextId++}`,
    type,
    position,
  };
  state.components.push(component);
  return component;
}

export function setSelectedTool(
  state: EditorState,
  tool: ComponentType | null,
): void {
  state.selectedTool = tool;
}
