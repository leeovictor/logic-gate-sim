import type { EditorState, Point } from "@/core/types";

export function panViewport(state: EditorState, deltaX: number, deltaY: number): void {
  state.viewport.panX += deltaX;
  state.viewport.panY += deltaY;
}

export function zoomViewport(state: EditorState, factor: number, centerScreen: Point): void {
  const oldZoom = state.viewport.zoom;
  const newZoom = Math.max(0.1, Math.min(5, oldZoom * factor));

  // Adjust pan so the world point under centerScreen stays fixed
  state.viewport.panX = centerScreen.x - (centerScreen.x - state.viewport.panX) * (newZoom / oldZoom);
  state.viewport.panY = centerScreen.y - (centerScreen.y - state.viewport.panY) * (newZoom / oldZoom);
  state.viewport.zoom = newZoom;
}

export function resetViewport(state: EditorState): void {
  state.viewport = { panX: 0, panY: 0, zoom: 1 };
}
