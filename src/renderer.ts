import type { ComponentType, ComponentDef, EditorState, PlacedComponent, Point, PinDef } from "./types";
import { andGate } from "./components/and-gate";
import { switchComponent } from "./components/switch";
import { lightComponent } from "./components/light";

const registry = new Map<ComponentType, ComponentDef>([
  ["and-gate", andGate],
  ["switch", switchComponent],
  ["light", lightComponent],
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
      def.draw(ctx, comp.position.x, comp.position.y, comp.state);

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

  // Draw wires
  for (const wire of state.wires) {
    const fromComp = state.components.find((c) => c.id === wire.fromComponentId);
    const toComp = state.components.find((c) => c.id === wire.toComponentId);
    if (!fromComp || !toComp) continue;
    const fromDef = registry.get(fromComp.type);
    const toDef = registry.get(toComp.type);
    if (!fromDef || !toDef) continue;
    const fromPin = fromDef.pins[wire.fromPinIndex];
    const toPin = toDef.pins[wire.toPinIndex];
    if (!fromPin || !toPin) continue;
    const from = getPinPosition(fromComp, fromPin);
    const to = getPinPosition(toComp, toPin);
    ctx.save();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  // Draw pins when wire tool is active
  if (state.selectedTool === "wire") {
    for (const comp of state.components) {
      const def = registry.get(comp.type);
      if (!def) continue;
      for (let i = 0; i < def.pins.length; i++) {
        const pin = def.pins[i];
        const pos = getPinPosition(comp, pin);
        const isPending =
          state.pendingWire !== null &&
          state.pendingWire.componentId === comp.id &&
          state.pendingWire.pinIndex === i;
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        if (isPending) {
          ctx.fillStyle = "#ef4444";
          ctx.fill();
        } else {
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  // Draw pending wire preview
  if (state.pendingWire && state.cursorPosition) {
    const comp = state.components.find((c) => c.id === state.pendingWire!.componentId);
    if (comp) {
      const def = registry.get(comp.type);
      if (def) {
        const pin = def.pins[state.pendingWire.pinIndex];
        if (pin) {
          const from = getPinPosition(comp, pin);
          ctx.save();
          ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(state.cursorPosition.x, state.cursorPosition.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // Ghost preview for component placement
  if (state.selectedTool && state.selectedTool !== "select" && state.selectedTool !== "wire" && state.cursorPosition) {
    const def = registry.get(state.selectedTool);
    if (def) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      def.draw(ctx, state.cursorPosition.x, state.cursorPosition.y);
      ctx.restore();
    }
  }
}

export function getPinPosition(comp: PlacedComponent, pinDef: PinDef): Point {
  return { x: comp.position.x + pinDef.x, y: comp.position.y + pinDef.y };
}

export function hitTestPin(
  state: EditorState,
  point: Point,
  radius: number = 10,
): { componentId: string; pinIndex: number } | null {
  // Iterate in reverse for z-order (last added = on top)
  for (let i = state.components.length - 1; i >= 0; i--) {
    const comp = state.components[i];
    const def = registry.get(comp.type);
    if (!def) continue;
    for (let p = 0; p < def.pins.length; p++) {
      const pos = getPinPosition(comp, def.pins[p]);
      const dx = point.x - pos.x;
      const dy = point.y - pos.y;
      if (dx * dx + dy * dy <= radius * radius) {
        return { componentId: comp.id, pinIndex: p };
      }
    }
  }
  return null;
}
