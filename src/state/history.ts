import type { EditorState, CircuitSnapshot } from "@/core/types";

const MAX_HISTORY_SIZE = 100;

export interface History {
  undoStack: CircuitSnapshot[];
  redoStack: CircuitSnapshot[];
}

/**
 * Create a new history object
 */
export function createHistory(): History {
  return {
    undoStack: [],
    redoStack: [],
  };
}

/**
 * Capture a snapshot of the circuit-structural state
 */
export function captureSnapshot(state: EditorState): CircuitSnapshot {
  return {
    components: structuredClone(state.components),
    wireSegments: structuredClone(state.wireSegments),
    junctions: structuredClone(state.junctions),
    _nextId: state._nextId,
    _nextWireId: state._nextWireId,
    _nextJunctionId: state._nextJunctionId,
  };
}

/**
 * Push a new snapshot to the undo stack
 * - Captures current state
 * - Clears redo stack
 * - Enforces max size by removing oldest (bottom of stack)
 */
export function pushSnapshot(history: History, state: EditorState): void {
  history.undoStack.push(captureSnapshot(state));
  history.redoStack = [];

  // Enforce max size
  if (history.undoStack.length > MAX_HISTORY_SIZE) {
    history.undoStack.shift(); // Remove oldest
  }
}

/**
 * Remove the last pushed snapshot without clearing redo stack
 * Used when drag is cancelled
 */
export function popLastSnapshot(history: History): void {
  if (history.undoStack.length > 0) {
    history.undoStack.pop();
  }
}

/**
 * Undo: Pop snapshot from undo stack, restore to state, push previous state to redo stack
 * Returns true if undo was performed, false if undo stack is empty
 */
export function undo(history: History, state: EditorState): boolean {
  if (history.undoStack.length === 0) {
    return false;
  }

  // Push current state to redo stack before restoring
  history.redoStack.push(captureSnapshot(state));

  // Pop from undo stack and restore
  const snapshot = history.undoStack.pop()!;
  restoreSnapshot(state, snapshot);

  return true;
}

/**
 * Redo: Pop snapshot from redo stack, restore to state, push previous state to undo stack
 * Returns true if redo was performed, false if redo stack is empty
 */
export function redo(history: History, state: EditorState): boolean {
  if (history.redoStack.length === 0) {
    return false;
  }

  // Push current state to undo stack before restoring
  history.undoStack.push(captureSnapshot(state));

  // Pop from redo stack and restore
  const snapshot = history.redoStack.pop()!;
  restoreSnapshot(state, snapshot);

  return true;
}

/**
 * Check if undo is available
 */
export function canUndo(history: History): boolean {
  return history.undoStack.length > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(history: History): boolean {
  return history.redoStack.length > 0;
}

/**
 * Restore state from a snapshot
 */
function restoreSnapshot(state: EditorState, snapshot: CircuitSnapshot): void {
  state.components = structuredClone(snapshot.components);
  state.wireSegments = structuredClone(snapshot.wireSegments);
  state.junctions = structuredClone(snapshot.junctions);
  state._nextId = snapshot._nextId;
  state._nextWireId = snapshot._nextWireId;
  state._nextJunctionId = snapshot._nextJunctionId;
}
