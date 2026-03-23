import type { ComponentDef } from "../types";
import { getThemeColors } from "../theme";

export const lightComponent: ComponentDef = {
  type: "light",
  label: "Light",
  width: 40,
  height: 30,
  pins: [
    { direction: "input", x: 0, y: 15 },
  ],
  defaultState: { value: 0 },
  evaluate(inputs, state) {
    if (inputs.includes('E')) {
      state.value = 'E';
      return [];
    }
    state.value = inputs[0] ? 1 : 0;
    return [];
  },
  draw(ctx, x, y, state) {
    const w = this.width;
    const h = this.height;
    const value = state?.value ?? 0;
    const radius = 12;
    const lineLen = w - radius * 2;
    const centerX = x + lineLen + radius;
    const centerY = y + h / 2;
    const colors = getThemeColors();

    // Input line
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + lineLen, y + h / 2);
    ctx.stroke();

    // Circle body (bulb)
    const isError = value === 'E';
    const isOn = value === 1;
    ctx.fillStyle = isError ? "#f87171" : isOn ? "#22c55e" : colors.inactiveSignalColor;
    ctx.strokeStyle = colors.strokeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Value text
    ctx.fillStyle = colors.textColor;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(isError ? 'E' : (isOn ? 1 : 0)), centerX, centerY);
  },
};
