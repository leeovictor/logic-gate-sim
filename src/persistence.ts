import type { EditorState, PlacedComponent, Wire } from "./types";

const STORAGE_KEY = "circuit";

interface SerializedCircuit {
  version: 1;
  components: PlacedComponent[];
  wires: Wire[];
  _nextId: number;
  _nextWireId: number;
}

export function saveCircuit(state: EditorState): void {
  const components = state.components.map((c) => ({
    id: c.id,
    type: c.type,
    position: { ...c.position },
    state: stripPinValues(c.state),
  }));

  const serialized: SerializedCircuit = {
    version: 1,
    components,
    wires: state.wires.map((w) => ({ ...w })),
    _nextId: state._nextId,
    _nextWireId: state._nextWireId,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Quota exceeded or other localStorage error — silently ignore
  }
}

export function loadCircuit(): Pick<SerializedCircuit, "components" | "wires" | "_nextId" | "_nextWireId"> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!isValidCircuit(data)) return null;

    return {
      components: data.components,
      wires: data.wires,
      _nextId: data._nextId,
      _nextWireId: data._nextWireId,
    };
  } catch {
    return null;
  }
}

function stripPinValues(state: Record<string, unknown>): Record<string, unknown> {
  const { pinValues, ...rest } = state;
  return rest;
}

function isValidCircuit(data: unknown): data is SerializedCircuit {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (!Array.isArray(obj.components)) return false;
  if (!Array.isArray(obj.wires)) return false;
  if (typeof obj._nextId !== "number") return false;
  if (typeof obj._nextWireId !== "number") return false;
  return true;
}
