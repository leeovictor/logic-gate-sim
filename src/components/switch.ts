import type { ComponentDef } from "../types";

export const switchComponent: ComponentDef = {
  type: "switch",
  label: "Switch",
  width: 50,
  height: 40,
  pins: [
    { direction: "output", x: 50, y: 20 },
  ],
  defaultState: { value: 0 },
  evaluate(_inputs, state) {
    return [state.value ? 1 : 0];
  },
  draw(ctx, x, y, state) {
    const w = this.width;
    const h = this.height;
    const value = state?.value ?? 0;
    const bodyW = 38;
    const lineLen = w - bodyW;

    // Body rectangle
    ctx.fillStyle = value ? "#22c55e" : "#d1d5db";
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(x, y, bodyW, h);
    ctx.fill();
    ctx.stroke();

    // Value text
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(value ? 1 : 0), x + bodyW / 2, y + h / 2);

    // Output line
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + bodyW, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
  },
};
