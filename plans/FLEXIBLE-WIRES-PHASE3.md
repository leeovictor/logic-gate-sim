# Phase 3: Simulation Engine Redesign

> Part of [FLEXIBLE-WIRES.md](FLEXIBLE-WIRES.md) — Flexible Wires & Robust Simulation

## Step 3.1 — Net computation (new function in `src/simulation.ts`)

**`buildNets(state)`**: Groups all electrically connected pins and junctions into nets via flood-fill/union-find:
1. Create a union-find structure over all wire endpoints (pins + junctions)
2. For each wire segment, union its two endpoints
3. Extract disjoint sets — each set is a `Net`
4. For each net, collect all component pins that belong to it

## Step 3.2 — Signal resolution with conflict detection

**`resolveNetSignal(net)`**: Determines the signal value for each net:
1. Collect all **driver pins** (output pins) on the net
2. If **0 drivers**: signal = `0` (floating, default low)
3. If **1 driver**: signal = that driver's output value (`0` or `1`)
4. If **multiple drivers with same value**: signal = that value
5. If **multiple drivers with conflicting values** (some `1`, some `0`): signal = `'E'` (error)

This handles the requirement that a wire receiving both `0` and `1` shows an error state.

## Step 3.3 — Replace topological sort with iterative evaluation

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

## Step 3.4 — Update `evaluate()` signature for components

Component `evaluate(inputs, state)` currently receives `number[]` inputs. Update to accept `SignalValue[]` (`(0 | 1 | 'E')[]`):
- If any input is `'E'`, the component's output should also be `'E'` (error propagation)
- Update each component in `src/components/*.ts` to handle `'E'` input
- `switch.ts`: No inputs, unaffected
- `light.ts`: If input is `'E'`, set `state.value = 'E'`
- Gates (AND, OR, NOT): If any input is `'E'`, all outputs are `'E'`

## Relevant Files

- `src/simulation.ts` — Replace entire `evaluateCircuit()` with net-based iterative evaluation: `buildNets()`, `resolveNetSignal()`, iterative convergence loop
- `src/components/and-gate.ts` — Handle `'E'` inputs → `'E'` output
- `src/components/or-gate.ts` — Handle `'E'` inputs → `'E'` output
- `src/components/not-gate.ts` — Handle `'E'` inputs → `'E'` output
- `src/components/light.ts` — Handle `'E'` input → display error state
- `src/components/switch.ts` — No changes needed (no inputs)

## Verification

1. Manual test: place two switches, connect both outputs to same AND gate input via separate wires → verify `'E'` signal
2. Manual test: create cycle (gate output → own input via chain) → verify `'E'` or convergence, not crash
3. `npm run test` — simulation tests pass
