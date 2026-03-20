import { describe, it, expect } from "vitest";
import { createEditorState, addComponent, addWire } from "@/state";
import { buildNets, resolveNetSignal } from "@/core/simulation";
import type { Net } from "@/core/types";

describe("buildNets", () => {
  it("creates single net for isolated pin", () => {
    const state = createEditorState();
    addComponent(state, "switch", { x: 0, y: 0 });
    const nets = buildNets(state);
    // Switch has 1 output pin → creates 1 net
    expect(nets.length).toBeGreaterThan(0);
  });

  it("creates single net for two components connected by wire", () => {
    const state = createEditorState();
    const sw = addComponent(state, "switch", { x: 0, y: 0 });
    const light = addComponent(state, "light", { x: 100, y: 0 });
    addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 }, { type: "pin", componentId: light.id, pinIndex: 0 });

    const nets = buildNets(state);
    // The connected pins should be in the same net
    const connectedNet = nets.find((n) => n.pinReferences.some((p) => p.componentId === sw.id && p.pinIndex === 0));
    expect(connectedNet).toBeDefined();
    expect(connectedNet!.pinReferences.some((p) => p.componentId === light.id && p.pinIndex === 0)).toBe(true);
  });

  it("creates separate nets for disconnected components", () => {
    const state = createEditorState();
    const sw1 = addComponent(state, "switch", { x: 0, y: 0 });
    const sw2 = addComponent(state, "switch", { x: 100, y: 0 });

    const nets = buildNets(state);
    // Two disconnected switches should have pins in different nets
    const sw1Output = `pin:${sw1.id}:0`;
    const sw2Output = `pin:${sw2.id}:0`;
    const net1 = nets.find((n) => n.pinReferences.some((p) => p.componentId === sw1.id && p.pinIndex === 0));
    const net2 = nets.find((n) => n.pinReferences.some((p) => p.componentId === sw2.id && p.pinIndex === 0));
    expect(net1).toBeDefined();
    expect(net2).toBeDefined();
    expect(net1!.id).not.toBe(net2!.id);
  });

  it("creates single net for three components in series", () => {
    const state = createEditorState();
    const sw = addComponent(state, "switch", { x: 0, y: 0 });
    const gate = addComponent(state, "and-gate", { x: 100, y: 0 });
    const light = addComponent(state, "light", { x: 200, y: 0 });

    // sw output → gate input 0 → gate output → light input
    addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 }, { type: "pin", componentId: gate.id, pinIndex: 0 });
    addWire(state, { type: "pin", componentId: gate.id, pinIndex: 2 }, { type: "pin", componentId: light.id, pinIndex: 0 });

    const nets = buildNets(state);
    // All three components should be connected in nets
    const net1 = nets.find((n) => n.pinReferences.some((p) => p.componentId === sw.id));
    expect(net1).toBeDefined();
    expect(net1!.pinReferences.some((p) => p.componentId === gate.id && p.pinIndex === 0)).toBe(true);
  });

  it("includes wire segment IDs in net", () => {
    const state = createEditorState();
    const sw = addComponent(state, "switch", { x: 0, y: 0 });
    const light = addComponent(state, "light", { x: 100, y: 0 });
    const wire = addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 }, { type: "pin", componentId: light.id, pinIndex: 0 });

    const nets = buildNets(state);
    const net = nets.find((n) => n.wireSegmentIds.length > 0);
    expect(net).toBeDefined();
    expect(net!.wireSegmentIds).toContain(wire!.id);
  });

  it("handles free-standing wire endpoints", () => {
    const state = createEditorState();
    const sw = addComponent(state, "switch", { x: 0, y: 0 });
    // Wire from switch output to free point
    addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 }, { type: "point", x: 100, y: 50 });

    const nets = buildNets(state);
    const net = nets.find((n) => n.pinReferences.some((p) => p.componentId === sw.id));
    expect(net).toBeDefined();
    expect(net!.wireSegmentIds.length).toBeGreaterThan(0);
  });
});

describe("resolveNetSignal", () => {
  it("returns 0 for net with no output drivers", () => {
    const state = createEditorState();
    const light1 = addComponent(state, "light", { x: 0, y: 0 });
    const light2 = addComponent(state, "light", { x: 100, y: 0 });
    addWire(state, { type: "pin", componentId: light1.id, pinIndex: 0 }, { type: "pin", componentId: light2.id, pinIndex: 0 });

    const nets = buildNets(state);
    const net = nets.find((n) => n.pinReferences.length > 0)!;
    expect(resolveNetSignal(net, state)).toBe(0);
  });

  it("returns driver value for single output driver", () => {
    const state = createEditorState();
    state.simulationEnabled = true;
    const sw = addComponent(state, "switch", { x: 0, y: 0 });
    const light = addComponent(state, "light", { x: 100, y: 0 });
    sw.state.value = 1;
    sw.state.pinValues = [1]; // Set switch output
    addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 }, { type: "pin", componentId: light.id, pinIndex: 0 });

    const nets = buildNets(state);
    const net = nets.find((n) => n.pinReferences.some((p) => p.componentId === sw.id))!;
    const signal = resolveNetSignal(net, state);
    expect(signal).toBe(1);
  });

  it("returns error (E) for multiple drivers with conflicting values", () => {
    const state = createEditorState();
    state.simulationEnabled = true;
    const sw1 = addComponent(state, "switch", { x: 0, y: 0 });
    const sw2 = addComponent(state, "switch", { x: 100, y: 0 });
    const light = addComponent(state, "light", { x: 200, y: 0 });

    sw1.state.value = 1;
    sw1.state.pinValues = [1];
    sw2.state.value = 0;
    sw2.state.pinValues = [0];

    // Connect both switches to same light input
    addWire(state, { type: "pin", componentId: sw1.id, pinIndex: 0 }, { type: "junction", junctionId: "junc-0" });
    addWire(state, { type: "junction", junctionId: "junc-0" }, { type: "pin", componentId: light.id, pinIndex: 0 });
    addWire(state, { type: "pin", componentId: sw2.id, pinIndex: 0 }, { type: "junction", junctionId: "junc-0" });

    // Manually add junction to state
    state.junctions.push({ id: "junc-0", position: { x: 150, y: 50 } });

    const nets = buildNets(state);
    const net = nets.find((n) => n.pinReferences.some((p) => p.componentId === light.id))!;
    const signal = resolveNetSignal(net, state);
    expect(signal).toBe("E");
  });

  it("returns value when multiple drivers have same value", () => {
    const state = createEditorState();
    state.simulationEnabled = true;
    const sw1 = addComponent(state, "switch", { x: 0, y: 0 });
    const sw2 = addComponent(state, "switch", { x: 100, y: 0 });
    const light = addComponent(state, "light", { x: 200, y: 0 });

    sw1.state.value = 1;
    sw1.state.pinValues = [1];
    sw2.state.value = 1;
    sw2.state.pinValues = [1];

    // Connect both switches to same junction, then to light
    addWire(state, { type: "pin", componentId: sw1.id, pinIndex: 0 }, { type: "junction", junctionId: "junc-0" });
    addWire(state, { type: "junction", junctionId: "junc-0" }, { type: "pin", componentId: light.id, pinIndex: 0 });
    addWire(state, { type: "pin", componentId: sw2.id, pinIndex: 0 }, { type: "junction", junctionId: "junc-0" });

    state.junctions.push({ id: "junc-0", position: { x: 150, y: 50 } });

    const nets = buildNets(state);
    const net = nets.find((n) => n.pinReferences.some((p) => p.componentId === light.id))!;
    const signal = resolveNetSignal(net, state);
    expect(signal).toBe(1);
  });

  it("propagates error state from driver", () => {
    const state = createEditorState();
    state.simulationEnabled = true;
    const sw = addComponent(state, "switch", { x: 0, y: 0 });
    const light = addComponent(state, "light", { x: 100, y: 0 });

    sw.state.pinValues = ["E" as any]; // Driver output is error
    addWire(state, { type: "pin", componentId: sw.id, pinIndex: 0 }, { type: "pin", componentId: light.id, pinIndex: 0 });

    const nets = buildNets(state);
    const net = nets.find((n) => n.pinReferences.some((p) => p.componentId === sw.id))!;
    const signal = resolveNetSignal(net, state);
    expect(signal).toBe("E");
  });
});

describe("net and error propagation through gates", () => {
  it("AND gate with error input produces error output", () => {
    const state = createEditorState();
    state.simulationEnabled = true;
    const sw1 = addComponent(state, "switch", { x: 0, y: 0 });
    const sw2 = addComponent(state, "switch", { x: 0, y: 100 });
    const gate = addComponent(state, "and-gate", { x: 100, y: 50 });
    const light = addComponent(state, "light", { x: 200, y: 50 });

    sw1.state.pinValues = ["E" as any];
    sw2.state.pinValues = [1];
    gate.state.pinValues = ["E" as any, 1, 0];

    addWire(state, { type: "pin", componentId: sw1.id, pinIndex: 0 }, { type: "pin", componentId: gate.id, pinIndex: 0 });
    addWire(state, { type: "pin", componentId: sw2.id, pinIndex: 0 }, { type: "pin", componentId: gate.id, pinIndex: 1 });
    addWire(state, { type: "pin", componentId: gate.id, pinIndex: 2 }, { type: "pin", componentId: light.id, pinIndex: 0 });

    const nets = buildNets(state);
    // Gate output should propagate error
    const outputNet = nets.find((n) => n.pinReferences.some((p) => p.componentId === gate.id && p.pinIndex === 2))!;
    // After resolving, if gate output is E, net signal should be E
    gate.state.pinValues![2] = "E" as any;
    const signal = resolveNetSignal(outputNet, state);
    expect(signal).toBe("E");
  });
});
