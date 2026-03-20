import { describe, it, expect } from "vitest";
import { createEditorState, addComponent, setSelectedTool } from "../state";

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
