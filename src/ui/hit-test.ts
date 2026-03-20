import type { EditorState, PlacedComponent, Point, PinDef, WireEndpoint } from "@/core/types";
import { getComponentDef } from "@/core/registry";
import { getPinPosition, getEndpointPosition } from "./renderer";

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
