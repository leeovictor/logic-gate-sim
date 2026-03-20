# Plan: Flexible Wires & Robust Simulation

## TL;DR
Redesign the wire model to support free-standing wires (not necessarily connected to component pins), wire-to-wire connections, and bidirectional pin connections. Introduce a net-based signal resolution system with error state (E) for conflicting signals, replacing the current directional topological-sort simulation with an iterative/event-driven approach that handles cycles gracefully.

---

## Phase 1: Data Model Redesign

### Step 1.1 — Introduce `WireNode` and `Net` types in `src/types.ts`

Currently `Wire` is defined as a point-to-point link between two component pins:
```
Wire { fromComponentId, fromPinIndex, toComponentId, toPinIndex }
```

This model cannot represent:
- A wire endpoint that is not connected to any component pin
- A wire connected to another wire (wire junction)
- Bidirectional connections (input→input or output→output)

**New model — introduce wire segments and nets:**

- **`WireSegment`**: Replaces `Wire`. Represents a visual wire between two `WireEndpoint`s. Each endpoint is either a pin reference `{ componentId, pinIndex }` or a free canvas point `{ x, y }`, or a junction reference `{ junctionId }`.
- **`WireJunction`**: A named point on the canvas where multiple wire segments meet (wire-to-wire connections). Has an `id` and a `position: Point`.
- **`SignalValue`**: `0 | 1 | 'E'` — introduces error state for conflicting signals.
- **`Net`**: A group of connected wire segments and pins that share the same signal. Computed at evaluation time, not stored permanently. A net collects all pins reachable through connected wire segments.
- Remove `PendingWire` constraint on pin direction.
- Keep `Wire` id, `_nextWireId` patterns.

### Step 1.2 — Update `EditorState` in `src/types.ts`

- Replace `wires: Wire[]` with `wireSegments: WireSegment[]` and `junctions: WireJunction[]`
- Add `_nextJunctionId: number`
- Keep `pendingWire` but change its type to support starting from a pin OR a free point OR a junction
- Add `nets: Net[]` as computed (transient) state for simulation

### Step 1.3 — Update `src/persistence.ts`

- Bump serialization `version` to `2`
- Serialize `wireSegments` and `junctions` instead of `wires`
- Add migration from version 1 → 2 (convert old `Wire[]` to `WireSegment[]`)

---

## Phase 2: Wire Tool Interaction Redesign

### Step 2.1 — Update `handleWireClick` in `src/handlers.ts`

Current flow: must start on output pin → end on input pin. New flow:

1. **First click**: Can be on any pin (input or output), on an existing wire segment (creates a junction), or on empty canvas (creates a free endpoint)
2. **Second click**: Can be on any pin, on another wire (creates junction), or on empty canvas (creates free endpoint)
3. **Validation**: Only prevent duplicate segments and zero-length segments. Remove direction restriction entirely.
4. **Cancel**: Right-click or Escape cancels pending wire (same as clicking empty canvas today)

### Step 2.2 — Add wire hit-testing in `src/renderer.ts`

Currently only `hitTestPin` exists. Add:
- `hitTestWire(state, point)`: Returns the wire segment nearest to the click point (within a threshold, e.g., 5px from the Bézier curve). Needed for wire-to-wire connections.
- When the wire tool is active and user clicks near a wire (but not on a pin), create a junction at that point and split the segment, or connect the new wire to a new junction on the existing wire.

### Step 2.3 — Update `PendingWire` type in `src/types.ts`

Change `PendingWire` to support three kinds of starting points:
- `{ kind: 'pin', componentId, pinIndex }`
- `{ kind: 'point', position: Point }` (free endpoint on canvas)
- `{ kind: 'junction', junctionId }` (connecting to existing junction)

### Step 2.4 — Update wire state mutations in `src/state.ts`

- `addWireSegment(state, from: WireEndpoint, to: WireEndpoint)` — replaces `addWire`
- `addJunction(state, position: Point)` — creates a new junction node
- `splitWireAtJunction(state, wireSegmentId, junction)` — splits a wire segment at a junction point
- `removeWireSegment(state, segmentId)` — deletes segment, cleans up orphaned junctions
- Update `removeWiresForComponent` → `removeSegmentsForComponent`
- Update validation: remove direction check, keep duplicate check, keep self-loop check (for pin-to-pin on same component)

---

## Phase 3: Simulation Engine Redesign

### Step 3.1 — Net computation (new function in `src/simulation.ts`)

**`buildNets(state)`**: Groups all electrically connected pins and junctions into nets via flood-fill/union-find:
1. Create a union-find structure over all wire endpoints (pins + junctions)
2. For each wire segment, union its two endpoints
3. Extract disjoint sets — each set is a `Net`
4. For each net, collect all component pins that belong to it

### Step 3.2 — Signal resolution with conflict detection

**`resolveNetSignal(net)`**: Determines the signal value for each net:
1. Collect all **driver pins** (output pins) on the net
2. If **0 drivers**: signal = `0` (floating, default low)
3. If **1 driver**: signal = that driver's output value (`0` or `1`)
4. If **multiple drivers with same value**: signal = that value
5. If **multiple drivers with conflicting values** (some `1`, some `0`): signal = `'E'` (error)

This handles the requirement that a wire receiving both `0` and `1` shows an error state.

### Step 3.3 — Replace topological sort with iterative evaluation

Current approach (Kahn's topological sort) breaks down when:
- Wires are bidirectional (no clear signal direction)
- Cycles exist (current code just clears everything)
- Multiple outputs drive the same net

**New approach — iterative settled-state evaluation:**
1. **Build nets** (`buildNets`)
2. **Initialize**: All nets start at signal `0`
3. **Iterate** (max N iterations, e.g., 100):
   a. For each component in order, propagate input signals from their nets
   b. Call `evaluate()` on each component
   c. For each output pin, push value into the corresponding net
   d. Resolve each net's signal (including conflict → `'E'`)
   e. If no net value changed since last iteration → converged, stop
4. **If not converged after max iterations**: Mark all nets involved in oscillation as `'E'`

This handles cycles (e.g., SR latch oscillation → error), multi-driver conflicts, and doesn't require a DAG structure.

### Step 3.4 — Update `evaluate()` signature for components

Component `evaluate(inputs, state)` currently receives `number[]` inputs. Update to accept `SignalValue[]` (`(0 | 1 | 'E')[]`):
- If any input is `'E'`, the component's output should also be `'E'` (error propagation)
- Update each component in `src/components/*.ts` to handle `'E'` input
- `switch.ts`: No inputs, unaffected
- `light.ts`: If input is `'E'`, set `state.value = 'E'`
- Gates (AND, OR, NOT): If any input is `'E'`, all outputs are `'E'`

---

## Phase 4: Rendering Updates

### Step 4.1 — Update wire rendering in `src/renderer.ts`

- `drawWires` → `drawWireSegments`: Iterate `wireSegments` instead of `wires`
- Handle free endpoints: draw a small circle at the end of unconnected wires
- Handle junction rendering: draw a filled dot at junction points where 3+ wires meet
- Signal coloring:
  - `1` → green (`#22c55e`)
  - `0` → gray (`#6b7280`)
  - `'E'` → red (`#ef4444`) — visually distinct error state
- For wire endpoints that are free points (not connected to pins), render a small open circle

### Step 4.2 — Update pin indicator rendering

- When wire tool is active, highlight ALL pins (not just valid direction targets)
- Color coding: output pins in one color, input pins in another (visual hint, not enforcement)
- Show junction points as hoverable targets

### Step 4.3 — Update component rendering for error state

- `light.ts`: When `state.value === 'E'`, render in red/yellow with "E" label instead of "0"/"1"
- Gates: When output is `'E'`, render output line in red
- Wire signal text/color should reflect error state

---

## Phase 5: Tests

### Step 5.1 — Update existing tests in `src/__tests__/wire.test.ts`

- Update all tests that reference old `Wire` interface to use new `WireSegment`
- Remove tests for direction restriction (no longer enforced)
- Add tests for: wire created from input→input, output→output, any direction
- Add tests for free-standing wire (endpoints not connected to pins)
- Add tests for wire-to-wire junction creation

### Step 5.2 — Update simulation tests in `src/__tests__/simulation.test.ts`

- Update cycle test: instead of clearing all values, cycles should resolve to `'E'` or converge
- Add tests for multi-driver conflict → `'E'` signal
- Add tests for: two switches both outputting to same net, one ON one OFF → `'E'`
- Add tests for: two switches outputting same value → no error
- Add tests for net building (connected components via wire graph)

### Step 5.3 — New test file `src/__tests__/net.test.ts`

- Test `buildNets()` with various topologies
- Test `resolveNetSignal()` with 0, 1, multiple drivers
- Test error propagation through gates

### Step 5.4 — Update component tests

- Update `and-gate.test.ts`, `or-gate.test.ts`, `not-gate.test.ts`, `light.test.ts` for `'E'` input handling

### Step 5.5 — Update persistence tests

- Test migration from version 1 → 2
- Test serialization of new wire segment and junction model

---

## Relevant Files

- `src/types.ts` — Core type changes: `Wire` → `WireSegment`, new `WireJunction`, `Net`, `SignalValue` types; update `EditorState`, `PendingWire`
- `src/state.ts` — Replace `addWire()` with `addWireSegment()`, add `addJunction()`, `splitWireAtJunction()`, update `removeWiresForComponent()`
- `src/handlers.ts` — Rewrite `handleWireClick()` to support free endpoints, any-direction pins, wire-to-wire connections, junction creation
- `src/simulation.ts` — Replace entire `evaluateCircuit()` with net-based iterative evaluation: `buildNets()`, `resolveNetSignal()`, iterative convergence loop
- `src/renderer.ts` — Update `drawWires()`, `drawPinIndicators()`, add junction rendering, add `hitTestWire()`, error state coloring
- `src/components/and-gate.ts` — Handle `'E'` inputs → `'E'` output
- `src/components/or-gate.ts` — Handle `'E'` inputs → `'E'` output
- `src/components/not-gate.ts` — Handle `'E'` inputs → `'E'` output
- `src/components/light.ts` — Handle `'E'` input → display error state
- `src/components/switch.ts` — No changes needed (no inputs)
- `src/persistence.ts` — Version 2 schema, migration from v1
- `src/__tests__/wire.test.ts` — Rewrite for new model
- `src/__tests__/simulation.test.ts` — Update for net-based evaluation + error states
- `src/__tests__/net.test.ts` — New file for net/signal resolution tests
- `src/__tests__/persistence.test.ts` — Migration tests

## Verification

1. `npm run test` — all existing tests pass after migration (adapted to new model)
2. Manual test: place two switches, connect both outputs to same AND gate input via separate wires → verify `'E'` signal  
3. Manual test: create wire starting from empty canvas, ending on empty canvas → wire renders as free-standing  
4. Manual test: click on existing wire mid-segment → junction created, new wire starts from junction  
5. Manual test: connect input pin to input pin → wire created successfully (no direction restriction)  
6. Manual test: create cycle (gate output → own input via chain) → verify `'E'` or convergence, not crash  
7. `npm run build` — production build succeeds with no type errors  

## Decisions

- **Wire model**: Segment-based with explicit junctions (vs. node/edge graph) — chosen for visual fidelity and simpler rendering. Each segment knows its two endpoints.
- **Simulation strategy**: Iterative convergence (vs. event-driven) — simpler to implement correctly, handles cycles naturally, max iteration cap prevents infinite loops.
- **Error signal `'E'`**: Propagates through gates (any `'E'` input → `'E'` output). This is consistent with real hardware behavior where metastable/conflicting signals corrupt downstream logic.
- **Floating nets (no driver)**: Default to `0`, not `'E'`. This matches current behavior (unconnected inputs = 0).
- **Self-connection restriction**: Still prevent connecting a pin to itself (same component, same pin). Allow same-component different-pin connections.
- **Backwards compatibility**: Persistence v1 → v2 migration converts old `Wire[]` to `WireSegment[]` with pin endpoints. No data loss.

## Further Considerations

1. **Junction UX**: When clicking on a wire segment, should we auto-split it and create a junction, or require explicit junction placement? **Recommendation**: Auto-split — it's the intuitive behavior in tools like Logisim/Falstad.
2. **Wire deletion**: Should deleting a wire segment at a junction also remove the junction if only 1 or 0 segments remain? **Recommendation**: Yes, auto-cleanup orphaned junctions to avoid clutter.
3. **Max iteration count**: The iterative simulation needs a cap to prevent infinite loops on oscillating circuits. **Recommendation**: Start with 100 iterations; if not converged, mark oscillating nets as `'E'`. This is tunable later.
