import { describe, it, expect, beforeEach, vi } from "vitest";
import { exportCircuitToBase64, importCircuitFromBase64, serializeToBinary, deserializeFromBinary } from "../persistence";
import { generateShareUrl, loadFromUrl } from "../sharing";
import { createEditorState, addComponent, addWire } from "../state";

beforeEach(() => {
  // Mock window.location for tests
  vi.stubGlobal("window", {
    location: {
      origin: "http://localhost:5173",
      pathname: "/",
      search: "",
      href: "http://localhost:5173/",
    },
  });
});

describe("exportCircuitToBase64 / importCircuitFromBase64", () => {
  it("round-trips simple circuit", () => {
    const state = createEditorState();
    addComponent(state, "and-gate", { x: 100, y: 200 });
    addComponent(state, "switch", { x: 10, y: 20 });

    const encoded = exportCircuitToBase64(state);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = importCircuitFromBase64(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.components).toHaveLength(2);
    expect(decoded!.components[0].type).toBe("and-gate");
    expect(decoded!.components[0].position).toEqual({ x: 100, y: 200 });
    expect(decoded!.components[1].type).toBe("switch");
  });

  it("round-trips circuit with wires and junctions", () => {
    const state = createEditorState();
    const comp1 = addComponent(state, "switch", { x: 10, y: 20 });
    const comp2 = addComponent(state, "and-gate", { x: 100, y: 200 });
    addWire(state, { type: "pin", componentId: comp1.id, pinIndex: 0 }, { type: "pin", componentId: comp2.id, pinIndex: 0 });

    const encoded = exportCircuitToBase64(state);
    const decoded = importCircuitFromBase64(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.wireSegments).toHaveLength(1);
    expect(decoded!._nextId).toBe(state._nextId);
    expect(decoded!._nextWireId).toBe(state._nextWireId);
  });

  it("preserves component state", () => {
    const state = createEditorState();
    addComponent(state, "switch", { x: 0, y: 0 });
    state.components[0].state.value = 1;

    const encoded = exportCircuitToBase64(state);
    const decoded = importCircuitFromBase64(encoded);

    expect(decoded!.components[0].state.value).toBe(1);
  });

  it("handles empty circuit", () => {
    const state = createEditorState();
    const encoded = exportCircuitToBase64(state);
    const decoded = importCircuitFromBase64(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.components).toEqual([]);
    expect(decoded!.wireSegments).toEqual([]);
  });

  it("uses URL-safe Base64 encoding (no +/= in output)", () => {
    const state = createEditorState();
    // Create a circuit large enough to potentially generate +, /, or = in standard Base64
    for (let i = 0; i < 10; i++) {
      addComponent(state, "and-gate", { x: i * 100, y: i * 200 });
    }

    const encoded = exportCircuitToBase64(state);
    // Should not contain standard Base64 unsafe chars: +, /, =
    expect(encoded).not.toMatch(/\+/);
    expect(encoded).not.toMatch(/\//);
    expect(encoded).not.toMatch(/=/);
  });

  it("returns null for invalid Base64", () => {
    const result = importCircuitFromBase64("!!!invalid!!!");
    expect(result).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    // Create a valid URL-safe Base64 that decodes to invalid JSON
    const invalidJson = "not json at all";
    const encoded = btoa(invalidJson)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const result = importCircuitFromBase64(encoded);
    expect(result).toBeNull();
  });

  it("returns null for valid JSON but invalid schema", () => {
    const invalidSchema = JSON.stringify({
      version: 2,
      components: [],
      // Missing wireSegments, junctions, _nextJunctionId
      _nextId: 0,
      _nextWireId: 0,
    });
    const encoded = btoa(invalidSchema)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const result = importCircuitFromBase64(encoded);
    expect(result).toBeNull();
  });
});

describe("serializeToBinary / deserializeFromBinary", () => {
  it("round-trips empty circuit", () => {
    const state = createEditorState();
    const bytes = serializeToBinary(state);
    const result = deserializeFromBinary(bytes);
    expect(result).not.toBeNull();
    expect(result!.components).toEqual([]);
    expect(result!.wireSegments).toEqual([]);
    expect(result!.junctions).toEqual([]);
  });

  it("round-trips components with types and positions", () => {
    const state = createEditorState();
    addComponent(state, "and-gate", { x: 100, y: 200 });
    addComponent(state, "switch", { x: 10, y: 20 });
    addComponent(state, "or-gate", { x: 300, y: 400 });
    addComponent(state, "not-gate", { x: 50, y: 60 });
    addComponent(state, "light", { x: 500, y: 600 });

    const bytes = serializeToBinary(state);
    const result = deserializeFromBinary(bytes);

    expect(result).not.toBeNull();
    expect(result!.components).toHaveLength(5);
    expect(result!.components[0]).toMatchObject({ type: "and-gate", position: { x: 100, y: 200 } });
    expect(result!.components[1]).toMatchObject({ type: "switch", position: { x: 10, y: 20 } });
    expect(result!.components[2]).toMatchObject({ type: "or-gate", position: { x: 300, y: 400 } });
    expect(result!.components[3]).toMatchObject({ type: "not-gate", position: { x: 50, y: 60 } });
    expect(result!.components[4]).toMatchObject({ type: "light", position: { x: 500, y: 600 } });
  });

  it("preserves switch value=1 state", () => {
    const state = createEditorState();
    addComponent(state, "switch", { x: 0, y: 0 });
    state.components[0].state.value = 1;

    const bytes = serializeToBinary(state);
    const result = deserializeFromBinary(bytes);

    expect(result!.components[0].state.value).toBe(1);
  });

  it("preserves switch value=0 state", () => {
    const state = createEditorState();
    addComponent(state, "switch", { x: 0, y: 0 });
    state.components[0].state.value = 0;

    const bytes = serializeToBinary(state);
    const result = deserializeFromBinary(bytes);

    expect(result!.components[0].state.value).toBe(0);
  });

  it("round-trips pin-to-pin wire segment", () => {
    const state = createEditorState();
    const sw = addComponent(state, "switch", { x: 10, y: 20 });
    const gate = addComponent(state, "and-gate", { x: 100, y: 200 });
    addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 }, { type: "pin", componentId: gate.id, pinIndex: 0 });

    const bytes = serializeToBinary(state);
    const result = deserializeFromBinary(bytes);

    expect(result!.wireSegments).toHaveLength(1);
    const seg = result!.wireSegments[0];
    expect(seg.from).toMatchObject({ type: "pin", componentId: "comp-0", pinIndex: 0 });
    expect(seg.to).toMatchObject({ type: "pin", componentId: "comp-1", pinIndex: 0 });
  });

  it("round-trips point endpoint", () => {
    const state = createEditorState();
    addComponent(state, "and-gate", { x: 100, y: 200 });
    addWire(state, { type: "point", x: 50, y: 75 }, { type: "pin", componentId: state.components[0].id, pinIndex: 0 });

    const bytes = serializeToBinary(state);
    const result = deserializeFromBinary(bytes);

    const from = result!.wireSegments[0].from;
    expect(from).toMatchObject({ type: "point", x: 50, y: 75 });
  });

  it("round-trips junction endpoint", () => {
    const state = createEditorState();
    state.junctions.push({ id: "junc-0", position: { x: 100, y: 100 } });
    state._nextJunctionId = 1;
    addWire(state, { type: "junction", junctionId: "junc-0" }, { type: "point", x: 200, y: 200 });

    const bytes = serializeToBinary(state);
    const result = deserializeFromBinary(bytes);

    expect(result!.junctions).toHaveLength(1);
    expect(result!.junctions[0]).toMatchObject({ position: { x: 100, y: 100 } });
    const from = result!.wireSegments[0].from;
    expect(from).toMatchObject({ type: "junction", junctionId: "junc-0" });
  });

  it("round-trips counter values", () => {
    const state = createEditorState();
    addComponent(state, "switch", { x: 0, y: 0 });
    addComponent(state, "light", { x: 100, y: 0 });

    const bytes = serializeToBinary(state);
    const result = deserializeFromBinary(bytes);

    expect(result!._nextId).toBe(state._nextId);
    expect(result!._nextWireId).toBe(state._nextWireId);
    expect(result!._nextJunctionId).toBe(state._nextJunctionId);
  });

  it("handles 50+ components (uint16 range)", () => {
    const state = createEditorState();
    for (let i = 0; i < 50; i++) {
      addComponent(state, "and-gate", { x: i * 10, y: i * 10 });
    }

    const bytes = serializeToBinary(state);
    const result = deserializeFromBinary(bytes);

    expect(result!.components).toHaveLength(50);
    expect(result!.components[49].position).toEqual({ x: 490, y: 490 });
  });

  it("returns null for wrong format version", () => {
    const bytes = new Uint8Array([0x7b, 0, 0]); // starts with { (JSON byte)
    expect(deserializeFromBinary(bytes)).toBeNull();
  });
});

describe("exportCircuitToBase64 / importCircuitFromBase64 (binary+deflate)", () => {
  it("new format: round-trips simple circuit", () => {
    const state = createEditorState();
    addComponent(state, "and-gate", { x: 100, y: 200 });
    addComponent(state, "switch", { x: 10, y: 20 });

    const encoded = exportCircuitToBase64(state);
    const decoded = importCircuitFromBase64(encoded);

    expect(decoded).not.toBeNull();
    expect(decoded!.components).toHaveLength(2);
    expect(decoded!.components[0].type).toBe("and-gate");
    expect(decoded!.components[1].type).toBe("switch");
  });

  it("new format: URL is URL-safe (no +/=/)", () => {
    const state = createEditorState();
    for (let i = 0; i < 10; i++) {
      addComponent(state, "and-gate", { x: i * 100, y: i * 200 });
    }

    const encoded = exportCircuitToBase64(state);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("new format: URL for 10 comp + 10 wires is < 300 chars", () => {
    const state = createEditorState();
    for (let i = 0; i < 10; i++) {
      addComponent(state, "and-gate", { x: i * 100, y: 100 });
    }
    for (let i = 0; i < 10; i++) {
      addWire(
        state,
        { type: "point", x: i * 10, y: 0 },
        { type: "pin", componentId: state.components[i].id, pinIndex: 0 },
      );
    }

    const encoded = exportCircuitToBase64(state);
    expect(encoded.length).toBeLessThan(300);
  });

  it("backward compat: decodes legacy JSON/Base64 URLs", () => {
    // Simulate an old-format URL: JSON → Base64 URL-safe
    const legacyCircuit = {
      version: 2,
      components: [{ id: "comp-0", type: "and-gate", position: { x: 100, y: 200 }, state: {} }],
      wireSegments: [],
      junctions: [],
      _nextId: 1,
      _nextWireId: 0,
      _nextJunctionId: 0,
    };
    const json = JSON.stringify(legacyCircuit);
    // Encode as UTF-8 bytes then Base64 URL-safe (old format)
    const legacyEncoded = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    const decoded = importCircuitFromBase64(legacyEncoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.components).toHaveLength(1);
    expect(decoded!.components[0].type).toBe("and-gate");
  });
});

describe("generateShareUrl", () => {
  it("generates a URL with circuit encoded as query param", () => {
    const state = createEditorState();
    addComponent(state, "and-gate", { x: 100, y: 200 });

    const url = generateShareUrl(state);
    expect(url).toContain("?c=");
    expect(url).toContain(window.location.origin);
  });

  it("encodes the full circuit in URL", () => {
    const state = createEditorState();
    addComponent(state, "switch", { x: 10, y: 20 });

    const url = generateShareUrl(state);
    const params = new URLSearchParams(url.split("?")[1]);
    const encoded = params.get("c");

    expect(encoded).not.toBeNull();
    const decoded = importCircuitFromBase64(encoded!);
    expect(decoded).not.toBeNull();
    expect(decoded!.components).toHaveLength(1);
  });

  it("generates URL-safe URLs (no problematic characters)", () => {
    const state = createEditorState();
    for (let i = 0; i < 5; i++) {
      addComponent(state, "and-gate", { x: i * 100, y: i * 200 });
    }

    const url = generateShareUrl(state);
    // Should be a valid URL that doesn't throw when creating URLSearchParams
    expect(() => new URL(url)).not.toThrow();
  });
});

describe("loadFromUrl", () => {
  it("returns null when no query param", () => {
    const result = loadFromUrl();
    // In test environment, window.location.search is typically empty
    expect(result).toBeNull();
  });
});
