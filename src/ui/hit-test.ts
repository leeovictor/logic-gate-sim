import { getComponentDef } from "@/core/registry";
import type { EditorState, PlacedComponent, Point } from "@/core/types";
import { getEndpointPosition, getPinPosition } from "./renderer";

export function hitTest(
  state: EditorState,
  point: Point,
): PlacedComponent | null {
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

    // Build full path: from -> waypoints -> to
    const pathPoints: Point[] = [from];
    if (wire.waypoints && wire.waypoints.length > 0) {
      pathPoints.push(...wire.waypoints);
    }
    pathPoints.push(to);

    // Test distance to each segment
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];
      const { distance, closest } = pointToLineSegmentDistance(point, p1, p2);

      if (distance < bestDist) {
        bestDist = distance;
        bestResult = {
          wireId: wire.id,
          t:
            (i + (closest === p1 ? 0 : closest === p2 ? 1 : 0.5)) /
            (pathPoints.length - 1),
          position: closest,
        };
      }
    }
  }
  return bestResult;
}

/** Calculate the closest point on a line segment and the distance */
function pointToLineSegmentDistance(
  point: Point,
  p1: Point,
  p2: Point,
): { distance: number; closest: Point } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Segment is a point
    const d = Math.hypot(point.x - p1.x, point.y - p1.y);
    return { distance: d, closest: p1 };
  }

  // Project point onto the line, clamped to segment
  const t = Math.max(
    0,
    Math.min(1, ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSq),
  );
  const closest: Point = {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };

  const distance = Math.hypot(point.x - closest.x, point.y - closest.y);
  return { distance, closest };
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
  radius: number = 28,
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
