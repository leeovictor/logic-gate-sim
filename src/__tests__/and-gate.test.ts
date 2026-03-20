import { describe, it, expect, vi } from "vitest";
import { andGate } from "../components/and-gate";

describe("andGate", () => {
  it("has correct type and dimensions", () => {
    expect(andGate.type).toBe("and-gate");
    expect(andGate.label).toBe("AND Gate");
    expect(andGate.width).toBe(80);
    expect(andGate.height).toBe(50);
  });

  it("calls canvas drawing methods", () => {
    const ctx = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "",
      textBaseline: "",
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    andGate.draw(ctx, 10, 20);

    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 80, 50);
    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 80, 50);
    expect(ctx.fillText).toHaveBeenCalledWith("AND", 50, 45);
  });
});
