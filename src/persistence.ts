import type { EditorState, PlacedComponent, Wire, WireSegment, WireJunction } from "./types";

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
}

type SerializedCircuit = SerializedCircuitV1 | SerializedCircuitV2;

/**
 * Serialize the editor state to a SerializedCircuitV2 object.
 * Strips runtime pin values and creates a clean snapshot for storage/export.
 */
function serializeCircuit(state: EditorState): SerializedCircuitV2 {
  const components = state.components.map((c) => ({
    id: c.id,
    type: c.type,
    position: { ...c.position },
    state: stripPinValues(c.state),
  }));

  return {
    version: 2,
    components,
    wireSegments: state.wireSegments.map((w) => ({ ...w })),
    junctions: state.junctions.map((j) => ({ ...j })),
    _nextId: state._nextId,
    _nextWireId: state._nextWireId,
    _nextJunctionId: state._nextJunctionId,
  };
}

export function saveCircuit(state: EditorState): void {
  const serialized = serializeCircuit(state);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Quota exceeded or other localStorage error — silently ignore
  }
}

export function loadCircuit(): Pick<
  SerializedCircuitV2,
  "components" | "wireSegments" | "junctions" | "_nextId" | "_nextWireId" | "_nextJunctionId"
> | null {
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
 */
function migrateV1toV2(data: SerializedCircuitV1): Pick<
  SerializedCircuitV2,
  "components" | "wireSegments" | "junctions" | "_nextId" | "_nextWireId" | "_nextJunctionId"
> {
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
  }));

  return {
    components: data.components,
    wireSegments,
    junctions: [],
    _nextId: data._nextId,
    _nextWireId: data._nextWireId,
    _nextJunctionId: 0,
  };
}

function stripPinValues(state: Record<string, unknown>): Record<string, unknown> {
  const { pinValues, ...rest } = state;
  return rest;
}

function isValidCircuit(data: unknown): data is SerializedCircuit {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  // Check version is 1 or 2
  if (obj.version !== 1 && obj.version !== 2) return false;

  if (!Array.isArray(obj.components)) return false;
  if (typeof obj._nextId !== "number") return false;
  if (typeof obj._nextWireId !== "number") return false;

  // v1 specific
  if (obj.version === 1) {
    if (!Array.isArray(obj.wires)) return false;
    return true;
  }

  // v2 specific
  if (obj.version === 2) {
    if (!Array.isArray(obj.wireSegments)) return false;
    if (!Array.isArray(obj.junctions)) return false;
    if (typeof obj._nextJunctionId !== "number") return false;
    return true;
  }

  return false;
}

/**
 * Encode a circuit state to a URL-safe Base64 string.
 * Format: SerializedCircuitV2 → JSON → UTF-8 → Base64 URL-safe
 */
export function exportCircuitToBase64(state: EditorState): string {
  const serialized = serializeCircuit(state);
  const json = JSON.stringify(serialized);
  const encoded = btoa(json);
  // Convert to URL-safe Base64: + → -, / → _, remove trailing =
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Decode a URL-safe Base64 string to a circuit data object.
 * Returns null if decoding fails or data is invalid.
 */
export function importCircuitFromBase64(encoded: string): SerializedCircuitV2 | null {
  try {
    // Restore standard Base64 format: add padding back if needed, - → +, _ → /
    const standard = encoded
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      // Add padding
      .padEnd(encoded.length + ((4 - (encoded.length % 4)) % 4), "=");
    
    const json = atob(standard);
    const data = JSON.parse(json);
    
    if (!isValidCircuit(data)) return null;
    if (data.version === 1) {
      const migrated = migrateV1toV2(data);
      return {
        version: 2,
        components: migrated.components,
        wireSegments: migrated.wireSegments,
        junctions: migrated.junctions,
        _nextId: migrated._nextId,
        _nextWireId: migrated._nextWireId,
        _nextJunctionId: migrated._nextJunctionId,
      };
    }
    
    return data as SerializedCircuitV2;
  } catch {
    return null;
  }
}
