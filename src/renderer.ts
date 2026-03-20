import type { EditorState, PlacedComponent, Point, PinDef } from "./types";
import { getComponentDef } from "./registry";

export { getComponentDef };

export function hitTest(state: EditorState, point: Point): PlacedComponent | null {
  for (let i = state.components.length - 1; i >= 0; i--) {
    const comp = state.components[i];
    const def = getComponentDef(comp.type);
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
  drawComponents(ctx, state);
  drawWires(ctx, state);
  drawPinIndicators(ctx, state);
  drawPendingWire(ctx, state);
  drawSelectionBox(ctx, state);
  drawGhostPreview(ctx, state);
}

function drawComponents(ctx: CanvasRenderingContext2D, state: EditorState): void {
  for (const comp of state.components) {
    const def = getComponentDef(comp.type);
    if (!def) continue;
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

function drawWires(ctx: CanvasRenderingContext2D, state: EditorState): void {
  for (const wire of state.wireSegments) {
    // Only draw wire segments that connect two pins (not free points or junctions)
    if (wire.from.type !== "pin" || wire.to.type !== "pin") continue;

    const fromComp = state.components.find((c) => c.id === wire.from.componentId);
    const toComp = state.components.find((c) => c.id === wire.to.componentId);
    if (!fromComp || !toComp) continue;
    const fromDef = getComponentDef(fromComp.type);
    const toDef = getComponentDef(toComp.type);
    if (!fromDef || !toDef) continue;
    const fromPin = fromDef.pins[wire.from.pinIndex];
    const toPin = toDef.pins[wire.to.pinIndex];
    if (!fromPin || !toPin) continue;
    const from = getPinPosition(fromComp, fromPin);
    const to = getPinPosition(toComp, toPin);
    ctx.save();
    if (state.simulationEnabled) {
      const pinValues = fromComp.state.pinValues as number[] | undefined;
      const signal = pinValues?.[wire.from.pinIndex] ?? 0;
      ctx.strokeStyle = signal ? "#22c55e" : "#6b7280";
      ctx.lineWidth = signal ? 2.5 : 2;
    } else {
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
    }
    const offset = Math.max(Math.abs(to.x - from.x) * 0.5, to.x < from.x ? 80 : 40);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(from.x + offset, from.y, to.x - offset, to.y, to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPinIndicators(ctx: CanvasRenderingContext2D, state: EditorState): void {
  if (state.selectedTool !== "wire") return;
  for (const comp of state.components) {
    const def = getComponentDef(comp.type);
    if (!def) continue;
    for (let i = 0; i < def.pins.length; i++) {
      const pin = def.pins[i];
      const pos = getPinPosition(comp, pin);
      const isPending =
        state.pendingWire !== null &&
        state.pendingWire.type === "pin" &&
        state.pendingWire.componentId === comp.id &&
        state.pendingWire.pinIndex === i;
      const isHovered =
        state.hoveredPin !== null &&
        state.hoveredPin.componentId === comp.id &&
        state.hoveredPin.pinIndex === i;
      ctx.save();
      if (isHovered && !isPending) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
      if (isPending) {
        ctx.fillStyle = "#ef4444";
        ctx.fill();
      } else if (isHovered) {
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

function drawPendingWire(ctx: CanvasRenderingContext2D, state: EditorState): void {
  if (!state.pendingWire || !state.cursorPosition) return;
  // Only support pin-based pending wires for Phase 1
  if (state.pendingWire.type !== "pin") return;
  const comp = state.components.find((c) => c.id === state.pendingWire!.componentId);
  if (!comp) return;
  const def = getComponentDef(comp.type);
  if (!def) return;
  const pin = def.pins[state.pendingWire.pinIndex];
  if (!pin) return;
  const from = getPinPosition(comp, pin);
  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  const to = state.cursorPosition;
  const offset = Math.max(Math.abs(to.x - from.x) * 0.5, to.x < from.x ? 80 : 40);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(from.x + offset, from.y, to.x - offset, to.y, to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawGhostPreview(ctx: CanvasRenderingContext2D, state: EditorState): void {
  if (!state.selectedTool || state.selectedTool === "select" || state.selectedTool === "wire" || !state.cursorPosition) return;
  const def = getComponentDef(state.selectedTool);
  if (!def) return;
  ctx.save();
  ctx.globalAlpha = 0.4;
  def.draw(ctx, state.cursorPosition.x, state.cursorPosition.y);
  ctx.restore();
}

function drawSelectionBox(ctx: CanvasRenderingContext2D, state: EditorState): void {
  if (!state.selectionBox) return;
  const { start, current } = state.selectionBox;
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const w = Math.abs(current.x - start.x);
  const h = Math.abs(current.y - start.y);
  ctx.save();
  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

export function getPinPosition(comp: PlacedComponent, pinDef: PinDef): Point {
  return { x: comp.position.x + pinDef.x, y: comp.position.y + pinDef.y };
}

export function hitTestPin(
  state: EditorState,
  point: Point,
  radius: number = 20,
): { componentId: string; pinIndex: number } | null {
  // Iterate in reverse for z-order (last added = on top)
  for (let i = state.components.length - 1; i >= 0; i--) {
    const comp = state.components[i];
    const def = getComponentDef(comp.type);
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
