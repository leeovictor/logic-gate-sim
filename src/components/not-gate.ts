import type { ComponentDef } from "../types";

export const notGate: ComponentDef = {
  type: "not-gate",
  label: "NOT Gate",
  width: 60,
  height: 50,
  pins: [
    { direction: "input",  x: 0,  y: 25 },
    { direction: "output", x: 60, y: 25 },
  ],
  evaluate(inputs) {
    return [inputs[0] ? 0 : 1];
  },
  draw(ctx, x, y) {
    const w = this.width;
    const h = this.height;
    const halfH = h / 2;
    const lineLen = 10;
    const bubbleR = 5;
    const triRight = w - lineLen - bubbleR * 2; // right vertex of triangle

    // Input line (left side)
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + halfH);
    ctx.lineTo(x + lineLen, y + halfH);
    ctx.stroke();

    // Triangle body
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + lineLen, y);
    ctx.lineTo(x + triRight, y + halfH);
    ctx.lineTo(x + lineLen, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inversion bubble
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + triRight + bubbleR, y + halfH, bubbleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Output line (right side)
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + triRight + bubbleR * 2, y + halfH);
    ctx.lineTo(x + w, y + halfH);
    ctx.stroke();
  },
};
