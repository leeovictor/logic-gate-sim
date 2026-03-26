import { describe, expect, it, vi } from "vitest";
import { norGate } from "@/core/components/nor-gate";

describe("norGate", () => {
  it("has correct type and dimensions", () => {
    expect(norGate.type).toBe("nor-gate");
    expect(norGate.label).toBe("NOR Gate");
    expect(norGate.width).toBe(90);
    expect(norGate.height).toBe(50);
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
      quadraticCurveTo: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    norGate.draw(ctx, 10, 20);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("evaluate: NOR(0,0) = 1", () => {
    expect(norGate.evaluate([0, 0], {})).toEqual([1]);
  });

  it("evaluate: NOR(0,1) = 0", () => {
    expect(norGate.evaluate([0, 1], {})).toEqual([0]);
  });

  it("evaluate: NOR(1,0) = 0", () => {
    expect(norGate.evaluate([1, 0], {})).toEqual([0]);
  });

  it("evaluate: NOR(1,1) = 0", () => {
    expect(norGate.evaluate([1, 1], {})).toEqual([0]);
  });

  it("evaluate: NOR(E, 0) = E (error propagates)", () => {
    expect(norGate.evaluate(["E", 0], {})).toEqual(["E"]);
  });

  it("evaluate: NOR(1, E) = E (error propagates)", () => {
    expect(norGate.evaluate([1, "E"], {})).toEqual(["E"]);
  });

  it("evaluate: NOR(E, E) = E (error propagates)", () => {
    expect(norGate.evaluate(["E", "E"], {})).toEqual(["E"]);
  });
});
