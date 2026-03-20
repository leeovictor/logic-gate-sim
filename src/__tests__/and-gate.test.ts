import { describe, it, expect, vi } from "vitest";
import { andGate } from "../components/and-gate";

describe("andGate", () => {
  it("has correct type and dimensions", () => {
    expect(andGate.type).toBe("and-gate");
    expect(andGate.label).toBe("AND Gate");
    expect(andGate.width).toBe(80);
    expect(andGate.height).toBe(50);
  });

  it("draws gate body and connection lines", () => {
    const ctx = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    andGate.draw(ctx, 10, 20);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });
});
