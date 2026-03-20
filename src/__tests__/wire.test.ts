import { describe, it, expect } from "vitest";
import {
  createEditorState,
  addComponent,
  addWire,
  removeWiresForComponent,
  setPendingWire,
  clearPendingWire,
  deleteSelected,
  selectComponent,
} from "../state";
import { getPinPosition, hitTestPin } from "../renderer";

// Helper: create state with two AND gates
function stateWithTwoGates() {
  const state = createEditorState();
  const a = addComponent(state, "and-gate", { x: 0, y: 0 });
  const b = addComponent(state, "and-gate", { x: 200, y: 0 });
  return { state, a, b };
}

describe("addWire", () => {
  it("cria wire com id único entre output e input de componentes diferentes", () => {
    const { state, a, b } = stateWithTwoGates();
    const wire = addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 }, // output
      { type: "pin", componentId: b.id, pinIndex: 0 }, // input
    );
    expect(wire).not.toBeNull();
    expect(wire!.id).toBeDefined();
    expect(wire!.from.type).toBe("pin");
    expect((wire!.from as any).componentId).toBe(a.id);
    expect((wire!.from as any).pinIndex).toBe(2);
    expect(wire!.to.type).toBe("pin");
    expect((wire!.to as any).componentId).toBe(b.id);
    expect((wire!.to as any).pinIndex).toBe(0);
    expect(state.wireSegments).toHaveLength(1);
  });

  it("gera ids únicos para wires diferentes", () => {
    const { state, a, b } = stateWithTwoGates();
    const w1 = addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 },
      { type: "pin", componentId: b.id, pinIndex: 0 },
    );
    const w2 = addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 },
      { type: "pin", componentId: b.id, pinIndex: 1 },
    );
    expect(w1!.id).not.toBe(w2!.id);
  });

  it("rejeita wire entre dois pins do mesmo componente", () => {
    const { state, a } = stateWithTwoGates();
    const wire = addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 },
      { type: "pin", componentId: a.id, pinIndex: 0 },
    );
    expect(wire).toBeNull();
    expect(state.wireSegments).toHaveLength(0);
  });

  it("permite wire entre dois outputs (sem restrição de direção)", () => {
    const { state, a, b } = stateWithTwoGates();
    const wire = addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 }, // output
      { type: "pin", componentId: b.id, pinIndex: 2 }, // output
    );
    expect(wire).not.toBeNull();
  });

  it("permite wire entre dois inputs (sem restrição de direção)", () => {
    const { state, a, b } = stateWithTwoGates();
    const wire = addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 0 }, // input
      { type: "pin", componentId: b.id, pinIndex: 0 }, // input
    );
    expect(wire).not.toBeNull();
  });

  it("rejeita wire duplicado (mesmos from/to)", () => {
    const { state, a, b } = stateWithTwoGates();
    addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 },
      { type: "pin", componentId: b.id, pinIndex: 0 },
    );
    const dup = addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 },
      { type: "pin", componentId: b.id, pinIndex: 0 },
    );
    expect(dup).toBeNull();
    expect(state.wireSegments).toHaveLength(1);
  });
});

describe("removeWiresForComponent", () => {
  it("remove todos os wires conectados a um componente (from e to)", () => {
    const { state, a, b } = stateWithTwoGates();
    const c = addComponent(state, "and-gate", { x: 400, y: 0 });
    addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 },
      { type: "pin", componentId: b.id, pinIndex: 0 },
    );
    addWire(
      state,
      { type: "pin", componentId: b.id, pinIndex: 2 },
      { type: "pin", componentId: c.id, pinIndex: 0 },
    );
    expect(state.wireSegments).toHaveLength(2);

    removeWiresForComponent(state, b.id);
    expect(state.wireSegments).toHaveLength(0);
  });

  it("não remove wires de outros componentes", () => {
    const { state, a, b } = stateWithTwoGates();
    const c = addComponent(state, "and-gate", { x: 400, y: 0 });
    addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 },
      { type: "pin", componentId: b.id, pinIndex: 0 },
    );
    addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 },
      { type: "pin", componentId: c.id, pinIndex: 0 },
    );

    removeWiresForComponent(state, b.id);
    expect(state.wireSegments).toHaveLength(1);
    const wire = state.wireSegments[0];
    expect(wire.to.type).toBe("pin");
    expect((wire.to as any).componentId).toBe(c.id);
  });
});

describe("deleteSelected com wires", () => {
  it("ao deletar componente, seus wires são removidos junto", () => {
    const { state, a, b } = stateWithTwoGates();
    addWire(
      state,
      { type: "pin", componentId: a.id, pinIndex: 2 },
      { type: "pin", componentId: b.id, pinIndex: 0 },
    );
    expect(state.wireSegments).toHaveLength(1);

    selectComponent(state, a.id);
    deleteSelected(state);

    expect(state.components).toHaveLength(1);
    expect(state.wireSegments).toHaveLength(0);
  });
});

describe("pendingWire", () => {
  it("setPendingWire define o wire pendente", () => {
    const state = createEditorState();
    setPendingWire(state, "comp-0", 2);
    expect(state.pendingWire).toEqual({ type: "pin", componentId: "comp-0", pinIndex: 2 });
  });

  it("clearPendingWire limpa o wire pendente", () => {
    const state = createEditorState();
    setPendingWire(state, "comp-0", 2);
    clearPendingWire(state);
    expect(state.pendingWire).toBeNull();
  });
});

describe("getPinPosition", () => {
  it("calcula posição absoluta do pin corretamente", () => {
    const comp = { id: "c", type: "and-gate" as const, position: { x: 100, y: 50 } };
    const pinDef = { direction: "input" as const, x: 0, y: 12.5 };
    const pos = getPinPosition(comp, pinDef);
    expect(pos).toEqual({ x: 100, y: 62.5 });
  });
});

describe("hitTestPin", () => {
  it("retorna pin quando clique está dentro do raio", () => {
    const { state, a } = stateWithTwoGates();
    // AND gate output pin is at x=80, y=25 relative; comp a is at (0,0)
    const hit = hitTestPin(state, { x: 80, y: 25 });
    expect(hit).not.toBeNull();
    expect(hit!.componentId).toBe(a.id);
    expect(hit!.pinIndex).toBe(2);
  });

  it("retorna null quando clique está fora do raio", () => {
    const { state } = stateWithTwoGates();
    const hit = hitTestPin(state, { x: 500, y: 500 });
    expect(hit).toBeNull();
  });

  it("respeita z-order (componente mais acima tem prioridade)", () => {
    const state = createEditorState();
    // Two components at the same position — last one added is on top
    const _first = addComponent(state, "and-gate", { x: 0, y: 0 });
    const second = addComponent(state, "and-gate", { x: 0, y: 0 });
    const hit = hitTestPin(state, { x: 80, y: 25 });
    expect(hit).not.toBeNull();
    expect(hit!.componentId).toBe(second.id);
  });
});
