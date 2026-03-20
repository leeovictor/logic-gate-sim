import type { ComponentType, ComponentDef, EditorState, PlacedComponent, Point } from "./types";
import { andGate } from "./components/and-gate";

const registry = new Map<ComponentType, ComponentDef>([
  ["and-gate", andGate],
]);

export function getComponentDef(type: ComponentType): ComponentDef | undefined {
  return registry.get(type);
}

export function hitTest(state: EditorState, point: Point): PlacedComponent | null {
  for (let i = state.components.length - 1; i >= 0; i--) {
    const comp = state.components[i];
    const def = registry.get(comp.type);
    if (!def) continue;
    const { x, y } = comp.position;
    if (
      point.x >= x &&
      point.x <= x + def.width &&
      point.y >= y &&
      point.y <= y + def.height
    ) {
      return comp;
    }
  }
  return null;
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

      if (state.selectedComponentIds.has(comp.id)) {
        const padding = 4;
        ctx.save();
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          comp.position.x - padding,
          comp.position.y - padding,
          def.width + padding * 2,
          def.height + padding * 2,
        );
        ctx.restore();
      }
    }
  }

  if (state.selectedTool && state.selectedTool !== "select" && state.cursorPosition) {
    const def = registry.get(state.selectedTool);
    if (def) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      def.draw(ctx, state.cursorPosition.x, state.cursorPosition.y);
      ctx.restore();
    }
  }
}
