import { describe, it, expect } from "vitest";
import { createEditorState, screenToWorld, panViewport, zoomViewport, resetViewport } from "@/state";
import type { Viewport } from "@/core/types";

describe("screenToWorld", () => {
  it("converts screen coordinates to world coordinates with identity viewport", () => {
    const viewport: Viewport = { panX: 0, panY: 0, zoom: 1 };
    const screen = { x: 100, y: 200 };
    const world = screenToWorld(screen, viewport);
    expect(world).toEqual({ x: 100, y: 200 });
  });

  it("converts with pan offset", () => {
    const viewport: Viewport = { panX: 50, panY: 75, zoom: 1 };
    const screen = { x: 100, y: 200 };
    const world = screenToWorld(screen, viewport);
    expect(world).toEqual({ x: 50, y: 125 });
  });

  it("converts with zoom", () => {
    const viewport: Viewport = { panX: 0, panY: 0, zoom: 2 };
    const screen = { x: 100, y: 200 };
    const world = screenToWorld(screen, viewport);
    expect(world).toEqual({ x: 50, y: 100 });
  });

  it("converts with zoom 0.5", () => {
    const viewport: Viewport = { panX: 0, panY: 0, zoom: 0.5 };
    const screen = { x: 100, y: 200 };
    const world = screenToWorld(screen, viewport);
    expect(world).toEqual({ x: 200, y: 400 });
  });

  it("converts with combined pan and zoom", () => {
    const viewport: Viewport = { panX: 100, panY: 50, zoom: 2 };
    const screen = { x: 200, y: 150 };
    const world = screenToWorld(screen, viewport);
    // (200 - 100) / 2 = 50, (150 - 50) / 2 = 50
    expect(world).toEqual({ x: 50, y: 50 });
  });
});

describe("panViewport", () => {
  it("accumulates pan delta on panX", () => {
    const state = createEditorState();
    panViewport(state, 25, 0);
    expect(state.viewport.panX).toBe(25);
    expect(state.viewport.panY).toBe(0);
  });

  it("accumulates pan delta on panY", () => {
    const state = createEditorState();
    panViewport(state, 0, 30);
    expect(state.viewport.panX).toBe(0);
    expect(state.viewport.panY).toBe(30);
  });

  it("accumulates multiple pan operations", () => {
    const state = createEditorState();
    panViewport(state, 10, 20);
    panViewport(state, 5, -5);
    expect(state.viewport.panX).toBe(15);
    expect(state.viewport.panY).toBe(15);
  });

  it("handles negative pan deltas", () => {
    const state = createEditorState();
    panViewport(state, -50, -100);
    expect(state.viewport.panX).toBe(-50);
    expect(state.viewport.panY).toBe(-100);
  });
});

describe("zoomViewport", () => {
  it("increases zoom with factor > 1", () => {
    const state = createEditorState();
    zoomViewport(state, 1.1, { x: 0, y: 0 });
    expect(state.viewport.zoom).toBeCloseTo(1.1, 5);
  });

  it("decreases zoom with factor < 1", () => {
    const state = createEditorState();
    zoomViewport(state, 1 / 1.1, { x: 0, y: 0 });
    expect(state.viewport.zoom).toBeCloseTo(1 / 1.1, 5);
  });

  it("clamps zoom to minimum 0.1", () => {
    const state = createEditorState();
    // Try to zoom out too much
    for (let i = 0; i < 20; i++) {
      zoomViewport(state, 0.5, { x: 0, y: 0 });
    }
    expect(state.viewport.zoom).toBe(0.1);
  });

  it("clamps zoom to maximum 5", () => {
    const state = createEditorState();
    // Try to zoom in too much
    for (let i = 0; i < 20; i++) {
      zoomViewport(state, 1.5, { x: 0, y: 0 });
    }
    expect(state.viewport.zoom).toBe(5);
  });

  it("keeps world point under cursor fixed during zoom (cursor at origin)", () => {
    const state = createEditorState();
    state.viewport.panX = 100;
    state.viewport.panY = 50;

    // Before zoom
    const screenCenter = { x: 100, y: 50 };
    const worldBefore = screenToWorld(screenCenter, state.viewport);

    // Zoom in
    zoomViewport(state, 2, screenCenter);

    // After zoom, same screen point should map to same world point
    const worldAfter = screenToWorld(screenCenter, state.viewport);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 5);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 5);
  });

  it("keeps world point under cursor fixed during zoom (arbitrary cursor)", () => {
    const state = createEditorState();
    state.viewport.panX = 200;
    state.viewport.panY = 150;
    state.viewport.zoom = 1.5;

    // Arbitrary screen center
    const screenCenter = { x: 300, y: 250 };
    const worldBefore = screenToWorld(screenCenter, state.viewport);

    // Zoom out
    zoomViewport(state, 0.8, screenCenter);

    // After zoom, same screen point should map to approximately same world point
    const worldAfter = screenToWorld(screenCenter, state.viewport);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 4);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 4);
  });
});

describe("resetViewport", () => {
  it("resets viewport to identity", () => {
    const state = createEditorState();
    state.viewport.panX = 100;
    state.viewport.panY = 200;
    state.viewport.zoom = 2.5;

    resetViewport(state);

    expect(state.viewport).toEqual({ panX: 0, panY: 0, zoom: 1 });
  });

  it("resets from various states", () => {
    const state = createEditorState();
    zoomViewport(state, 3, { x: 100, y: 100 });
    panViewport(state, 50, -50);

    resetViewport(state);

    expect(state.viewport).toEqual({ panX: 0, panY: 0, zoom: 1 });
  });
});

describe("EditorState viewport initialization", () => {
  it("initializes viewport on createEditorState", () => {
    const state = createEditorState();
    expect(state.viewport).toEqual({ panX: 0, panY: 0, zoom: 1 });
  });

  it("initializes panning flag as false", () => {
    const state = createEditorState();
    expect(state.panning).toBe(false);
  });
});
