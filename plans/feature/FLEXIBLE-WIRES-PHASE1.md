# Phase 1: Data Model Redesign

> Part of [FLEXIBLE-WIRES.md](FLEXIBLE-WIRES.md) — Flexible Wires & Robust Simulation

## Step 1.1 — Introduce `WireNode` and `Net` types in `src/types.ts`

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

## Step 1.2 — Update `EditorState` in `src/types.ts`

- Replace `wires: Wire[]` with `wireSegments: WireSegment[]` and `junctions: WireJunction[]`
- Add `_nextJunctionId: number`
- Keep `pendingWire` but change its type to support starting from a pin OR a free point OR a junction
- Add `nets: Net[]` as computed (transient) state for simulation

## Step 1.3 — Update `src/persistence.ts`

- Bump serialization `version` to `2`
- Serialize `wireSegments` and `junctions` instead of `wires`
- Add migration from version 1 → 2 (convert old `Wire[]` to `WireSegment[]`)

## Relevant Files

- `src/types.ts` — Core type changes: `Wire` → `WireSegment`, new `WireJunction`, `Net`, `SignalValue` types; update `EditorState`, `PendingWire`
- `src/persistence.ts` — Version 2 schema, migration from v1

## Verification

1. `npm run build` — no type errors after model changes
2. Persistence migration v1 → v2 tested
