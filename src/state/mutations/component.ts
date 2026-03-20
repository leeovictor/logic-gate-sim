import type { EditorState, ComponentType, ToolMode, PlacedComponent, Point } from "@/core/types";
import { getComponentDef } from "@/core/registry";

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

export function toggleSwitchValue(state: EditorState, componentId: string): void {
  const comp = state.components.find((c) => c.id === componentId);
  if (!comp || comp.type !== "switch") return;
  comp.state.value = comp.state.value ? 0 : 1;
}
