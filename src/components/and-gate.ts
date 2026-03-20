import type { ComponentDef } from "../types";

export const andGate: ComponentDef = {
  type: "and-gate",
  label: "AND Gate",
  width: 80,
  height: 50,
  draw(ctx, x, y) {
    const w = this.width;
    const h = this.height;
    const halfW = w / 2;
    const halfH = h / 2;
    const lineLen = 12;

    // Input lines (two lines on the left)
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.25);
    ctx.lineTo(x + lineLen, y + h * 0.25);
    ctx.moveTo(x, y + h * 0.75);
    ctx.lineTo(x + lineLen, y + h * 0.75);
    ctx.stroke();

    // Gate body: flat left + arc right
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + lineLen, y);
    ctx.lineTo(x + halfW, y);
    ctx.arc(x + halfW, y + halfH, halfH, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + lineLen, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Output line (right side)
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + halfW + halfH, y + halfH);
    ctx.lineTo(x + w, y + halfH);
    ctx.stroke();
  },
};
