import type { EditorState, Net, SignalValue, WireEndpoint } from "@/core/types";
import { getComponentDef } from "@/core/registry";

interface UnionFind {
  parent: Map<string, string>;
  find(x: string): string;
  union(x: string, y: string): void;
}

function createUnionFind(): UnionFind {
  const parent = new Map<string, string>();
  return {
    parent,
    find(x: string): string {
      if (!parent.has(x)) parent.set(x, x);
      const p = parent.get(x)!;
      if (p !== x) {
        parent.set(x, this.find(p));
      }
      return parent.get(x)!;
    },
    union(x: string, y: string): void {
      const px = this.find(x);
      const py = this.find(y);
      if (px !== py) {
        parent.set(px, py);
      }
    },
  };
}

function endpointToKey(ep: WireEndpoint): string {
  if (ep.type === "pin") {
    return `pin:${ep.componentId}:${ep.pinIndex}`;
  } else if (ep.type === "junction") {
    return `junction:${ep.junctionId}`;
  } else {
    return `point:${ep.x}:${ep.y}`;
  }
}

export function buildNets(state: EditorState): Net[] {
  const uf = createUnionFind();
  const allEndpoints = new Set<string>();

  // Register all wire endpoints
  for (const wire of state.wireSegments) {
    const fromKey = endpointToKey(wire.from);
    const toKey = endpointToKey(wire.to);
    allEndpoints.add(fromKey);
    allEndpoints.add(toKey);
    uf.union(fromKey, toKey);
  }

  // Add all pins to the endpoint set
  for (const comp of state.components) {
    const def = getComponentDef(comp.type);
    if (!def) continue;
    for (let i = 0; i < def.pins.length; i++) {
      const key = `pin:${comp.id}:${i}`;
      allEndpoints.add(key);
      uf.find(key); // Ensure it's in the parent map
    }
  }

  // Group endpoints by their root
  const netMap = new Map<string, Set<string>>();
  for (const ep of allEndpoints) {
    const root = uf.find(ep);
    if (!netMap.has(root)) {
      netMap.set(root, new Set());
    }
    netMap.get(root)!.add(ep);
  }

  // Convert to Net objects
  const nets: Net[] = [];
  let netIdx = 0;
  for (const endpoints of netMap.values()) {
    const pinRefs: { componentId: string; pinIndex: number }[] = [];
    const wireSegmentIds: string[] = [];
    const junctionIds: string[] = [];

    for (const ep of endpoints) {
      if (ep.startsWith("pin:")) {
        const [_, compId, pinIdx] = ep.split(":");
        pinRefs.push({ componentId: compId, pinIndex: parseInt(pinIdx, 10) });
      } else if (ep.startsWith("junction:")) {
        const juncId = ep.substring(9);
        junctionIds.push(juncId);
      }
    }

    for (const wire of state.wireSegments) {
      const fromKey = endpointToKey(wire.from);
      const toKey = endpointToKey(wire.to);
      const netRoot = uf.find(fromKey);
      if (uf.find(fromKey) === uf.find(toKey)) {
        // Check if this wire belongs to this net
        for (const ep of endpoints) {
          if (uf.find(ep) === netRoot) {
            wireSegmentIds.push(wire.id);
            break;
          }
        }
      }
    }

    nets.push({
      id: `net-${netIdx++}`,
      pinReferences: pinRefs,
      wireSegmentIds,
      junctionIds,
      signalValue: 0,
    });
  }

  return nets;
}

export function resolveNetSignal(net: Net, state: EditorState): SignalValue {
  const drivers: SignalValue[] = [];

  for (const { componentId, pinIndex } of net.pinReferences) {
    const comp = state.components.find((c) => c.id === componentId);
    if (!comp) continue;
    const def = getComponentDef(comp.type);
    if (!def) continue;
    const pin = def.pins[pinIndex];
    if (pin.direction !== "output") continue;

    // Get the output value from pinValues
    const pinValues = comp.state.pinValues as SignalValue[] | undefined;
    const value = pinValues?.[pinIndex] ?? 0;
    drivers.push(value);
  }

  if (drivers.length === 0) {
    return 0; // Floating, default low
  }

  // Check for consistent values or conflicts
  const firstValue = drivers[0];
  for (const value of drivers) {
    if (value !== firstValue) {
      if (value === 'E' || firstValue === 'E') {
        return 'E'; // Error propagates
      }
      // Multiple drivers with conflicting values
      return 'E';
    }
  }

  return firstValue;
}

/**
 * Executes one iteration of evaluation: for each component, read inputs from nets,
 * evaluate, write pinValues; then resolve net signals.
 */
function evaluateOneIteration(state: EditorState): void {
  for (const comp of state.components) {
    const def = getComponentDef(comp.type);
    if (!def) continue;

    // Get input values from nets
    const inputPins = def.pins.filter((p) => p.direction === "input");
    const inputValues: SignalValue[] = inputPins.map((_pin, pinIdx) => {
      const absPinIndex = def.pins.indexOf(inputPins[pinIdx]);
      const net = state.nets.find((n) =>
        n.pinReferences.some(
          (p) => p.componentId === comp.id && p.pinIndex === absPinIndex
        )
      );
      return net?.signalValue ?? 0;
    });

    // Evaluate component
    const outputValues = def.evaluate(inputValues, comp.state);

    // Store output values in pinValues
    const pinValues: SignalValue[] = new Array(def.pins.length).fill(0);
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

  // Resolve net signals
  for (const net of state.nets) {
    net.signalValue = resolveNetSignal(net, state);
  }
}

export function evaluateCircuit(state: EditorState): void {
  // Build nets
  state.nets = buildNets(state);

  // Initialize all nets to 0
  for (const net of state.nets) {
    net.signalValue = 0;
  }

  const MAX_ITERATIONS = 100;
  let didNotConverge = false;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const prevNetValues = new Map(state.nets.map((n) => [n.id, n.signalValue]));

    evaluateOneIteration(state);

    // Check for convergence
    let converged = true;
    for (const net of state.nets) {
      if (prevNetValues.get(net.id) !== net.signalValue) {
        converged = false;
        break;
      }
    }

    if (converged) {
      break;
    }

    if (iter === MAX_ITERATIONS - 1) {
      didNotConverge = true;
    }
  }

  // If circuit did not converge, mark nets as error and clear pinValues
  if (didNotConverge) {
    clearAllPinValues(state);
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
