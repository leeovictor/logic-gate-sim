import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveCircuit, loadCircuit } from "../persistence";
import { createEditorState, addComponent, addWire } from "../state";

const storageMock: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(storageMock)) delete storageMock[key];

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, value: string) => {
      storageMock[key] = value;
    },
    removeItem: (key: string) => {
      delete storageMock[key];
    },
  });
});

describe("saveCircuit / loadCircuit", () => {
  it("round-trips components and wires", () => {
    const state = createEditorState();
    addComponent(state, "and-gate", { x: 100, y: 200 });
    addComponent(state, "switch", { x: 10, y: 20 });
    addWire(
      state,
      { componentId: "comp-1", pinIndex: 0 },
      { componentId: "comp-0", pinIndex: 0 },
    );

    saveCircuit(state);
    const loaded = loadCircuit();

    expect(loaded).not.toBeNull();
    expect(loaded!.components).toHaveLength(2);
    expect(loaded!.components[0].type).toBe("and-gate");
    expect(loaded!.components[0].position).toEqual({ x: 100, y: 200 });
    expect(loaded!.wires).toHaveLength(1);
    expect(loaded!.wires[0].fromComponentId).toBe("comp-1");
    expect(loaded!.wires[0].toComponentId).toBe("comp-0");
  });

  it("preserves ID counters", () => {
    const state = createEditorState();
    addComponent(state, "and-gate", { x: 0, y: 0 });
    addComponent(state, "light", { x: 50, y: 50 });

    saveCircuit(state);
    const loaded = loadCircuit();

    expect(loaded!._nextId).toBe(2);
    expect(loaded!._nextWireId).toBe(0);
  });

  it("strips pinValues from component state", () => {
    const state = createEditorState();
    addComponent(state, "switch", { x: 0, y: 0 });
    state.components[0].state.pinValues = [0, 1];
    state.components[0].state.value = 1;

    saveCircuit(state);
    const loaded = loadCircuit();

    expect(loaded!.components[0].state).toEqual({ value: 1 });
    expect(loaded!.components[0].state).not.toHaveProperty("pinValues");
  });

  it("round-trips empty circuit", () => {
    const state = createEditorState();
    saveCircuit(state);
    const loaded = loadCircuit();

    expect(loaded).not.toBeNull();
    expect(loaded!.components).toEqual([]);
    expect(loaded!.wires).toEqual([]);
    expect(loaded!._nextId).toBe(0);
    expect(loaded!._nextWireId).toBe(0);
  });

  it("returns null when localStorage is empty", () => {
    expect(loadCircuit()).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    storageMock["circuit"] = "not-valid-json{{{";
    expect(loadCircuit()).toBeNull();
  });

  it("returns null for invalid structure (missing version)", () => {
    storageMock["circuit"] = JSON.stringify({
      components: [],
      wires: [],
      _nextId: 0,
      _nextWireId: 0,
    });
    expect(loadCircuit()).toBeNull();
  });

  it("returns null for invalid structure (wrong version)", () => {
    storageMock["circuit"] = JSON.stringify({
      version: 99,
      components: [],
      wires: [],
      _nextId: 0,
      _nextWireId: 0,
    });
    expect(loadCircuit()).toBeNull();
  });

  it("returns null when components is not an array", () => {
    storageMock["circuit"] = JSON.stringify({
      version: 1,
      components: "bad",
      wires: [],
      _nextId: 0,
      _nextWireId: 0,
    });
    expect(loadCircuit()).toBeNull();
  });
});
