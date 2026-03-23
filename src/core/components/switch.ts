import type { ComponentDef } from "../types";
import { getThemeColors } from "../theme";

export const switchComponent: ComponentDef = {
  type: "switch",
  label: "Switch",
  width: 40,
  height: 30,
  pins: [
    { direction: "output", x: 40, y: 15 },
  ],
  defaultState: { value: 0 },
  evaluate(_inputs, state) {
    return [state.value ? 1 : 0];
  },
  draw(ctx, x, y, state) {
    const w = this.width;
    const h = this.height;
    const value = state?.value ?? 0;
    const bodyW = 30;
    const lineLen = w - bodyW;
    const colors = getThemeColors();

    // Body rectangle
    ctx.fillStyle = value ? "#22c55e" : colors.inactiveSignalColor;
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.rect(x, y, bodyW, h);
    ctx.fill();
    ctx.stroke();

    // Value text
    ctx.fillStyle = colors.textColor;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(value ? 1 : 0), x + bodyW / 2, y + h / 2);

    // Output line
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + bodyW, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
  },
};
