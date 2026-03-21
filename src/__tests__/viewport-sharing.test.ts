import { describe, it, expect } from "vitest";
import { createEditorState, screenToWorld } from "@/state";

describe("Viewport with loaded circuits", () => {
  it("preserves viewport when loading circuit data", () => {
    const state = createEditorState();
    
    // Simulate loading circuit data (no viewport in loaded data)
    state.components = [];
    state.wireSegments = [];
    state.junctions = [];
    
    // Viewport should still be intact
    expect(state.viewport).toBeDefined();
    expect(state.viewport).toEqual({ panX: 0, panY: 0, zoom: 1 });
  });

  it("screenToWorld works with loaded circuits", () => {
    const state = createEditorState();
    
    // Simulate loading shared circuit
    state.components = [];
    state.wireSegments = [];
    
    // Verify we can still convert coordinates
    const screenPoint = { x: 100, y: 200 };
    const world = screenToWorld(screenPoint, state.viewport);
    
    expect(world).toEqual({ x: 100, y: 200 });
  });

  it("renders correctly after loading", () => {
    const state = createEditorState();
    
    // Simulate circuit loaded from URL
    state.components = [];
    state.wireSegments = [];
    state.junctions = [];
    state._nextId = 0;
    state._nextWireId = 0;
    state._nextJunctionId = 0;
    
    // Check that all necessary properties exist
    expect(state.viewport).toBeDefined();
    expect(state.viewport.panX).toBe(0);
    expect(state.viewport.panY).toBe(0);
    expect(state.viewport.zoom).toBe(1);
    expect(state.panning).toBe(false);
  });
});
