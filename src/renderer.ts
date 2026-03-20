import type { EditorState, PlacedComponent, Point, PinDef, WireEndpoint } from "./types";
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

function drawBezierWire(ctx: CanvasRenderingContext2D, from: Point, to: Point): void {
  const offset = Math.max(Math.abs(to.x - from.x) * 0.5, to.x < from.x ? 80 : 40);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(from.x + offset, from.y, to.x - offset, to.y, to.x, to.y);
  ctx.stroke();
}

function getWireSignal(state: EditorState, wireId: string): 0 | 1 | 'E' {
  // Find which net contains this wire
  const net = state.nets.find((n) => n.wireSegmentIds.includes(wireId));
  if (!net) return 0;
  return net.signalValue;
}

function drawWires(ctx: CanvasRenderingContext2D, state: EditorState): void {
  for (const wire of state.wireSegments) {
    const from = getEndpointPosition(state, wire.from);
    const to = getEndpointPosition(state, wire.to);
    if (!from || !to) continue;

    const isSelected = state.selectedWireIds.has(wire.id);
    ctx.save();
    if (isSelected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
    } else if (state.simulationEnabled) {
      const signal = getWireSignal(state, wire.id);
      if (signal === 'E') {
        ctx.strokeStyle = "#f87171"; // Red for error
        ctx.lineWidth = 2.5;
      } else if (signal === 1) {
        ctx.strokeStyle = "#22c55e"; // Green for on
        ctx.lineWidth = 2.5;
      } else {
        ctx.strokeStyle = "#6b7280"; // Gray for off
        ctx.lineWidth = 2;
      }
    } else {
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 2;
    }
    drawBezierWire(ctx, from, to);
    ctx.restore();
  }

  // Draw junctions as filled dots
  for (const junction of state.junctions) {
    const isSelected = state.selectedJunctionIds.has(junction.id);
    ctx.save();
    ctx.beginPath();
    ctx.arc(junction.position.x, junction.position.y, isSelected ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? "#3b82f6" : "#1a1a1a";
    ctx.fill();
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
  const from = getEndpointPosition(state, state.pendingWire);
  if (!from) return;
  ctx.save();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  drawBezierWire(ctx, from, state.cursorPosition);
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

export function getEndpointPosition(state: EditorState, endpoint: WireEndpoint): Point | null {
  if (endpoint.type === "pin") {
    const comp = state.components.find((c) => c.id === endpoint.componentId);
    if (!comp) return null;
    const def = getComponentDef(comp.type);
    if (!def) return null;
    const pin = def.pins[endpoint.pinIndex];
    if (!pin) return null;
    return getPinPosition(comp, pin);
  }
  if (endpoint.type === "point") {
    return { x: endpoint.x, y: endpoint.y };
  }
  if (endpoint.type === "junction") {
    const junction = state.junctions.find((j) => j.id === endpoint.junctionId);
    if (!junction) return null;
    return junction.position;
  }
  return null;
}

export function hitTestWire(
  state: EditorState,
  point: Point,
  threshold: number = 5,
): { wireId: string; t: number; position: Point } | null {
  let bestDist = threshold * threshold;
  let bestResult: { wireId: string; t: number; position: Point } | null = null;

  for (const wire of state.wireSegments) {
    const from = getEndpointPosition(state, wire.from);
    const to = getEndpointPosition(state, wire.to);
    if (!from || !to) continue;

    const offset = Math.max(Math.abs(to.x - from.x) * 0.5, to.x < from.x ? 80 : 40);
    const cp1x = from.x + offset;
    const cp2x = to.x - offset;

    const SAMPLES = 20;
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES;
      const bx = bezierPoint(from.x, cp1x, cp2x, to.x, t);
      const by = bezierPoint(from.y, from.y, to.y, to.y, t);
      const dx = point.x - bx;
      const dy = point.y - by;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < bestDist) {
        bestDist = dist2;
        bestResult = { wireId: wire.id, t, position: { x: bx, y: by } };
      }
    }
  }
  return bestResult;
}

function bezierPoint(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

export function hitTestJunction(
  state: EditorState,
  point: Point,
  radius: number = 8,
): string | null {
  for (const junction of state.junctions) {
    const dx = point.x - junction.position.x;
    const dy = point.y - junction.position.y;
    if (dx * dx + dy * dy <= radius * radius) {
      return junction.id;
    }
  }
  return null;
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
