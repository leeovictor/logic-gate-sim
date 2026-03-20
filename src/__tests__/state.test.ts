import { describe, it, expect } from "vitest";
import { createEditorState, addComponent, setSelectedTool, startDrag, updateDrag, endDrag, startSelectionBox, updateSelectionBox, endSelectionBox } from "../state";

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
  it("startDrag sets dragging state with componentId, offset, and offsets", () => {
    const state = createEditorState();
    const comp = addComponent(state, "and-gate", { x: 100, y: 200 });

    startDrag(state, comp.id, { x: 10, y: 15 });

    expect(state.dragging!.componentId).toBe(comp.id);
    expect(state.dragging!.offset).toEqual({ x: 10, y: 15 });
    expect(state.dragging!.offsets.get(comp.id)).toEqual({ x: 10, y: 15 });
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

describe("selection box", () => {
  it("startSelectionBox sets selectionBox with start and current", () => {
    const state = createEditorState();
    startSelectionBox(state, { x: 10, y: 20 });
    expect(state.selectionBox).toEqual({ start: { x: 10, y: 20 }, current: { x: 10, y: 20 } });
  });

  it("updateSelectionBox updates current point", () => {
    const state = createEditorState();
    startSelectionBox(state, { x: 10, y: 20 });
    updateSelectionBox(state, { x: 100, y: 200 });
    expect(state.selectionBox!.current).toEqual({ x: 100, y: 200 });
    expect(state.selectionBox!.start).toEqual({ x: 10, y: 20 });
  });

  it("updateSelectionBox does nothing when no selectionBox", () => {
    const state = createEditorState();
    updateSelectionBox(state, { x: 100, y: 200 });
    expect(state.selectionBox).toBeNull();
  });

  it("endSelectionBox selects components fully inside the box", () => {
    const state = createEditorState();
    // AND gate is 80x50
    const inside = addComponent(state, "and-gate", { x: 50, y: 50 });
    const outside = addComponent(state, "and-gate", { x: 300, y: 300 });

    startSelectionBox(state, { x: 0, y: 0 });
    updateSelectionBox(state, { x: 200, y: 200 });
    endSelectionBox(state, false);

    expect(state.selectedComponentIds.has(inside.id)).toBe(true);
    expect(state.selectedComponentIds.has(outside.id)).toBe(false);
    expect(state.selectionBox).toBeNull();
  });

  it("endSelectionBox does not select partially overlapping components", () => {
    const state = createEditorState();
    // AND gate is 80x50, place it so it sticks out of the box
    const partial = addComponent(state, "and-gate", { x: 170, y: 50 });

    startSelectionBox(state, { x: 0, y: 0 });
    updateSelectionBox(state, { x: 200, y: 200 });
    endSelectionBox(state, false);

    // 170 + 80 = 250 > 200, so not fully inside
    expect(state.selectedComponentIds.has(partial.id)).toBe(false);
  });

  it("endSelectionBox clears previous selection without ctrlKey", () => {
    const state = createEditorState();
    const prev = addComponent(state, "and-gate", { x: 300, y: 300 });
    state.selectedComponentIds.add(prev.id);

    const inside = addComponent(state, "and-gate", { x: 50, y: 50 });
    startSelectionBox(state, { x: 0, y: 0 });
    updateSelectionBox(state, { x: 200, y: 200 });
    endSelectionBox(state, false);

    expect(state.selectedComponentIds.has(prev.id)).toBe(false);
    expect(state.selectedComponentIds.has(inside.id)).toBe(true);
  });

  it("endSelectionBox adds to existing selection with ctrlKey", () => {
    const state = createEditorState();
    const prev = addComponent(state, "and-gate", { x: 300, y: 300 });
    state.selectedComponentIds.add(prev.id);

    const inside = addComponent(state, "and-gate", { x: 50, y: 50 });
    startSelectionBox(state, { x: 0, y: 0 });
    updateSelectionBox(state, { x: 200, y: 200 });
    endSelectionBox(state, true);

    expect(state.selectedComponentIds.has(prev.id)).toBe(true);
    expect(state.selectedComponentIds.has(inside.id)).toBe(true);
  });

  it("endSelectionBox works with reversed drag direction", () => {
    const state = createEditorState();
    const inside = addComponent(state, "and-gate", { x: 50, y: 50 });

    // Drag from bottom-right to top-left
    startSelectionBox(state, { x: 200, y: 200 });
    updateSelectionBox(state, { x: 0, y: 0 });
    endSelectionBox(state, false);

    expect(state.selectedComponentIds.has(inside.id)).toBe(true);
  });

  it("createEditorState initializes selectionBox as null", () => {
    const state = createEditorState();
    expect(state.selectionBox).toBeNull();
  });
});

describe("multi-component drag", () => {
  it("dragging a selected component moves all selected components", () => {
    const state = createEditorState();
    const a = addComponent(state, "and-gate", { x: 50, y: 50 });
    const b = addComponent(state, "and-gate", { x: 150, y: 150 });
    state.selectedComponentIds.add(a.id);
    state.selectedComponentIds.add(b.id);

    // Click on component a at (60, 60), offset = (10, 10)
    startDrag(state, a.id, { x: 10, y: 10 });
    // Move cursor to (110, 110) → delta of +50, +50
    updateDrag(state, { x: 110, y: 110 });

    expect(a.position).toEqual({ x: 100, y: 100 });
    expect(b.position).toEqual({ x: 200, y: 200 });
  });

  it("dragging an unselected component only moves that component", () => {
    const state = createEditorState();
    const a = addComponent(state, "and-gate", { x: 50, y: 50 });
    const b = addComponent(state, "and-gate", { x: 150, y: 150 });
    // Neither is selected

    startDrag(state, a.id, { x: 10, y: 10 });
    updateDrag(state, { x: 110, y: 110 });

    expect(a.position).toEqual({ x: 100, y: 100 });
    expect(b.position).toEqual({ x: 150, y: 150 });
  });
});
