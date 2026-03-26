import type {
  EditorState,
  PlacedComponent,
  Viewport,
  Wire,
  WireJunction,
  WireSegment,
} from "@/core/types";

const STORAGE_KEY = "circuit";

/** v1 format for backward compatibility */
interface SerializedCircuitV1 {
  version: 1;
  components: PlacedComponent[];
  wires: Wire[];
  _nextId: number;
  _nextWireId: number;
}

/** v2 format with new wire segment and junction model */
export interface SerializedCircuitV2 {
  version: 2;
  components: PlacedComponent[];
  wireSegments: WireSegment[];
  junctions: WireJunction[];
  _nextId: number;
  _nextWireId: number;
  _nextJunctionId: number;
  viewport?: Viewport;
}

/** v3 format with viewport persistence */
export interface SerializedCircuitV3 {
  version: 3;
  components: PlacedComponent[];
  wireSegments: WireSegment[];
  junctions: WireJunction[];
  _nextId: number;
  _nextWireId: number;
  _nextJunctionId: number;
  viewport: Viewport;
}

type SerializedCircuit = SerializedCircuitV1 | SerializedCircuitV2 | SerializedCircuitV3;

/**
 * Serialize the editor state to a SerializedCircuitV3 object.
 * Strips runtime pin values and creates a clean snapshot for storage/export.
 * Includes the current viewport state for persistence.
 */
function serializeCircuit(state: EditorState): SerializedCircuitV3 {
  const components = state.components.map((c) => ({
    id: c.id,
    type: c.type,
    position: { ...c.position },
    state: stripPinValues(c.state),
  }));

  const serialized: SerializedCircuitV3 = {
    version: 3,
    components,
    wireSegments: state.wireSegments.map((w) => ({ ...w })),
    junctions: state.junctions.map((j) => ({ ...j })),
    _nextId: state._nextId,
    _nextWireId: state._nextWireId,
    _nextJunctionId: state._nextJunctionId,
    viewport: { ...state.viewport },
  };

  return serialized;
}

export function saveCircuit(state: EditorState): void {
  const serialized = serializeCircuit(state);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Quota exceeded or other localStorage error — silently ignore
  }
}

export function loadCircuit(): (Pick<
  SerializedCircuitV2,
  | "components"
  | "wireSegments"
  | "junctions"
  | "_nextId"
  | "_nextWireId"
  | "_nextJunctionId"
> & { viewport?: Viewport }) | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!isValidCircuit(data)) return null;

    // Handle migration from v1 to v2
    if (data.version === 1) {
      return migrateV1toV2(data);
    }

    if (data.version === 2) {
      return {
        components: data.components,
        wireSegments: data.wireSegments,
        junctions: data.junctions,
        _nextId: data._nextId,
        _nextWireId: data._nextWireId,
        _nextJunctionId: data._nextJunctionId,
        viewport: data.viewport,
      };
    }

    if (data.version === 3) {
      return {
        components: data.components,
        wireSegments: data.wireSegments,
        junctions: data.junctions,
        _nextId: data._nextId,
        _nextWireId: data._nextWireId,
        _nextJunctionId: data._nextJunctionId,
        viewport: data.viewport,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Migrate circuit data from v1 to v2 format.
 * Converts old Wire[] (point-to-point) to WireSegment[] (flexible endpoints).
 * v2 load will not have waypoints, defaulting to undefined (direct segment).
 * Returns v2 data with default viewport (no viewport in v1).
 */
export function migrateV1toV2(
  data: SerializedCircuitV1,
): Pick<
  SerializedCircuitV2,
  | "components"
  | "wireSegments"
  | "junctions"
  | "_nextId"
  | "_nextWireId"
  | "_nextJunctionId"
> & { viewport?: Viewport } {
  // Convert old wires to new wire segments
  const wireSegments: WireSegment[] = data.wires.map((oldWire) => ({
    id: oldWire.id,
    from: {
      type: "pin" as const,
      componentId: oldWire.fromComponentId,
      pinIndex: oldWire.fromPinIndex,
    },
    to: {
      type: "pin" as const,
      componentId: oldWire.toComponentId,
      pinIndex: oldWire.toPinIndex,
    },
    // waypoints not present in v1, defaults to undefined
  }));

  return {
    components: data.components,
    wireSegments,
    junctions: [],
    _nextId: data._nextId,
    _nextWireId: data._nextWireId,
    _nextJunctionId: 0,
    // v1 has no viewport, so it's undefined (will use default in main.ts)
  };
}

function stripPinValues(
  state: Record<string, unknown>,
): Record<string, unknown> {
  const { pinValues, ...rest } = state;
  return rest;
}

export function isValidCircuit(data: unknown): data is SerializedCircuit {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  // Check version is 1, 2, or 3
  if (obj.version !== 1 && obj.version !== 2 && obj.version !== 3) return false;

  if (!Array.isArray(obj.components)) return false;
  if (typeof obj._nextId !== "number") return false;
  if (typeof obj._nextWireId !== "number") return false;

  // v1 specific
  if (obj.version === 1) {
    if (!Array.isArray(obj.wires)) return false;
    return true;
  }

  // v2 and v3 specific
  if (obj.version === 2 || obj.version === 3) {
    if (!Array.isArray(obj.wireSegments)) return false;
    if (!Array.isArray(obj.junctions)) return false;
    if (typeof obj._nextJunctionId !== "number") return false;
    
    // v3 requires viewport, v2 makes it optional
    if (obj.version === 3) {
      if (!obj.viewport || typeof obj.viewport !== "object") return false;
      const vp = obj.viewport as Record<string, unknown>;
      if (typeof vp.panX !== "number" || typeof vp.panY !== "number" || typeof vp.zoom !== "number") {
        return false;
      }
    }
    
    return true;
  }

  return false;
}
