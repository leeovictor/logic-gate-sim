import "./style.css";
import { createEditorState, addComponent, setSelectedTool } from "./state";
import { createToolbar } from "./toolbar";
import { drawAll } from "./renderer";

const state = createEditorState();

const toolbar = createToolbar((tool) => {
  setSelectedTool(state, tool);
});
document.body.prepend(toolbar);

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const toolbarHeight = toolbar.offsetHeight;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - toolbarHeight;
}

window.addEventListener("resize", resize);
resize();

canvas.addEventListener("click", (e) => {
  if (state.selectedTool) {
    addComponent(state, state.selectedTool, { x: e.offsetX, y: e.offsetY });
  }
});

function render() {
  drawAll(ctx, state, canvas.width, canvas.height);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
