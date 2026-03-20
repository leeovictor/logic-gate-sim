import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveCircuit, loadCircuit } from "@/storage/persistence";
import { createEditorState, addComponent, addWire, addWireSegment } from "@/state";

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
      { type: "pin", componentId: "comp-1", pinIndex: 0 },
      { type: "pin", componentId: "comp-0", pinIndex: 0 },
    );

    saveCircuit(state);
    const loaded = loadCircuit();

    expect(loaded).not.toBeNull();
    expect(loaded!.components).toHaveLength(2);
    expect(loaded!.components[0].type).toBe("and-gate");
    expect(loaded!.components[0].position).toEqual({ x: 100, y: 200 });
    expect(loaded!.wireSegments).toHaveLength(1);
    expect((loaded!.wireSegments[0].from as any).componentId).toBe("comp-1");
    expect((loaded!.wireSegments[0].to as any).componentId).toBe("comp-0");
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
    expect(loaded!.wireSegments).toEqual([]);
    expect(loaded!.junctions).toEqual([]);
    expect(loaded!._nextId).toBe(0);
    expect(loaded!._nextWireId).toBe(0);
    expect(loaded!._nextJunctionId).toBe(0);
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

  it("migrates v1 circuit to v2 (old wires to wireSegments)", () => {
    // V1 format with old Wire structure
    storageMock["circuit"] = JSON.stringify({
      version: 1,
      components: [
        { id: "comp-0", type: "switch", position: { x: 0, y: 0 }, state: { value: 0 } },
        { id: "comp-1", type: "light", position: { x: 100, y: 0 }, state: { value: 0 } },
      ],
      wires: [
        { id: "wire-0", from: { type: "pin", componentId: "comp-0", pinIndex: 0 }, to: { type: "pin", componentId: "comp-1", pinIndex: 0 } },
      ],
      _nextId: 2,
      _nextWireId: 1,
    });

    const loaded = loadCircuit();
    expect(loaded).not.toBeNull();
    expect(loaded!.components).toHaveLength(2);
    expect(loaded!.wireSegments).toHaveLength(1);
    expect(loaded!._nextWireId).toBe(1);
  });

  it("handles v2 circuit with wireSegments and junctions", () => {
    storageMock["circuit"] = JSON.stringify({
      version: 2,
      components: [
        { id: "comp-0", type: "and-gate", position: { x: 0, y: 0 }, state: { pinValues: undefined } },
      ],
      wireSegments: [
        { id: "wire-0", from: { type: "pin", componentId: "comp-0", pinIndex: 0 }, to: { type: "point", x: 50, y: 50 } },
      ],
      junctions: [
        { id: "junc-0", position: { x: 100, y: 100 } },
      ],
      _nextId: 1,
      _nextWireId: 1,
      _nextJunctionId: 1,
    });

    const loaded = loadCircuit();
    expect(loaded).not.toBeNull();
    expect(loaded!.wireSegments).toHaveLength(1);
    expect(loaded!.junctions).toHaveLength(1);
    expect((loaded!.wireSegments[0].to as any).x).toBe(50);
  });

  it("round-trips wires with waypoints", () => {
    const state = createEditorState();
    addComponent(state, "and-gate", { x: 0, y: 0 });
    addComponent(state, "switch", { x: 200, y: 0 });
    const waypoints = [{ x: 50, y: 50 }, { x: 150, y: 100 }];
    addWireSegment(
      state,
      { type: "pin", componentId: "comp-0", pinIndex: 2 },
      { type: "pin", componentId: "comp-1", pinIndex: 0 },
      waypoints,
    );

    saveCircuit(state);
    const loaded = loadCircuit();

    expect(loaded).not.toBeNull();
    expect(loaded!.wireSegments).toHaveLength(1);
    expect(loaded!.wireSegments[0].waypoints).toEqual(waypoints);
  });

  it("v2 circuit without waypoints loads with undefined waypoints", () => {
    storageMock["circuit"] = JSON.stringify({
      version: 2,
      components: [
        { id: "comp-0", type: "switch", position: { x: 0, y: 0 }, state: { value: 0 } },
        { id: "comp-1", type: "light", position: { x: 100, y: 0 }, state: { value: 0 } },
      ],
      wireSegments: [
        { id: "wire-0", from: { type: "pin", componentId: "comp-0", pinIndex: 0 }, to: { type: "pin", componentId: "comp-1", pinIndex: 0 } },
      ],
      junctions: [],
      _nextId: 2,
      _nextWireId: 1,
      _nextJunctionId: 0,
    });

    const loaded = loadCircuit();
    expect(loaded).not.toBeNull();
    expect(loaded!.wireSegments[0].waypoints).toBeUndefined();
  });
});
