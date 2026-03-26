import { getThemeColors } from "../theme";
import type { ComponentDef } from "../types";

export const nandGate: ComponentDef = {
  type: "nand-gate",
  label: "NAND Gate",
  width: 90,
  height: 50,
  pins: [
    { direction: "input", x: 0, y: 12.5 },
    { direction: "input", x: 0, y: 37.5 },
    { direction: "output", x: 90, y: 25 },
  ],
  evaluate(inputs) {
    if (inputs.includes("E")) return ["E"];
    return [inputs[0] && inputs[1] ? 0 : 1];
  },
  draw(ctx, x, y) {
    const w = this.width;
    const h = this.height;
    const halfW = w / 2;
    const halfH = h / 2;
    const lineLen = 12;
    const bubbleR = 5;
    const colors = getThemeColors();

    // Input lines (two lines on the left)
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.25);
    ctx.lineTo(x + lineLen, y + h * 0.25);
    ctx.moveTo(x, y + h * 0.75);
    ctx.lineTo(x + lineLen, y + h * 0.75);
    ctx.stroke();

    // Gate body: flat left + arc right (same as AND)
    ctx.fillStyle = colors.gateFillColor;
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + lineLen, y);
    ctx.lineTo(x + halfW - 3, y);
    ctx.arc(x + halfW - 3, y + halfH, halfH, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + lineLen, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inversion bubble
    ctx.fillStyle = colors.gateFillColor;
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      x + halfW - 3 + halfH + bubbleR,
      y + halfH,
      bubbleR,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();

    // Output line (right side)
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + halfW - 3 + halfH + bubbleR * 2, y + halfH);
    ctx.lineTo(x + w, y + halfH);
    ctx.stroke();
  },
};
