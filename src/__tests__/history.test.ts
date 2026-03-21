import { describe, it, expect, beforeEach } from "vitest";
import {
  createEditorState,
  createHistory,
  captureSnapshot,
  pushSnapshot,
  popLastSnapshot,
  undo,
  redo,
  canUndo,
  canRedo,
  addComponent,
} from "@/state";
import type { EditorState, History } from "@/state";

describe("History (Undo/Redo)", () => {
  let state: EditorState;
  let history: History;

  beforeEach(() => {
    state = createEditorState();
    history = createHistory();
  });

  describe("createHistory", () => {
    it("should create an empty history", () => {
      expect(history.undoStack).toEqual([]);
      expect(history.redoStack).toEqual([]);
    });
  });

  describe("captureSnapshot", () => {
    it("should capture circuit-structural state", () => {
      state.components = [{ id: "comp-0", type: "switch", position: { x: 10, y: 20 }, state: {} }];
      state._nextId = 5;

      const snapshot = captureSnapshot(state);

      expect(snapshot.components).toEqual(state.components);
      expect(snapshot._nextId).toBe(5);
    });

    it("should perform deep copy (snapshot isolation)", () => {
      state.components = [{ id: "comp-0", type: "switch", position: { x: 10, y: 20 }, state: {} }];

      const snapshot = captureSnapshot(state);

      // Mutate original state
      state.components[0].position.x = 999;

      // Snapshot should remain unchanged
      expect(snapshot.components[0].position.x).toBe(10);
    });
  });

  describe("pushSnapshot", () => {
    it("should push snapshot to undo stack and clear redo stack", () => {
      pushSnapshot(history, state);
      expect(canUndo(history)).toBe(true);
      expect(canRedo(history)).toBe(false);
    });

    it("should clear redo stack on new push", () => {
      // Setup: undo and redo stacks populated
      pushSnapshot(history, state);
      state.components = [];
      pushSnapshot(history, state);

      // Undo to populate redo stack
      undo(history, state);
      expect(canRedo(history)).toBe(true);

      // New push should clear redo stack
      state.components = [];
      pushSnapshot(history, state);
      expect(canRedo(history)).toBe(false);
    });

    it("should enforce max size of 100", () => {
      // Push 101 snapshots
      for (let i = 0; i < 101; i++) {
        pushSnapshot(history, state);
      }

      // Only 100 should remain
      expect(history.undoStack.length).toBe(100);
    });
  });

  describe("popLastSnapshot", () => {
    it("should remove last snapshot without clearing redo stack", () => {
      pushSnapshot(history, state);
      pushSnapshot(history, state);

      // Undo to populate redo stack
      undo(history, state);
      expect(canRedo(history)).toBe(true);

      // Pop last (should only remove from undo, not touch redo)
      popLastSnapshot(history);
      expect(history.undoStack.length).toBe(0);
      expect(canRedo(history)).toBe(true);
    });

    it("should handle empty undo stack gracefully", () => {
      popLastSnapshot(history);
      expect(history.undoStack).toEqual([]);
    });
  });

  describe("undo", () => {
    it("should return false when undo stack is empty", () => {
      const result = undo(history, state);
      expect(result).toBe(false);
    });

    it("should restore previous state", () => {
      // Setup: initial state with component
      state.components = [{ id: "comp-0", type: "switch", position: { x: 10, y: 20 }, state: {} }];
      pushSnapshot(history, state);

      // Modify state
      state.components = [];
      state._nextId = 99;

      // Undo
      const result = undo(history, state);
      expect(result).toBe(true);
      expect(state.components.length).toBe(1);
      expect(state._nextId).toBe(0); // Restored to original
    });

    it("should push current state to redo stack", () => {
      pushSnapshot(history, state);
      state.components = [];

      undo(history, state);
      expect(canRedo(history)).toBe(true);
    });

    it("should be reversible (undo then redo)", () => {
      const initialComponent: EditorState["components"][number] = { id: "comp-0", type: "switch", position: { x: 10, y: 20 }, state: {} };
      state.components = [initialComponent];
      pushSnapshot(history, state);

      // Modify
      state.components = [];

      // Undo
      undo(history, state);
      expect(state.components.length).toBe(1);

      // Should be able to redo
      expect(canRedo(history)).toBe(true);
    });
  });

  describe("redo", () => {
    it("should return false when redo stack is empty", () => {
      const result = redo(history, state);
      expect(result).toBe(false);
    });

    it("should restore state from redo stack", () => {
      pushSnapshot(history, state);
      state.components = [{ id: "comp-0", type: "switch", position: { x: 10, y: 20 }, state: {} }];

      undo(history, state);
      expect(state.components.length).toBe(0);

      redo(history, state);
      expect(state.components.length).toBe(1);
    });

    it("should push current state to undo stack", () => {
      pushSnapshot(history, state);
      state.components = [];
      undo(history, state);

      const undoStackLengthBefore = history.undoStack.length;
      redo(history, state);
      expect(history.undoStack.length).toBeGreaterThan(undoStackLengthBefore);
    });
  });

  describe("canUndo", () => {
    it("should return true only when undo stack is not empty", () => {
      expect(canUndo(history)).toBe(false);

      pushSnapshot(history, state);
      expect(canUndo(history)).toBe(true);
    });
  });

  describe("canRedo", () => {
    it("should return true only when redo stack is not empty", () => {
      expect(canRedo(history)).toBe(false);

      pushSnapshot(history, state);
      undo(history, state);
      expect(canRedo(history)).toBe(true);
    });
  });

  describe("Undo/Redo cycles", () => {
    it("should handle multiple pushes and undos", () => {
      // Savepoint 0: initial (empty) - captured before adding comp-0
      pushSnapshot(history, state);

      // Add comp-0, now state has 1 component
      state.components = [{ id: "comp-0", type: "switch", position: { x: 0, y: 0 }, state: {} }];
      // Savepoint 1: 1 component - captured before adding comp-1
      pushSnapshot(history, state);

      // Add comp-1, now state has 2 components
      state.components.push({ id: "comp-1", type: "light", position: { x: 10, y: 0 }, state: {} });
      // Savepoint 2: 2 components - captured before adding comp-2
      pushSnapshot(history, state);

      // Add comp-2, now state has 3 components
      state.components.push({ id: "comp-2", type: "and-gate", position: { x: 20, y: 0 }, state: {} });
      // NOTE: We do NOT push snapshot here to represent current state with 3 components

      // Undo: restore to savepoint 2 (2 components)
      const undoResult = undo(history, state);
      expect(undoResult).toBe(true);
      expect(state.components.length).toBe(2);

      // Undo: restore to savepoint 1 (1 component)
      undo(history, state);
      expect(state.components.length).toBe(1);

      // Redo: restore to savepoint 2 (2 components)
      redo(history, state);
      expect(state.components.length).toBe(2);

      // Redo: restore to state with 3 components
      redo(history, state);
      expect(state.components.length).toBe(3);
    });

    it("should clear redo when new action occurs after undo", () => {
      pushSnapshot(history, state);
      state.components = [{ id: "comp-0", type: "switch", position: { x: 0, y: 0 }, state: {} }];

      undo(history, state);
      expect(canRedo(history)).toBe(true);

      // New action (simulated by pushing a new snapshot)
      pushSnapshot(history, state);
      expect(canRedo(history)).toBe(false);
    });
  });

  describe("Snapshot capture excludes transient state", () => {
    it("should only capture structural fields", () => {
      state.components = [{ id: "comp-0", type: "switch", position: { x: 10, y: 20 }, state: {} }];
      state.selectedComponentIds.add("comp-0");
      state.hoveredPin = { componentId: "comp-0", pinIndex: 0 };
      state.selectionBox = { start: { x: 0, y: 0 }, current: { x: 10, y: 10 } };

      const snapshot = captureSnapshot(state);

      // Snapshot should only contain structural fields
      expect(snapshot.components).toBeDefined();
      expect(snapshot.wireSegments).toBeDefined();
      expect(snapshot.junctions).toBeDefined();
      expect(snapshot._nextId).toBeDefined();

      // Should not have transient fields
      expect((snapshot as any).selectedComponentIds).toBeUndefined();
      expect((snapshot as any).hoveredPin).toBeUndefined();
      expect((snapshot as any).selectionBox).toBeUndefined();
    });
  });
});
