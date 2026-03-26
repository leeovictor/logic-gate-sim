import { describe, it, expect } from "vitest";
import {
  createEditorState,
  addComponent,
  addWire,
  toggleSwitchValue,
} from "@/state";
import { evaluateCircuit, clearAllPinValues } from "@/core/simulation";
import type { SignalValue } from "@/core/types";

// Helper: create a basic circuit: Switch → AND ← Switch → Light
function basicAndCircuit() {
  const state = createEditorState();
  const sw1 = addComponent(state, "switch", { x: 0, y: 0 });
  const sw2 = addComponent(state, "switch", { x: 0, y: 100 });
  const gate = addComponent(state, "and-gate", { x: 100, y: 50 });
  const light = addComponent(state, "light", { x: 250, y: 50 });

  // sw1 output(pin 0) → gate input 0 (pin 0)
  addWire(state, { type: "pin", componentId: sw1.id, pinIndex: 0 }, { type: "pin", componentId: gate.id, pinIndex: 0 });
  // sw2 output(pin 0) → gate input 1 (pin 1)
  addWire(state, { type: "pin", componentId: sw2.id, pinIndex: 0 }, { type: "pin", componentId: gate.id, pinIndex: 1 });
  // gate output(pin 2) → light input (pin 0)
  addWire(state, { type: "pin", componentId: gate.id, pinIndex: 2 }, { type: "pin", componentId: light.id, pinIndex: 0 });

  return { state, sw1, sw2, gate, light };
}

describe("evaluateCircuit", () => {
  it("propaga sinais: ambos switches OFF → light OFF", () => {
    const { state, gate, light } = basicAndCircuit();
    
    evaluateCircuit(state);

    const gatePins = gate.state.pinValues as number[];
    expect(gatePins[0]).toBe(0); // input 0
    expect(gatePins[1]).toBe(0); // input 1
    expect(gatePins[2]).toBe(0); // output
    expect(light.state.value).toBe(0);
  });

  it("propaga sinais: um switch ON → light OFF (AND requer ambos)", () => {
    const { state, sw1, gate, light } = basicAndCircuit();
    
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
    addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 }, { type: "pin", componentId: gate.id, pinIndex: 0 });
    
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
    addWire(state, { type: "pin", componentId: sw1.id, pinIndex: 0 }, { type: "pin", componentId: gate1.id, pinIndex: 0 });
    addWire(state, { type: "pin", componentId: sw2.id, pinIndex: 0 }, { type: "pin", componentId: gate1.id, pinIndex: 1 });
    // gate1 output → gate2 input 0, sw3 → gate2 input 1
    addWire(state, { type: "pin", componentId: gate1.id, pinIndex: 2 }, { type: "pin", componentId: gate2.id, pinIndex: 0 });
    addWire(state, { type: "pin", componentId: sw3.id, pinIndex: 0 }, { type: "pin", componentId: gate2.id, pinIndex: 1 });
    // gate2 output → light
    addWire(state, { type: "pin", componentId: gate2.id, pinIndex: 2 }, { type: "pin", componentId: light.id, pinIndex: 0 });

    

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

  it("ciclo estável: converge corretamente", () => {
    const state = createEditorState();
    const gate1 = addComponent(state, "and-gate", { x: 0, y: 0 });
    const gate2 = addComponent(state, "and-gate", { x: 200, y: 0 });

    // Create cycle: gate1 output → gate2 input 0, gate2 output → gate1 input 0
    addWire(state, { type: "pin", componentId: gate1.id, pinIndex: 2 }, { type: "pin", componentId: gate2.id, pinIndex: 0 });
    addWire(state, { type: "pin", componentId: gate2.id, pinIndex: 2 }, { type: "pin", componentId: gate1.id, pinIndex: 0 });

    
    evaluateCircuit(state);

    // Cycle converges: both gates stabilize at [0, 0, 0] (no inputs, so outputs are 0)
    const gate1Pins = gate1.state.pinValues as SignalValue[];
    const gate2Pins = gate2.state.pinValues as SignalValue[];
    expect(gate1Pins[2]).toBe(0); // gate1 output
    expect(gate2Pins[2]).toBe(0); // gate2 output
  });

  it("ciclo com multi-driver detecta error state", () => {
    const state = createEditorState();
    const sw1 = addComponent(state, "switch", { x: 0, y: 0 });
    const sw2 = addComponent(state, "switch", { x: 100, y: 0 });
    const light = addComponent(state, "light", { x: 200, y: 0 });

    // Create a junction and connect both switches to it
    state.junctions.push({ id: "junc-0", position: { x: 150, y: 50 } });

    addWire(state, { type: "pin", componentId: sw1.id, pinIndex: 0 }, { type: "junction", junctionId: "junc-0" });
    addWire(state, { type: "junction", junctionId: "junc-0" }, { type: "pin", componentId: light.id, pinIndex: 0 });
    addWire(state, { type: "pin", componentId: sw2.id, pinIndex: 0 }, { type: "junction", junctionId: "junc-0" });

    
    sw1.state.value = 1;
    sw2.state.value = 0;
    evaluateCircuit(state);

    // Light should receive error state (E) due to conflicting drivers
    expect(light.state.value).toBe("E");
  });

  it("multi-driver com mesmo valor não gera error", () => {
    const state = createEditorState();
    const sw1 = addComponent(state, "switch", { x: 0, y: 0 });
    const sw2 = addComponent(state, "switch", { x: 100, y: 0 });
    const light = addComponent(state, "light", { x: 200, y: 0 });

    state.junctions.push({ id: "junc-0", position: { x: 150, y: 50 } });

    addWire(state, { type: "pin", componentId: sw1.id, pinIndex: 0 }, { type: "junction", junctionId: "junc-0" });
    addWire(state, { type: "junction", junctionId: "junc-0" }, { type: "pin", componentId: light.id, pinIndex: 0 });
    addWire(state, { type: "pin", componentId: sw2.id, pinIndex: 0 }, { type: "junction", junctionId: "junc-0" });

    
    sw1.state.value = 1;
    sw2.state.value = 1;
    evaluateCircuit(state);

    // Light should receive 1 (both drivers agree)
    expect(light.state.value).toBe(1);
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

describe("toggleSwitchValue integration", () => {
  it("toggleSwitchValue reavalia circuito", () => {
    const { state, sw1, sw2, light } = basicAndCircuit();
    evaluateCircuit(state);

    toggleSwitchValue(state, sw1.id);
    evaluateCircuit(state);
    expect(light.state.value).toBe(0); // only 1 switch on

    toggleSwitchValue(state, sw2.id);
    evaluateCircuit(state);
    expect(light.state.value).toBe(1); // both on
  });
});
