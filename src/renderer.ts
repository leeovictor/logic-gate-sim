import type { ComponentType, ComponentDef, EditorState } from "./types";
import { andGate } from "./components/and-gate";

const registry = new Map<ComponentType, ComponentDef>([
  ["and-gate", andGate],
]);

export function getComponentDef(type: ComponentType): ComponentDef | undefined {
  return registry.get(type);
}

export function drawAll(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);

  for (const comp of state.components) {
    const def = registry.get(comp.type);
    if (def) {
      def.draw(ctx, comp.position.x, comp.position.y);
    }
  }
}
