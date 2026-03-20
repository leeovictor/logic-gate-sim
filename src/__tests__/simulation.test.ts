import { describe, it, expect } from "vitest";
import {
  createEditorState,
  addComponent,
  addWire,
  toggleSwitchValue,
  toggleSimulation,
} from "../state";
import { evaluateCircuit, clearAllPinValues } from "../simulation";

// Helper: create a basic circuit: Switch → AND ← Switch → Light
function basicAndCircuit() {
  const state = createEditorState();
  const sw1 = addComponent(state, "switch", { x: 0, y: 0 });
  const sw2 = addComponent(state, "switch", { x: 0, y: 100 });
  const gate = addComponent(state, "and-gate", { x: 100, y: 50 });
  const light = addComponent(state, "light", { x: 250, y: 50 });

  // sw1 output(pin 0) → gate input 0 (pin 0)
  addWire(state, { componentId: sw1.id, pinIndex: 0 }, { componentId: gate.id, pinIndex: 0 });
  // sw2 output(pin 0) → gate input 1 (pin 1)
  addWire(state, { componentId: sw2.id, pinIndex: 0 }, { componentId: gate.id, pinIndex: 1 });
  // gate output(pin 2) → light input (pin 0)
  addWire(state, { componentId: gate.id, pinIndex: 2 }, { componentId: light.id, pinIndex: 0 });

  return { state, sw1, sw2, gate, light };
}

describe("evaluateCircuit", () => {
  it("propaga sinais: ambos switches OFF → light OFF", () => {
    const { state, gate, light } = basicAndCircuit();
    state.simulationEnabled = true;
    evaluateCircuit(state);

    const gatePins = gate.state.pinValues as number[];
    expect(gatePins[0]).toBe(0); // input 0
    expect(gatePins[1]).toBe(0); // input 1
    expect(gatePins[2]).toBe(0); // output
    expect(light.state.value).toBe(0);
  });

  it("propaga sinais: um switch ON → light OFF (AND requer ambos)", () => {
    const { state, sw1, gate, light } = basicAndCircuit();
    state.simulationEnabled = true;
    sw1.state.value = 1;
    evaluateCircuit(state);

    const gatePins = gate.state.pinValues as number[];
    expect(gatePins[0]).toBe(1); // input 0 = sw1
    expect(gatePins[1]).toBe(0); // input 1 = sw2
    expect(gatePins[2]).toBe(0); // output = 0 (AND)
    expect(light.state.value).toBe(0);
  });

  it("propaga sinais: ambos switches ON → light ON", () => {
    const { state, sw1, sw2, gate, light } = basicAndCircuit();
    state.simulationEnabled = true;
    sw1.state.value = 1;
    sw2.state.value = 1;
    evaluateCircuit(state);

    const gatePins = gate.state.pinValues as number[];
    expect(gatePins[0]).toBe(1);
    expect(gatePins[1]).toBe(1);
    expect(gatePins[2]).toBe(1);
    expect(light.state.value).toBe(1);
  });

  it("input desconectado default 0", () => {
    const state = createEditorState();
    const sw = addComponent(state, "switch", { x: 0, y: 0 });
    const gate = addComponent(state, "and-gate", { x: 100, y: 0 });

    // Only connect sw to input 0, leave input 1 disconnected
    addWire(state, { componentId: sw.id, pinIndex: 0 }, { componentId: gate.id, pinIndex: 0 });
    state.simulationEnabled = true;
    sw.state.value = 1;
    evaluateCircuit(state);

    const gatePins = gate.state.pinValues as number[];
    expect(gatePins[0]).toBe(1); // connected input
    expect(gatePins[1]).toBe(0); // disconnected → default 0
    expect(gatePins[2]).toBe(0); // AND(1,0) = 0
  });

  it("cadeia: Switch → AND → AND → Light", () => {
    const state = createEditorState();
    const sw1 = addComponent(state, "switch", { x: 0, y: 0 });
    const sw2 = addComponent(state, "switch", { x: 0, y: 100 });
    const sw3 = addComponent(state, "switch", { x: 0, y: 200 });
    const gate1 = addComponent(state, "and-gate", { x: 100, y: 50 });
    const gate2 = addComponent(state, "and-gate", { x: 200, y: 100 });
    const light = addComponent(state, "light", { x: 300, y: 100 });

    // sw1 → gate1 input 0, sw2 → gate1 input 1
    addWire(state, { componentId: sw1.id, pinIndex: 0 }, { componentId: gate1.id, pinIndex: 0 });
    addWire(state, { componentId: sw2.id, pinIndex: 0 }, { componentId: gate1.id, pinIndex: 1 });
    // gate1 output → gate2 input 0, sw3 → gate2 input 1
    addWire(state, { componentId: gate1.id, pinIndex: 2 }, { componentId: gate2.id, pinIndex: 0 });
    addWire(state, { componentId: sw3.id, pinIndex: 0 }, { componentId: gate2.id, pinIndex: 1 });
    // gate2 output → light
    addWire(state, { componentId: gate2.id, pinIndex: 2 }, { componentId: light.id, pinIndex: 0 });

    state.simulationEnabled = true;

    // All off → light off
    evaluateCircuit(state);
    expect(light.state.value).toBe(0);

    // sw1 + sw2 on, sw3 off → light off (gate2 gets 1,0)
    sw1.state.value = 1;
    sw2.state.value = 1;
    evaluateCircuit(state);
    expect(light.state.value).toBe(0);

    // All three on → light on
    sw3.state.value = 1;
    evaluateCircuit(state);
    expect(light.state.value).toBe(1);
  });

  it("simulação desabilitada limpa pinValues", () => {
    const { state, sw1, sw2, gate, light } = basicAndCircuit();
    state.simulationEnabled = true;
    sw1.state.value = 1;
    sw2.state.value = 1;
    evaluateCircuit(state);
    expect(gate.state.pinValues).toBeDefined();
    expect(light.state.value).toBe(1);

    state.simulationEnabled = false;
    evaluateCircuit(state);
    expect(gate.state.pinValues).toBeUndefined();
    expect(light.state.value).toBe(0); // reset to default
  });

  it("ciclo detectado: pula avaliação", () => {
    const state = createEditorState();
    const gate1 = addComponent(state, "and-gate", { x: 0, y: 0 });
    const gate2 = addComponent(state, "and-gate", { x: 200, y: 0 });

    // Create cycle: gate1 output → gate2 input 0, gate2 output → gate1 input 0
    addWire(state, { componentId: gate1.id, pinIndex: 2 }, { componentId: gate2.id, pinIndex: 0 });
    addWire(state, { componentId: gate2.id, pinIndex: 2 }, { componentId: gate1.id, pinIndex: 0 });

    state.simulationEnabled = true;
    evaluateCircuit(state);

    // Should not crash and pinValues should be cleared
    expect(gate1.state.pinValues).toBeUndefined();
    expect(gate2.state.pinValues).toBeUndefined();
  });
});

describe("clearAllPinValues", () => {
  it("reseta pinValues e state.value para defaults", () => {
    const state = createEditorState();
    const sw = addComponent(state, "switch", { x: 0, y: 0 });
    const light = addComponent(state, "light", { x: 100, y: 0 });

    sw.state.pinValues = [1];
    sw.state.value = 1;
    light.state.pinValues = [1];
    light.state.value = 1;

    clearAllPinValues(state);

    expect(sw.state.pinValues).toBeUndefined();
    expect(sw.state.value).toBe(0);
    expect(light.state.pinValues).toBeUndefined();
    expect(light.state.value).toBe(0);
  });
});

describe("toggleSimulation integration", () => {
  it("toggleSimulation habilita e avalia circuito", () => {
    const { state, sw1, sw2, light } = basicAndCircuit();
    sw1.state.value = 1;
    sw2.state.value = 1;

    toggleSimulation(state);
    expect(state.simulationEnabled).toBe(true);
    expect(light.state.value).toBe(1);
  });

  it("toggleSimulation desabilita e limpa pinValues", () => {
    const { state, sw1, sw2, gate, light } = basicAndCircuit();
    sw1.state.value = 1;
    sw2.state.value = 1;

    toggleSimulation(state); // enable
    expect(light.state.value).toBe(1);

    toggleSimulation(state); // disable
    expect(state.simulationEnabled).toBe(false);
    expect(gate.state.pinValues).toBeUndefined();
    expect(light.state.value).toBe(0);
  });

  it("toggleSwitchValue reavalia quando simulação ativa", () => {
    const { state, sw1, sw2, light } = basicAndCircuit();
    toggleSimulation(state); // enable

    toggleSwitchValue(state, sw1.id);
    expect(light.state.value).toBe(0); // only 1 switch on

    toggleSwitchValue(state, sw2.id);
    expect(light.state.value).toBe(1); // both on
  });
});
