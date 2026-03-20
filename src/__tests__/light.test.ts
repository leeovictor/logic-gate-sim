import { describe, it, expect, vi } from "vitest";
import { lightComponent } from "../components/light";
import { createEditorState, addComponent } from "../state";

describe("light component", () => {
  it("tem type, label, width, height corretos", () => {
    expect(lightComponent.type).toBe("light");
    expect(lightComponent.label).toBe("Light");
    expect(lightComponent.width).toBe(50);
    expect(lightComponent.height).toBe(40);
  });

  it("tem 1 pin de input na posição correta", () => {
    expect(lightComponent.pins).toHaveLength(1);
    expect(lightComponent.pins[0]).toEqual({
      direction: "input",
      x: 0,
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
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    expect(() => lightComponent.draw(ctx, 10, 20)).not.toThrow();
    expect(() => lightComponent.draw(ctx, 10, 20, { value: 1 })).not.toThrow();
  });
});

describe("light state", () => {
  it("addComponent para light inicializa state com { value: 0 }", () => {
    const state = createEditorState();
    const comp = addComponent(state, "light", { x: 0, y: 0 });
    expect(comp.state).toEqual({ value: 0 });
  });
});
