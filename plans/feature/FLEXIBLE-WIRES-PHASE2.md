# Phase 2: Wire Tool Interaction Redesign

> Part of [FLEXIBLE-WIRES.md](FLEXIBLE-WIRES.md) — Flexible Wires & Robust Simulation

## Step 2.1 — Update `handleWireClick` in `src/handlers.ts`

Current flow: must start on output pin → end on input pin. New flow:

1. **First click**: Can be on any pin (input or output), on an existing wire segment (creates a junction), or on empty canvas (creates a free endpoint)
2. **Second click**: Can be on any pin, on another wire (creates junction), or on empty canvas (creates free endpoint)
3. **Validation**: Only prevent duplicate segments and zero-length segments. Remove direction restriction entirely.
4. **Cancel**: Right-click or Escape cancels pending wire (same as clicking empty canvas today)

## Step 2.2 — Add wire hit-testing in `src/renderer.ts`

Currently only `hitTestPin` exists. Add:
- `hitTestWire(state, point)`: Returns the wire segment nearest to the click point (within a threshold, e.g., 5px from the Bézier curve). Needed for wire-to-wire connections.
- When the wire tool is active and user clicks near a wire (but not on a pin), create a junction at that point and split the segment, or connect the new wire to a new junction on the existing wire.

## Step 2.3 — Update `PendingWire` type in `src/types.ts`

Change `PendingWire` to support three kinds of starting points:
- `{ kind: 'pin', componentId, pinIndex }`
- `{ kind: 'point', position: Point }` (free endpoint on canvas)
- `{ kind: 'junction', junctionId }` (connecting to existing junction)

## Step 2.4 — Update wire state mutations in `src/state.ts`

- `addWireSegment(state, from: WireEndpoint, to: WireEndpoint)` — replaces `addWire`
- `addJunction(state, position: Point)` — creates a new junction node
- `splitWireAtJunction(state, wireSegmentId, junction)` — splits a wire segment at a junction point
- `removeWireSegment(state, segmentId)` — deletes segment, cleans up orphaned junctions
- Update `removeWiresForComponent` → `removeSegmentsForComponent`
- Update validation: remove direction check, keep duplicate check, keep self-loop check (for pin-to-pin on same component)

## Relevant Files

- `src/handlers.ts` — Rewrite `handleWireClick()` to support free endpoints, any-direction pins, wire-to-wire connections, junction creation
- `src/renderer.ts` — Add `hitTestWire()`
- `src/types.ts` — Update `PendingWire` type
- `src/state.ts` — Replace `addWire()` with `addWireSegment()`, add `addJunction()`, `splitWireAtJunction()`, update `removeWiresForComponent()`

## Verification

1. Manual test: create wire starting from empty canvas, ending on empty canvas → wire renders as free-standing
2. Manual test: click on existing wire mid-segment → junction created, new wire starts from junction
3. Manual test: connect input pin to input pin → wire created successfully (no direction restriction)
