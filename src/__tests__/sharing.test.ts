import { describe, it, expect, beforeEach, vi } from "vitest";
import { exportCircuitToBase64, importCircuitFromBase64 } from "../persistence";
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
