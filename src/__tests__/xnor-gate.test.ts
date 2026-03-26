import { describe, expect, it, vi } from "vitest";
import { xnorGate } from "@/core/components/xnor-gate";

describe("xnorGate", () => {
  it("has correct type and dimensions", () => {
    expect(xnorGate.type).toBe("xnor-gate");
    expect(xnorGate.label).toBe("XNOR Gate");
    expect(xnorGate.width).toBe(90);
    expect(xnorGate.height).toBe(50);
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

    xnorGate.draw(ctx, 10, 20);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("evaluate: XNOR(0,0) = 1", () => {
    expect(xnorGate.evaluate([0, 0], {})).toEqual([1]);
  });

  it("evaluate: XNOR(0,1) = 0", () => {
    expect(xnorGate.evaluate([0, 1], {})).toEqual([0]);
  });

  it("evaluate: XNOR(1,0) = 0", () => {
    expect(xnorGate.evaluate([1, 0], {})).toEqual([0]);
  });

  it("evaluate: XNOR(1,1) = 1", () => {
    expect(xnorGate.evaluate([1, 1], {})).toEqual([1]);
  });

  it("evaluate: XNOR(E, 0) = E (error propagates)", () => {
    expect(xnorGate.evaluate(["E", 0], {})).toEqual(["E"]);
  });

  it("evaluate: XNOR(1, E) = E (error propagates)", () => {
    expect(xnorGate.evaluate([1, "E"], {})).toEqual(["E"]);
  });

  it("evaluate: XNOR(E, E) = E (error propagates)", () => {
    expect(xnorGate.evaluate(["E", "E"], {})).toEqual(["E"]);
  });
});
