import { describe, it, expect, vi } from "vitest";
import { xorGate } from "@/core/components/xor-gate";

describe("xorGate", () => {
  it("has correct type and dimensions", () => {
    expect(xorGate.type).toBe("xor-gate");
    expect(xorGate.label).toBe("XOR Gate");
    expect(xorGate.width).toBe(80);
    expect(xorGate.height).toBe(50);
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

    xorGate.draw(ctx, 10, 20);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("evaluate: XOR(0,0) = 0", () => {
    expect(xorGate.evaluate([0, 0], {})).toEqual([0]);
  });

  it("evaluate: XOR(0,1) = 1", () => {
    expect(xorGate.evaluate([0, 1], {})).toEqual([1]);
  });

  it("evaluate: XOR(1,0) = 1", () => {
    expect(xorGate.evaluate([1, 0], {})).toEqual([1]);
  });

  it("evaluate: XOR(1,1) = 0", () => {
    expect(xorGate.evaluate([1, 1], {})).toEqual([0]);
  });

  it("evaluate: XOR(E, 0) = E (error propagates)", () => {
    expect(xorGate.evaluate(["E", 0], {})).toEqual(["E"]);
  });

  it("evaluate: XOR(1, E) = E (error propagates)", () => {
    expect(xorGate.evaluate([1, "E"], {})).toEqual(["E"]);
  });

  it("evaluate: XOR(E, E) = E (error propagates)", () => {
    expect(xorGate.evaluate(["E", "E"], {})).toEqual(["E"]);
  });
});
