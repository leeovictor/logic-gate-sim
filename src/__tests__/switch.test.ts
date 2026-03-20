import { describe, it, expect, vi } from "vitest";
import { switchComponent } from "../components/switch";
import {
  createEditorState,
  addComponent,
  toggleSwitchValue,
} from "../state";

describe("switch component", () => {
  it("tem type, label, width, height corretos", () => {
    expect(switchComponent.type).toBe("switch");
    expect(switchComponent.label).toBe("Switch");
    expect(switchComponent.width).toBe(50);
    expect(switchComponent.height).toBe(40);
  });

  it("tem 1 pin de output na posição correta", () => {
    expect(switchComponent.pins).toHaveLength(1);
    expect(switchComponent.pins[0]).toEqual({
      direction: "output",
      x: 50,
      y: 20,
    });
  });

  it("draw() chama métodos do canvas sem erro", () => {
    const ctx = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "",
      textBaseline: "",
      beginPath: vi.fn(),
      rect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    expect(() => switchComponent.draw(ctx, 10, 20)).not.toThrow();
    expect(() => switchComponent.draw(ctx, 10, 20, { value: 1 })).not.toThrow();
  });

  it("evaluate: retorna state.value como output", () => {
    expect(switchComponent.evaluate([], { value: 0 })).toEqual([0]);
    expect(switchComponent.evaluate([], { value: 1 })).toEqual([1]);
  });
});

describe("switch state", () => {
  it("addComponent para switch inicializa state com { value: 0 }", () => {
    const state = createEditorState();
    const comp = addComponent(state, "switch", { x: 0, y: 0 });
    expect(comp.state).toEqual({ value: 0 });
  });

  it("addComponent para and-gate inicializa state vazio", () => {
    const state = createEditorState();
    const comp = addComponent(state, "and-gate", { x: 0, y: 0 });
    expect(comp.state).toEqual({});
  });

  it("toggleSwitchValue alterna de 0 para 1", () => {
    const state = createEditorState();
    const comp = addComponent(state, "switch", { x: 0, y: 0 });
    toggleSwitchValue(state, comp.id);
    expect(comp.state.value).toBe(1);
  });

  it("toggleSwitchValue alterna de 1 para 0", () => {
    const state = createEditorState();
    const comp = addComponent(state, "switch", { x: 0, y: 0 });
    toggleSwitchValue(state, comp.id);
    toggleSwitchValue(state, comp.id);
    expect(comp.state.value).toBe(0);
  });

  it("toggleSwitchValue não afeta componentes que não são switch", () => {
    const state = createEditorState();
    const gate = addComponent(state, "and-gate", { x: 0, y: 0 });
    toggleSwitchValue(state, gate.id);
    expect(gate.state).toEqual({});
  });
});
