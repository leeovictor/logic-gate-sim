import { describe, expect, it } from "vitest";
import { addComponent, createEditorState, screenToWorld } from "@/state";
import {
  deserializeFromBinary,
  exportCircuitToBase64,
  importCircuitFromBase64,
  serializeToBinary,
} from "@/storage/binary-format";

describe("Viewport with loaded circuits", () => {
  it("preserves viewport when loading circuit data", () => {
    const state = createEditorState();

    // Simulate loading circuit data (no viewport in loaded data)
    state.components = [];
    state.wireSegments = [];
    state.junctions = [];

    // Viewport should still be intact
    expect(state.viewport).toBeDefined();
    expect(state.viewport).toEqual({ panX: 0, panY: 0, zoom: 1 });
  });

  it("screenToWorld works with loaded circuits", () => {
    const state = createEditorState();

    // Simulate loading shared circuit
    state.components = [];
    state.wireSegments = [];

    // Verify we can still convert coordinates
    const screenPoint = { x: 100, y: 200 };
    const world = screenToWorld(screenPoint, state.viewport);

    expect(world).toEqual({ x: 100, y: 200 });
  });

  it("renders correctly after loading", () => {
    const state = createEditorState();

    // Simulate circuit loaded from URL
    state.components = [];
    state.wireSegments = [];
    state.junctions = [];
    state._nextId = 0;
    state._nextWireId = 0;
    state._nextJunctionId = 0;

    // Check that all necessary properties exist
    expect(state.viewport).toBeDefined();
    expect(state.viewport.panX).toBe(0);
    expect(state.viewport.panY).toBe(0);
    expect(state.viewport.zoom).toBe(1);
    expect(state.panning).toBe(false);
  });

  it("binary v7 round-trips viewport in Base64", () => {
    const state = createEditorState();
    addComponent(state, "and-gate", { x: 100, y: 200 });
    state.viewport = { panX: 50, panY: -100, zoom: 2.5 };

    const encoded = exportCircuitToBase64(state);
    const decoded = importCircuitFromBase64(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded?.viewport).toEqual({ panX: 50, panY: -100, zoom: 2.5 });
  });

  it("binary v7 preserves viewport with negative coordinates", () => {
    const state = createEditorState();
    addComponent(state, "switch", { x: -50, y: -200 });
    state.viewport = { panX: -100.5, panY: 75.25, zoom: 0.5 };

    const encoded = exportCircuitToBase64(state);
    const decoded = importCircuitFromBase64(encoded);

    expect(decoded?.viewport?.panX).toBeCloseTo(-100.5, 4);
    expect(decoded?.viewport?.panY).toBeCloseTo(75.25, 4);
    expect(decoded?.viewport?.zoom).toBeCloseTo(0.5, 4);
  });

  it("binary v6 (old format) returns undefined viewport", () => {
    const state = createEditorState();
    addComponent(state, "and-gate", { x: 100, y: 200 });

    // Serialize as v6 (manually setting version to 6 for testing)
    const binary = serializeToBinary(state);
    // Change first byte from 7 to 6
    binary[0] = 6;
    // Trim the last 12 bytes (viewport data)
    const v6Binary = binary.slice(0, binary.length - 12);

    const decoded = deserializeFromBinary(v6Binary);
    expect(decoded).not.toBeNull();
    expect(decoded?.components).toHaveLength(1);
    expect(decoded?.viewport).toBeUndefined();
  });
});
