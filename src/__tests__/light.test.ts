import { describe, it, expect, vi } from "vitest";
import { lightComponent } from "@/core/components/light";
import { createEditorState, addComponent } from "@/state";

describe("light component", () => {
  it("tem type, label, width, height corretos", () => {
    expect(lightComponent.type).toBe("light");
    expect(lightComponent.label).toBe("Light");
    expect(lightComponent.width).toBe(40);
    expect(lightComponent.height).toBe(30);
  });

  it("tem 1 pin de input na posição correta", () => {
    expect(lightComponent.pins).toHaveLength(1);
    expect(lightComponent.pins[0]).toEqual({
      direction: "input",
      x: 0,
      y: 15,
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

  it("evaluate: atualiza state.value com input", () => {
    const s: Record<string, unknown> = { value: 0 };
    expect(lightComponent.evaluate([1], s)).toEqual([]);
    expect(s.value).toBe(1);

    expect(lightComponent.evaluate([0], s)).toEqual([]);
    expect(s.value).toBe(0);
  });

  it("evaluate: atualiza state.value com error input (E)", () => {
    const s: Record<string, unknown> = { value: 0 };
    expect(lightComponent.evaluate(["E"], s)).toEqual([]);
    expect(s.value).toBe("E");
  });
});

describe("light state", () => {
  it("addComponent para light inicializa state com { value: 0 }", () => {
    const state = createEditorState();
    const comp = addComponent(state, "light", { x: 0, y: 0 });
    expect(comp.state).toEqual({ value: 0 });
  });
});
