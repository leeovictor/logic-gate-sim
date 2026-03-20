import type { EditorState, Point } from "@/core/types";
import { getComponentDef } from "@/core/registry";
import { resolveEndpoint } from "../editor-state";
import { removeWireSegment, removeSegmentsForComponent } from "./wire";

export function selectComponent(state: EditorState, id: string): void {
  state.selectedComponentIds.clear();
  state.selectedComponentIds.add(id);
}

export function toggleComponentSelection(state: EditorState, id: string): void {
  if (state.selectedComponentIds.has(id)) {
    state.selectedComponentIds.delete(id);
  } else {
    state.selectedComponentIds.add(id);
  }
}

export function selectWire(state: EditorState, wireId: string): void {
  state.selectedComponentIds.clear();
  state.selectedWireIds.clear();
  state.selectedWireIds.add(wireId);
}

export function toggleWireSelection(state: EditorState, wireId: string): void {
  if (state.selectedWireIds.has(wireId)) {
    state.selectedWireIds.delete(wireId);
  } else {
    state.selectedWireIds.add(wireId);
  }
}

export function selectJunction(state: EditorState, junctionId: string): void {
  state.selectedComponentIds.clear();
  state.selectedWireIds.clear();
  state.selectedJunctionIds.clear();
  state.selectedJunctionIds.add(junctionId);
}

export function toggleJunctionSelection(state: EditorState, junctionId: string): void {
  if (state.selectedJunctionIds.has(junctionId)) {
    state.selectedJunctionIds.delete(junctionId);
  } else {
    state.selectedJunctionIds.add(junctionId);
  }
}

export function clearSelection(state: EditorState): void {
  state.selectedComponentIds.clear();
  state.selectedWireIds.clear();
  state.selectedJunctionIds.clear();
}

export function deleteSelected(state: EditorState): void {
  if (state.selectedComponentIds.size === 0 && state.selectedWireIds.size === 0 && state.selectedJunctionIds.size === 0) return;
  for (const id of state.selectedComponentIds) {
    removeSegmentsForComponent(state, id);
  }
  state.components = state.components.filter(
    (c) => !state.selectedComponentIds.has(c.id),
  );
  state.selectedComponentIds.clear();
  for (const wireId of state.selectedWireIds) {
    removeWireSegment(state, wireId);
  }
  state.selectedWireIds.clear();
  // Delete junction + all segments connecting to it
  for (const junctionId of state.selectedJunctionIds) {
    state.wireSegments = state.wireSegments.filter(
      (w) =>
        !(w.from.type === "junction" && w.from.junctionId === junctionId) &&
        !(w.to.type === "junction" && w.to.junctionId === junctionId),
    );
    state.junctions = state.junctions.filter((j) => j.id !== junctionId);
  }
  state.selectedJunctionIds.clear();
}

export function startSelectionBox(state: EditorState, point: Point): void {
  state.selectionBox = { start: { ...point }, current: { ...point } };
}

export function updateSelectionBox(state: EditorState, point: Point): void {
  if (!state.selectionBox) return;
  state.selectionBox.current = point;
}

export function endSelectionBox(state: EditorState, ctrlKey: boolean): void {
  if (!state.selectionBox) return;
  const { start, current } = state.selectionBox;
  const left = Math.min(start.x, current.x);
  const right = Math.max(start.x, current.x);
  const top = Math.min(start.y, current.y);
  const bottom = Math.max(start.y, current.y);

  if (!ctrlKey) {
    state.selectedComponentIds.clear();
    state.selectedWireIds.clear();
    state.selectedJunctionIds.clear();
  }

  for (const comp of state.components) {
    const def = getComponentDef(comp.type);
    if (!def) continue;
    const cx = comp.position.x;
    const cy = comp.position.y;
    if (
      cx >= left &&
      cy >= top &&
      cx + def.width <= right &&
      cy + def.height <= bottom
    ) {
      state.selectedComponentIds.add(comp.id);
    }
  }

  for (const wire of state.wireSegments) {
    const fromPos = resolveEndpoint(state, wire.from);
    const toPos = resolveEndpoint(state, wire.to);
    if (!fromPos || !toPos) continue;
    if (
      fromPos.x >= left && fromPos.x <= right && fromPos.y >= top && fromPos.y <= bottom &&
      toPos.x >= left && toPos.x <= right && toPos.y >= top && toPos.y <= bottom
    ) {
      state.selectedWireIds.add(wire.id);
    }
  }

  for (const junction of state.junctions) {
    const { x, y } = junction.position;
    if (x >= left && x <= right && y >= top && y <= bottom) {
      state.selectedJunctionIds.add(junction.id);
    }
  }

  state.selectionBox = null;
}
