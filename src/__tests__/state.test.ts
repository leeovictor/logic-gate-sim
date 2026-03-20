import { describe, it, expect } from "vitest";
import { createEditorState, addComponent, setSelectedTool, startDrag, updateDrag, endDrag } from "../state";

describe("createEditorState", () => {
  it("returns initial state with no tool and no components", () => {
    const state = createEditorState();
    expect(state.selectedTool).toBeNull();
    expect(state.components).toEqual([]);
  });
});

describe("addComponent", () => {
  it("adds a component with unique id and correct position", () => {
    const state = createEditorState();
    const comp = addComponent(state, "and-gate", { x: 100, y: 200 });

    expect(comp.type).toBe("and-gate");
    expect(comp.position).toEqual({ x: 100, y: 200 });
    expect(comp.id).toBeDefined();
    expect(state.components).toHaveLength(1);
    expect(state.components[0]).toBe(comp);
  });

  it("assigns unique ids to each component", () => {
    const state = createEditorState();
    const a = addComponent(state, "and-gate", { x: 0, y: 0 });
    const b = addComponent(state, "and-gate", { x: 50, y: 50 });

    expect(a.id).not.toBe(b.id);
    expect(state.components).toHaveLength(2);
  });
});

describe("setSelectedTool", () => {
  it("sets the selected tool", () => {
    const state = createEditorState();
    setSelectedTool(state, "and-gate");
    expect(state.selectedTool).toBe("and-gate");
  });

  it("clears the selected tool with null", () => {
    const state = createEditorState();
    setSelectedTool(state, "and-gate");
    setSelectedTool(state, null);
    expect(state.selectedTool).toBeNull();
  });
});

describe("drag operations", () => {
  it("startDrag sets dragging state with componentId and offset", () => {
    const state = createEditorState();
    const comp = addComponent(state, "and-gate", { x: 100, y: 200 });

    startDrag(state, comp.id, { x: 10, y: 15 });

    expect(state.dragging).toEqual({ componentId: comp.id, offset: { x: 10, y: 15 } });
  });

  it("updateDrag moves component position based on cursor minus offset", () => {
    const state = createEditorState();
    const comp = addComponent(state, "and-gate", { x: 100, y: 200 });

    startDrag(state, comp.id, { x: 10, y: 15 });
    updateDrag(state, { x: 250, y: 300 });

    expect(comp.position).toEqual({ x: 240, y: 285 });
  });

  it("updateDrag does nothing when not dragging", () => {
    const state = createEditorState();
    const comp = addComponent(state, "and-gate", { x: 100, y: 200 });

    updateDrag(state, { x: 250, y: 300 });

    expect(comp.position).toEqual({ x: 100, y: 200 });
  });

  it("endDrag clears dragging state", () => {
    const state = createEditorState();
    const comp = addComponent(state, "and-gate", { x: 100, y: 200 });

    startDrag(state, comp.id, { x: 10, y: 15 });
    expect(state.dragging).not.toBeNull();

    endDrag(state);
    expect(state.dragging).toBeNull();
  });

  it("dragging preserves relative mouse offset (no jump)", () => {
    const state = createEditorState();
    const comp = addComponent(state, "and-gate", { x: 50, y: 50 });

    // User clicks at (70, 65), so offset is (20, 15)
    startDrag(state, comp.id, { x: 20, y: 15 });

    // User moves mouse to (120, 115)
    updateDrag(state, { x: 120, y: 115 });
    expect(comp.position).toEqual({ x: 100, y: 100 });

    // User moves mouse again to (200, 200)
    updateDrag(state, { x: 200, y: 200 });
    expect(comp.position).toEqual({ x: 180, y: 185 });
  });

  it("createEditorState initializes dragging as null", () => {
    const state = createEditorState();
    expect(state.dragging).toBeNull();
  });
});
