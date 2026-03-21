import { describe, it, expect, vi } from "vitest";
import { nandGate } from "@/core/components/nand-gate";

describe("nandGate", () => {
  it("has correct type and dimensions", () => {
    expect(nandGate.type).toBe("nand-gate");
    expect(nandGate.label).toBe("NAND Gate");
    expect(nandGate.width).toBe(90);
    expect(nandGate.height).toBe(50);
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

    nandGate.draw(ctx, 10, 20);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("evaluate: NAND(1,1) = 0", () => {
    expect(nandGate.evaluate([1, 1], {})).toEqual([0]);
  });

  it("evaluate: NAND(1,0) = 1", () => {
    expect(nandGate.evaluate([1, 0], {})).toEqual([1]);
  });

  it("evaluate: NAND(0,1) = 1", () => {
    expect(nandGate.evaluate([0, 1], {})).toEqual([1]);
  });

  it("evaluate: NAND(0,0) = 1", () => {
    expect(nandGate.evaluate([0, 0], {})).toEqual([1]);
  });

  it("evaluate: NAND(E, 0) = E (error propagates)", () => {
    expect(nandGate.evaluate(["E", 0], {})).toEqual(["E"]);
  });

  it("evaluate: NAND(1, E) = E (error propagates)", () => {
    expect(nandGate.evaluate([1, "E"], {})).toEqual(["E"]);
  });

  it("evaluate: NAND(E, E) = E (error propagates)", () => {
    expect(nandGate.evaluate(["E", "E"], {})).toEqual(["E"]);
  });
});
