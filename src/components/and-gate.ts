import type { ComponentDef } from "../types";

export const andGate: ComponentDef = {
  type: "and-gate",
  label: "AND Gate",
  width: 80,
  height: 50,
  draw(ctx, x, y) {
    ctx.fillStyle = "#d1e7dd";
    ctx.strokeStyle = "#2d6a4f";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, this.width, this.height);
    ctx.strokeRect(x, y, this.width, this.height);

    ctx.fillStyle = "#2d6a4f";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AND", x + this.width / 2, y + this.height / 2);
  },
};
