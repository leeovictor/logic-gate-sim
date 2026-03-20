import type { ComponentDef } from "../types";

export const lightComponent: ComponentDef = {
  type: "light",
  label: "Light",
  width: 50,
  height: 40,
  pins: [
    { direction: "input", x: 0, y: 20 },
  ],
  defaultState: { value: 0 },
  evaluate(inputs, state) {
    state.value = inputs[0] ? 1 : 0;
    return [];
  },
  draw(ctx, x, y, state) {
    const w = this.width;
    const h = this.height;
    const value = state?.value ?? 0;
    const radius = 15;
    const lineLen = w - radius * 2;
    const centerX = x + lineLen + radius;
    const centerY = y + h / 2;

    // Input line
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + lineLen, y + h / 2);
    ctx.stroke();

    // Circle body (bulb)
    ctx.fillStyle = value ? "#22c55e" : "#d1d5db";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Value text
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(value ? 1 : 0), centerX, centerY);
  },
};
