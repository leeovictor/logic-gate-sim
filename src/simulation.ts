import type { EditorState } from "./types";
import { getComponentDef } from "./registry";

export function evaluateCircuit(state: EditorState): void {
  if (!state.simulationEnabled) {
    clearAllPinValues(state);
    return;
  }

  const compIds = state.components.map((c) => c.id);
  const compIndex = new Map(compIds.map((id, i) => [id, i]));
  const n = compIds.length;

  // Build adjacency list and in-degree for Kahn's algorithm
  // Edge: fromComp → toComp (signal flows from output to input)
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());
  const inDegree = new Array(n).fill(0);

  for (const wire of state.wireSegments) {
    // Only process pin-to-pin wire segments
    if (wire.from.type !== "pin" || wire.to.type !== "pin") continue;
    const from = compIndex.get(wire.from.componentId);
    const to = compIndex.get(wire.to.componentId);
    if (from === undefined || to === undefined) continue;
    if (!adj[from].has(to)) {
      adj[from].add(to);
      inDegree[to]++;
    }
  }

  // Kahn's algorithm — topological sort
  const queue: number[] = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  const order: number[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const neighbor of adj[node]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  // Cycle detected — some nodes have nonzero in-degree
  if (order.length < n) {
    clearAllPinValues(state);
    return;
  }

  // Evaluate in topological order
  for (const idx of order) {
    const comp = state.components[idx];
    const def = getComponentDef(comp.type);
    if (!def) continue;

    const inputPins = def.pins.filter((p) => p.direction === "input");
    const inputValues = inputPins.map((_pin, pinIdx) => {
      // Find pin's absolute index in def.pins
      const absPinIndex = def.pins.indexOf(inputPins[pinIdx]);
      // Find wire segment connected to this input pin
      const wire = state.wireSegments.find(
        (w) =>
          w.to.type === "pin" &&
          w.to.componentId === comp.id &&
          w.to.pinIndex === absPinIndex,
      );
      if (!wire) return 0;
      // Only process pin-to-pin connections
      if (wire.from.type !== "pin") return 0;
      // Get the source component's pinValues for the output pin
      const srcComp = state.components.find((c) => c.id === wire.from.componentId);
      if (!srcComp) return 0;
      const pinValues = srcComp.state.pinValues as number[] | undefined;
      return pinValues?.[wire.from.pinIndex] ?? 0;
    });

    const outputValues = def.evaluate(inputValues, comp.state);

    // Build full pinValues array indexed by def.pins order
    const pinValues: number[] = new Array(def.pins.length).fill(0);
    let inputIdx = 0;
    let outputIdx = 0;
    for (let p = 0; p < def.pins.length; p++) {
      if (def.pins[p].direction === "input") {
        pinValues[p] = inputValues[inputIdx++];
      } else {
        pinValues[p] = outputValues[outputIdx++] ?? 0;
      }
    }
    comp.state.pinValues = pinValues;
  }
}

export function clearAllPinValues(state: EditorState): void {
  for (const comp of state.components) {
    delete comp.state.pinValues;
    const def = getComponentDef(comp.type);
    if (def?.defaultState && "value" in def.defaultState) {
      comp.state.value = def.defaultState.value;
    }
  }
}
