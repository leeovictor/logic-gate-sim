import type { EditorState, PlacedComponent, Point, PinDef, WireEndpoint } from "@/core/types";
import { getComponentDef } from "@/core/registry";

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
  drawWireSegments(ctx, state);
  drawPinIndicators(ctx, state);
  drawPendingWire(ctx, state);
  drawSelectionBox(ctx, state);
  drawGhostPreview(ctx, state);
  drawStepOverlay(ctx, state, width);
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

function drawWireSegments(ctx: CanvasRenderingContext2D, state: EditorState): void {
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
        ctx.strokeStyle = "#ef4444"; // Red for error
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

    // Draw free endpoints as small open circles
    if (wire.from.type === "point") {
      ctx.save();
      ctx.strokeStyle = isSelected ? "#3b82f6" : "#1a1a1a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(from.x, from.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (wire.to.type === "point") {
      ctx.save();
      ctx.strokeStyle = isSelected ? "#3b82f6" : "#1a1a1a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(to.x, to.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
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
      
      // Color coding: output = green, input = blue
      const pinColor = pin.direction === "output" ? "#22c55e" : "#3b82f6";
      const hoverColor = pin.direction === "output" ? "rgba(34, 197, 94, 0.15)" : "rgba(59, 130, 246, 0.15)";
      
      ctx.save();
      if (isHovered && !isPending) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = hoverColor;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
      if (isPending) {
        ctx.fillStyle = pinColor;
        ctx.fill();
      } else if (isHovered) {
        ctx.fillStyle = pinColor;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = pinColor;
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

function drawStepOverlay(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  width: number,
): void {
  if (!state.simulationEnabled || state.simulationMode !== "step") return;

  const { stepCount, stable } = state.stepSimulation;

  ctx.save();

  // Step counter — top right
  const text = `Step ${stepCount}`;
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";

  // Background pill
  const metrics = ctx.measureText(text);
  const padding = 8;
  const pillX = width - metrics.width - padding * 3;
  const pillY = 8;
  const pillW = metrics.width + padding * 2;
  const pillH = 22;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 6);
    ctx.fill();
  } else {
    ctx.fillRect(pillX, pillY, pillW, pillH);
  }

  // Text
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, width - padding * 2, pillY + 4);

  // Stability dot
  const dotX = pillX - 12;
  const dotY = pillY + pillH / 2;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
  ctx.fillStyle = stable ? "#22c55e" : "#eab308";
  ctx.fill();

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

