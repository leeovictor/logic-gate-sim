import { describe, it, expect, vi } from "vitest";
import { orGate } from "../components/or-gate";

describe("orGate", () => {
  it("has correct type and dimensions", () => {
    expect(orGate.type).toBe("or-gate");
    expect(orGate.label).toBe("OR Gate");
    expect(orGate.width).toBe(80);
    expect(orGate.height).toBe(50);
  });

  it("draws gate body and connection lines", () => {
    const ctx = {
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    orGate.draw(ctx, 10, 20);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("evaluate: OR(1,1) = 1", () => {
    expect(orGate.evaluate([1, 1], {})).toEqual([1]);
  });

  it("evaluate: OR(1,0) = 1", () => {
    expect(orGate.evaluate([1, 0], {})).toEqual([1]);
  });

  it("evaluate: OR(0,1) = 1", () => {
    expect(orGate.evaluate([0, 1], {})).toEqual([1]);
  });

  it("evaluate: OR(0,0) = 0", () => {
    expect(orGate.evaluate([0, 0], {})).toEqual([0]);
  });

  it("evaluate: OR(E, 0) = E (error propagates)", () => {
    expect(orGate.evaluate(["E", 0], {})).toEqual(["E"]);
  });

  it("evaluate: OR(1, E) = E (error propagates)", () => {
    expect(orGate.evaluate([1, "E"], {})).toEqual(["E"]);
  });

  it("evaluate: OR(E, E) = E (error propagates)", () => {
    expect(orGate.evaluate(["E", "E"], {})).toEqual(["E"]);
  });
});
