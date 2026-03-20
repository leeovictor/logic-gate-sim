import { deflateSync, inflateSync } from "fflate";
import type { ComponentType, EditorState, PlacedComponent, Wire, WireSegment, WireJunction } from "@/core/types";

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

// Ordered array for ComponentType ↔ byte enum mapping (index = byte value)
const COMPONENT_TYPES: ComponentType[] = ["and-gate", "or-gate", "not-gate", "switch", "light"];

const FORMAT_VERSION = 3;

// ---- Base64 URL-safe helpers ----

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlToUint8Array(str: string): Uint8Array {
  const standard = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const binary = atob(standard);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ---- Compression helpers ----

function compressBytes(data: Uint8Array): Uint8Array {
  return deflateSync(data, { level: 6 });
}

function decompressBytes(data: Uint8Array): Uint8Array | null {
  try {
    return inflateSync(data);
  } catch {
    return null;
  }
}

// ---- Binary serialization helpers ----

/** Calculate the byte size of a WireEndpoint */
function wireEndpointSize(ep: WireSegment["from"]): number {
  if (ep.type === "pin") return 4;     // tag(1) + componentIndex(2) + pinIndex(1)
  if (ep.type === "point") return 5;   // tag(1) + x(2) + y(2)
  return 3;                            // tag(1) + junctionIndex(2)
}

function writeWireEndpoint(view: DataView, offset: number, ep: WireSegment["from"], componentIds: string[], junctionIds: string[]): number {
  if (ep.type === "pin") {
    const idx = componentIds.indexOf(ep.componentId);
    view.setUint8(offset, 0); offset++;
    view.setUint16(offset, idx, true); offset += 2;
    view.setUint8(offset, ep.pinIndex); offset++;
  } else if (ep.type === "point") {
    view.setUint8(offset, 1); offset++;
    view.setUint16(offset, ep.x, true); offset += 2;
    view.setUint16(offset, ep.y, true); offset += 2;
  } else {
    // junction
    const idx = junctionIds.indexOf(ep.junctionId);
    view.setUint8(offset, 2); offset++;
    view.setUint16(offset, idx, true); offset += 2;
  }
  return offset;
}

function readWireEndpoint(view: DataView, offset: number): { ep: WireSegment["from"]; offset: number } {
  const tag = view.getUint8(offset); offset++;
  if (tag === 0) {
    const compIndex = view.getUint16(offset, true); offset += 2;
    const pinIndex = view.getUint8(offset); offset++;
    return { ep: { type: "pin", componentId: `comp-${compIndex}`, pinIndex }, offset };
  } else if (tag === 1) {
    const x = view.getUint16(offset, true); offset += 2;
    const y = view.getUint16(offset, true); offset += 2;
    return { ep: { type: "point", x, y }, offset };
  } else {
    const juncIndex = view.getUint16(offset, true); offset += 2;
    return { ep: { type: "junction", junctionId: `junc-${juncIndex}` }, offset };
  }
}

/**
 * Serialize EditorState to compact binary format (v3).
 */
export function serializeToBinary(state: EditorState): Uint8Array {
  const componentIds = state.components.map((c) => c.id);
  const junctionIds = state.junctions.map((j) => j.id);

  // Calculate total size
  let size = 13; // header
  size += state.components.length * 6;
  for (const w of state.wireSegments) {
    size += wireEndpointSize(w.from) + wireEndpointSize(w.to);
  }
  size += state.junctions.length * 4;

  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  let offset = 0;

  // Header
  view.setUint8(offset, FORMAT_VERSION); offset++;
  view.setUint16(offset, state.components.length, true); offset += 2;
  view.setUint16(offset, state.wireSegments.length, true); offset += 2;
  view.setUint16(offset, state.junctions.length, true); offset += 2;
  view.setUint16(offset, state._nextId, true); offset += 2;
  view.setUint16(offset, state._nextWireId, true); offset += 2;
  view.setUint16(offset, state._nextJunctionId, true); offset += 2;

  // Components
  for (const comp of state.components) {
    const typeEnum = COMPONENT_TYPES.indexOf(comp.type);
    view.setUint8(offset, typeEnum); offset++;
    view.setUint16(offset, comp.position.x, true); offset += 2;
    view.setUint16(offset, comp.position.y, true); offset += 2;
    const stateFlags = comp.state.value ? 1 : 0;
    view.setUint8(offset, stateFlags); offset++;
  }

  // Wire segments
  for (const w of state.wireSegments) {
    offset = writeWireEndpoint(view, offset, w.from, componentIds, junctionIds);
    offset = writeWireEndpoint(view, offset, w.to, componentIds, junctionIds);
  }

  // Junctions
  for (const j of state.junctions) {
    view.setUint16(offset, j.position.x, true); offset += 2;
    view.setUint16(offset, j.position.y, true); offset += 2;
  }

  return new Uint8Array(buffer);
}

/**
 * Deserialize binary format (v3) to SerializedCircuitV2.
 */
export function deserializeFromBinary(bytes: Uint8Array): SerializedCircuitV2 | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;

    if (view.getUint8(offset) !== FORMAT_VERSION) return null;
    offset++;

    const componentCount = view.getUint16(offset, true); offset += 2;
    const wireCount = view.getUint16(offset, true); offset += 2;
    const junctionCount = view.getUint16(offset, true); offset += 2;
    const nextId = view.getUint16(offset, true); offset += 2;
    const nextWireId = view.getUint16(offset, true); offset += 2;
    const nextJunctionId = view.getUint16(offset, true); offset += 2;

    const components: PlacedComponent[] = [];
    for (let i = 0; i < componentCount; i++) {
      const typeEnum = view.getUint8(offset); offset++;
      const x = view.getUint16(offset, true); offset += 2;
      const y = view.getUint16(offset, true); offset += 2;
      const stateFlags = view.getUint8(offset); offset++;
      const type = COMPONENT_TYPES[typeEnum];
      if (!type) return null;
      const state: Record<string, unknown> = {};
      if (type === "switch") state.value = stateFlags & 1;
      components.push({ id: `comp-${i}`, type, position: { x, y }, state });
    }

    const wireSegments: WireSegment[] = [];
    for (let i = 0; i < wireCount; i++) {
      const fromResult = readWireEndpoint(view, offset);
      offset = fromResult.offset;
      const toResult = readWireEndpoint(view, offset);
      offset = toResult.offset;
      wireSegments.push({ id: `wire-${i}`, from: fromResult.ep, to: toResult.ep });
    }

    const junctions: WireJunction[] = [];
    for (let i = 0; i < junctionCount; i++) {
      const x = view.getUint16(offset, true); offset += 2;
      const y = view.getUint16(offset, true); offset += 2;
      junctions.push({ id: `junc-${i}`, position: { x, y } });
    }

    return { version: 2, components, wireSegments, junctions, _nextId: nextId, _nextWireId: nextWireId, _nextJunctionId: nextJunctionId };
  } catch {
    return null;
  }
}

/**
 * Encode a circuit state to a URL-safe Base64 string.
 * Format: EditorState → binary (v3) → deflate → Base64 URL-safe
 */
export function exportCircuitToBase64(state: EditorState): string {
  const binary = serializeToBinary(state);
  const compressed = compressBytes(binary);
  return uint8ArrayToBase64Url(compressed);
}

/**
 * Decode a URL-safe Base64 string to a circuit data object.
 * Supports new binary+deflate format, raw binary, and legacy JSON format.
 * Returns null if decoding fails or data is invalid.
 */
export function importCircuitFromBase64(encoded: string): SerializedCircuitV2 | null {
  try {
    const bytes = base64UrlToUint8Array(encoded);

    // Try new format: deflate-compressed binary
    const decompressed = decompressBytes(bytes);
    if (decompressed !== null && decompressed[0] === FORMAT_VERSION) {
      return deserializeFromBinary(decompressed);
    }

    // Try raw binary (uncompressed)
    if (bytes[0] === FORMAT_VERSION) {
      return deserializeFromBinary(bytes);
    }

    // Fallback: legacy JSON format
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (!isValidCircuit(data)) return null;
    if (data.version === 1) {
      const migrated = migrateV1toV2(data);
      return { version: 2, ...migrated };
    }
    return data as SerializedCircuitV2;
  } catch {
    return null;
  }
}
