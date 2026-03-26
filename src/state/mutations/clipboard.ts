import type {
  EditorState,
  PlacedComponent,
  WireEndpoint,
  WireJunction,
  WireSegment,
} from "@/core/types";

interface ClipboardData {
  components: PlacedComponent[];
  junctions: WireJunction[];
  wires: WireSegment[];
  pasteCount: number;
}

let clipboard: ClipboardData | null = null;

export function copySelection(state: EditorState): void {
  const components = state.components.filter((c) =>
    state.selectedComponentIds.has(c.id),
  );
  const junctions = state.junctions.filter((j) =>
    state.selectedJunctionIds.has(j.id),
  );
  const wires = state.wireSegments.filter((w) =>
    state.selectedWireIds.has(w.id),
  );

  if (components.length === 0 && junctions.length === 0 && wires.length === 0) {
    return;
  }

  clipboard = {
    components: components.map((c) => ({
      id: c.id,
      type: c.type,
      position: { ...c.position },
      state: { ...c.state },
    })),
    junctions: junctions.map((j) => ({
      id: j.id,
      position: { ...j.position },
    })),
    wires: wires.map((w) => ({
      id: w.id,
      from: cloneEndpoint(w.from),
      to: cloneEndpoint(w.to),
      waypoints: w.waypoints ? w.waypoints.map((p) => ({ ...p })) : undefined,
    })),
    pasteCount: 0,
  };
}

export function pasteClipboard(state: EditorState): boolean {
  if (clipboard === null) return false;

  const offset = {
    x: 20 * (clipboard.pasteCount + 1),
    y: 20 * (clipboard.pasteCount + 1),
  };

  // Remap components
  const compIdMap = new Map<string, string>();
  const newComponentIds: string[] = [];
  for (const c of clipboard.components) {
    const newId = `comp-${state._nextId++}`;
    compIdMap.set(c.id, newId);
    state.components.push({
      id: newId,
      type: c.type,
      position: { x: c.position.x + offset.x, y: c.position.y + offset.y },
      state: { ...c.state },
    });
    newComponentIds.push(newId);
  }

  // Remap junctions
  const juncIdMap = new Map<string, string>();
  const newJunctionIds: string[] = [];
  for (const j of clipboard.junctions) {
    const newId = `junction-${state._nextJunctionId++}`;
    juncIdMap.set(j.id, newId);
    state.junctions.push({
      id: newId,
      position: { x: j.position.x + offset.x, y: j.position.y + offset.y },
    });
    newJunctionIds.push(newId);
  }

  // Remap wires
  const newWireIds: string[] = [];
  for (const w of clipboard.wires) {
    const from = remapEndpoint(w.from, compIdMap, juncIdMap, offset);
    const to = remapEndpoint(w.to, compIdMap, juncIdMap, offset);
    if (from === null || to === null) continue;

    const newId = `wire-${state._nextWireId++}`;
    state.wireSegments.push({
      id: newId,
      from,
      to,
      waypoints: w.waypoints
        ? w.waypoints.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y }))
        : undefined,
    });
    newWireIds.push(newId);
  }

  // Update selection to the newly pasted items
  state.selectedComponentIds.clear();
  state.selectedWireIds.clear();
  state.selectedJunctionIds.clear();
  for (const id of newComponentIds) state.selectedComponentIds.add(id);
  for (const id of newJunctionIds) state.selectedJunctionIds.add(id);
  for (const id of newWireIds) state.selectedWireIds.add(id);

  clipboard.pasteCount++;
  return true;
}

function cloneEndpoint(ep: WireEndpoint): WireEndpoint {
  if (ep.type === "pin") {
    return { type: "pin", componentId: ep.componentId, pinIndex: ep.pinIndex };
  }
  if (ep.type === "junction") {
    return { type: "junction", junctionId: ep.junctionId };
  }
  return { type: "point", x: ep.x, y: ep.y };
}

function remapEndpoint(
  ep: WireEndpoint,
  compIdMap: Map<string, string>,
  juncIdMap: Map<string, string>,
  offset: { x: number; y: number },
): WireEndpoint | null {
  if (ep.type === "pin") {
    const newId = compIdMap.get(ep.componentId);
    if (newId === undefined) return null;
    return { type: "pin", componentId: newId, pinIndex: ep.pinIndex };
  }
  if (ep.type === "junction") {
    const newId = juncIdMap.get(ep.junctionId);
    if (newId === undefined) return null;
    return { type: "junction", junctionId: newId };
  }
  // "point" endpoint — offset it
  return { type: "point", x: ep.x + offset.x, y: ep.y + offset.y };
}
