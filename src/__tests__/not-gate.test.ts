import { describe, it, expect, vi } from "vitest";
import { notGate } from "@/core/components/not-gate";

describe("notGate", () => {
  it("has correct type and dimensions", () => {
    expect(notGate.type).toBe("not-gate");
    expect(notGate.label).toBe("NOT Gate");
    expect(notGate.width).toBe(60);
    expect(notGate.height).toBe(50);
  });

  it("draws gate body, bubble and connection lines", () => {
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

    notGate.draw(ctx, 10, 20);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("evaluate: NOT(0) = 1", () => {
    expect(notGate.evaluate([0], {})).toEqual([1]);
  });

  it("evaluate: NOT(1) = 0", () => {
    expect(notGate.evaluate([1], {})).toEqual([0]);
  });

  it("evaluate: NOT(E) = E (error propagates)", () => {
    expect(notGate.evaluate(["E"], {})).toEqual(["E"]);
  });
});
