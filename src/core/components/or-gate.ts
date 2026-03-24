import type { ComponentDef } from "../types";
import { getThemeColors } from "../theme";

export const orGate: ComponentDef = {
  type: "or-gate",
  label: "OR Gate",
  width: 80,
  height: 50,
  pins: [
    { direction: "input",  x: 0,  y: 12.5 },
    { direction: "input",  x: 0,  y: 37.5 },
    { direction: "output", x: 80, y: 25 },
  ],
  evaluate(inputs) {
    if (inputs.includes('E')) return ['E'];
    return [inputs[0] || inputs[1] ? 1 : 0];
  },
  draw(ctx, x, y) {
    const w = this.width;
    const h = this.height;
    const halfH = h / 2;
    const lineLen = 12;
    const curveIn = 15; // depth of the concave left curve
    const colors = getThemeColors();

    // Input lines (two lines on the left)
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.25);
    ctx.lineTo(x + lineLen + 4, y + h * 0.25);
    ctx.moveTo(x, y + h * 0.75);
    ctx.lineTo(x + lineLen + 4, y + h * 0.75);
    ctx.stroke();

    // Gate body: concave left curve + two convex arcs meeting at right tip
    ctx.fillStyle = colors.gateFillColor;
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Start at top-left
    ctx.moveTo(x + lineLen, y);
    // Top convex arc curving to right tip
    ctx.quadraticCurveTo(x + w * 0.55, y, x + w - lineLen, y + halfH);
    // Bottom convex arc from right tip back to bottom-left
    ctx.quadraticCurveTo(x + w * 0.55, y + h, x + lineLen, y + h);
    // Concave left curve (curved inward)
    ctx.quadraticCurveTo(x + lineLen + curveIn, y + halfH, x + lineLen, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Output line (right side)
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + w - lineLen, y + halfH);
    ctx.lineTo(x + w, y + halfH);
    ctx.stroke();
  },
};
