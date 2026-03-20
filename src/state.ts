import type { EditorState, ComponentType, ToolMode, Point, PlacedComponent } from "./types";

let nextId = 0;

export function createEditorState(): EditorState {
  return {
    selectedTool: null,
    components: [],
    cursorPosition: null,
    selectedComponentIds: new Set(),
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
