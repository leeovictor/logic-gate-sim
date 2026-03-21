import { deflateSync, inflateSync } from "fflate";
import type { ComponentType, EditorState, PlacedComponent, WireSegment, WireJunction } from "@/core/types";
import type { SerializedCircuitV2 } from "./persistence";
import { isValidCircuit, migrateV1toV2 } from "./persistence";

// Ordered array for ComponentType ↔ byte enum mapping (index = byte value)
// IMPORTANT: only append new types at the end to preserve backward compatibility
const COMPONENT_TYPES: ComponentType[] = ["and-gate", "or-gate", "not-gate", "switch", "light", "nand-gate", "nor-gate", "xor-gate", "xnor-gate"];

const FORMAT_VERSION = 5;

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
 * Serialize EditorState to compact binary format (v4).
 * v4 adds waypoint support to wire segments.
 */
export function serializeToBinary(state: EditorState): Uint8Array {
  const componentIds = state.components.map((c) => c.id);
  const junctionIds = state.junctions.map((j) => j.id);

  // Calculate total size
  let size = 14; // header + simulationMode byte
  size += state.components.length * 6;
  for (const w of state.wireSegments) {
    size += wireEndpointSize(w.from) + wireEndpointSize(w.to);
    // Add waypoint count (1 byte) + waypoints (4 bytes each = 2 int16 for x,y)
    size += 1; // waypoint count
    if (w.waypoints && w.waypoints.length > 0) {
      size += w.waypoints.length * 4;
    }
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

  // Wire segments (v4: includes waypoints)
  for (const w of state.wireSegments) {
    offset = writeWireEndpoint(view, offset, w.from, componentIds, junctionIds);
    offset = writeWireEndpoint(view, offset, w.to, componentIds, junctionIds);
    
    // Write waypoint count
    const waypointCount = w.waypoints ? w.waypoints.length : 0;
    view.setUint8(offset, waypointCount); offset++;
    
    // Write waypoints
    if (w.waypoints && w.waypoints.length > 0) {
      for (const wp of w.waypoints) {
        view.setInt16(offset, wp.x, true); offset += 2;
        view.setInt16(offset, wp.y, true); offset += 2;
      }
    }
  }

  // Junctions
  for (const j of state.junctions) {
    view.setUint16(offset, j.position.x, true); offset += 2;
    view.setUint16(offset, j.position.y, true); offset += 2;
  }

  // Simulation mode (1 byte: 0x00 = instant, 0x01 = step)
  view.setUint8(offset, state.simulationMode === "step" ? 1 : 0); offset++;

  return new Uint8Array(buffer);
}

/**
 * Deserialize binary format (v3 or v4) to SerializedCircuitV2.
 * v3: no waypoints
 * v4: includes waypoints in wire segments
 */
export function deserializeFromBinary(bytes: Uint8Array): SerializedCircuitV2 | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 0;

    const version = view.getUint8(offset);
    if (version !== 3 && version !== 4 && version !== 5) return null;
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
      
      let waypoints: undefined | any[] = undefined;
      
      // v4+: read waypoints
      if (version >= 4) {
        const waypointCount = view.getUint8(offset); offset++;
        if (waypointCount > 0) {
          waypoints = [];
          for (let j = 0; j < waypointCount; j++) {
            const x = view.getInt16(offset, true); offset += 2;
            const y = view.getInt16(offset, true); offset += 2;
            waypoints.push({ x, y });
          }
        }
      }
      
      wireSegments.push({
        id: `wire-${i}`,
        from: fromResult.ep,
        to: toResult.ep,
        waypoints,
      });
    }

    const junctions: WireJunction[] = [];
    for (let i = 0; i < junctionCount; i++) {
      const x = view.getUint16(offset, true); offset += 2;
      const y = view.getUint16(offset, true); offset += 2;
      junctions.push({ id: `junc-${i}`, position: { x, y } });
    }

    // Simulation mode (1 byte: optional for backward-compat)
    let simulationMode: "instant" | "step" | undefined;
    if (offset < view.byteLength) {
      const modeFlag = view.getUint8(offset);
      simulationMode = modeFlag === 1 ? "step" : "instant";
    }

    const deserialized: SerializedCircuitV2 = {
      version: 2,
      components,
      wireSegments,
      junctions,
      _nextId: nextId,
      _nextWireId: nextWireId,
      _nextJunctionId: nextJunctionId,
    };

    if (simulationMode) {
      deserialized.simulationMode = simulationMode;
    }

    return deserialized;
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

    // Supported binary format versions
    const isSupportedVersion = (v: number) => v >= 3 && v <= FORMAT_VERSION;

    // Try new format: deflate-compressed binary
    const decompressed = decompressBytes(bytes);
    if (decompressed !== null && isSupportedVersion(decompressed[0])) {
      return deserializeFromBinary(decompressed);
    }

    // Try raw binary (uncompressed)
    if (isSupportedVersion(bytes[0])) {
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
