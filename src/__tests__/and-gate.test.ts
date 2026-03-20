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

  it("evaluate: AND(1,1) = 1", () => {
    expect(andGate.evaluate([1, 1], {})).toEqual([1]);
  });

  it("evaluate: AND(1,0) = 0", () => {
    expect(andGate.evaluate([1, 0], {})).toEqual([0]);
  });

  it("evaluate: AND(0,1) = 0", () => {
    expect(andGate.evaluate([0, 1], {})).toEqual([0]);
  });

  it("evaluate: AND(0,0) = 0", () => {
    expect(andGate.evaluate([0, 0], {})).toEqual([0]);
  });

  it("evaluate: AND(E, 0) = E (error propagates)", () => {
    expect(andGate.evaluate(["E", 0], {})).toEqual(["E"]);
  });

  it("evaluate: AND(1, E) = E (error propagates)", () => {
    expect(andGate.evaluate([1, "E"], {})).toEqual(["E"]);
  });

  it("evaluate: AND(E, E) = E (error propagates)", () => {
    expect(andGate.evaluate(["E", "E"], {})).toEqual(["E"]);
  });
});
