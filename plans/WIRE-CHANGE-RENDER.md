# Plan: Orthogonal Wire Rendering with Click-based Waypoints

## TL;DR

Replace Bézier curve wire rendering with axis-aligned (orthogonal) polyline rendering. Users click to place waypoints while drawing wires, creating paths composed of horizontal and vertical segments. The pending wire preview remains a simple straight line to the cursor.

## Context

Currently wires are rendered as cubic Bézier curves via `drawBezierWire()` in `renderer.ts`. Hit-testing samples 20 points along the Bézier path. The data model (`WireSegment`) only stores `from` and `to` endpoints with no intermediate points. This plan adds waypoint support to create orthogonal (Manhattan-style) wire paths.

## Design Decision: Waypoints in WireSegment

Add a `waypoints: Point[]` field to `WireSegment`. The wire path becomes: `from → waypoints[0] → waypoints[1] → ... → to`. Each sub-segment between consecutive points is rendered as a straight line. The user is responsible for clicking positions that create horizontal/vertical segments (no auto-snapping enforced — keeps it "livre").

**Why not use junctions for waypoints?** Junctions are semantic (electrical connection points). Waypoints are purely visual routing. Overloading junctions would conflate concerns and make selection/deletion of visual corners affect electrical connectivity.

---

## Steps

### Phase 1: Data Model

1. **Add `waypoints` to `WireSegment`** in `src/core/types.ts`
   - Add `waypoints?: Point[]` field to `WireSegment` interface (optional for backward compat)
   - Default: `[]` (no waypoints = direct line from→to)

2. **Add `pendingWaypoints` to `EditorState`** in `src/core/types.ts`
   - Add `pendingWaypoints: Point[]` field to `EditorState` to accumulate waypoints while drawing

3. **Initialize `pendingWaypoints`** in `src/state/editor-state.ts`
   - Set `pendingWaypoints: []` in `createEditorState()`

### Phase 2: State Mutations

4. **Update `addWireSegment()`** in `src/state/mutations.ts`
   - Accept optional `waypoints: Point[]` parameter
   - Store waypoints in the created `WireSegment`

5. **Add `addPendingWaypoint()` mutation** in `src/state/mutations.ts`
   - Push a `Point` to `state.pendingWaypoints`

6. **Update `clearPendingWire()` mutation** in `src/state/mutations.ts`
   - Also clear `state.pendingWaypoints` to `[]`

7. **Update barrel export** in `src/state/index.ts`
   - Export `addPendingWaypoint`

### Phase 3: Wire Interaction

8. **Change wire click flow** in `src/ui/handlers.ts` `handleWireClick()`
   - **First click** (start wire): unchanged — sets `pendingWire` endpoint
   - **Intermediate clicks** (when `pendingWire` is set):
     - If click is on a **pin** or **junction** or **existing wire**: complete the wire (same as current "second click" behavior), passing accumulated `pendingWaypoints`
     - If click is on **empty canvas**: add click position to `pendingWaypoints` via `addPendingWaypoint()` — do NOT complete the wire
   - **Right-click**: cancel wire (unchanged, but also clears waypoints)

### Phase 4: Rendering

9. **Replace `drawBezierWire()` with `drawOrthogonalWire()`** in `src/ui/renderer.ts`
   - Build full path: `from → waypoints → to`
   - Draw as polyline: `moveTo(from)` → `lineTo(wp1)` → `lineTo(wp2)` → ... → `lineTo(to)`
   - Each sub-segment is a straight line (the waypoint positions determine if it's H/V — no auto-routing)

10. **Update `drawPendingWire()`** in `src/ui/renderer.ts`
    - Draw committed waypoints as polyline: `from → pendingWaypoints[0] → ... → pendingWaypoints[n]`
    - Draw final segment from last waypoint (or from, if no waypoints) to cursor as a simple straight dashed line (user preference: non-orthogonal preview)

### Phase 5: Hit-Testing

11. **Replace Bézier sampling with polyline distance** in `src/ui/hit-test.ts`
    - Build full path: `from → waypoints → to`
    - For each sub-segment, calculate point-to-line-segment distance
    - Return the nearest sub-segment if within threshold
    - Update return value: `t` should reference position along the full polyline, `position` is the nearest point on the segment

12. **Update `splitWireAtJunction()`** in `src/state/mutations.ts`
    - When splitting a wire at a junction, distribute waypoints correctly between the two new segments based on which sub-segment the split occurs on

### Phase 6: Persistence

13. **Handle `waypoints` in serialization** in `src/storage/persistence.ts`
    - `serializeCircuit()`: include `waypoints` in wire segment serialization (omit if empty for compact output)
    - `loadCircuit()` / migration: existing v2 data without `waypoints` field → treat as `[]`
    - No version bump needed since field is optional and backward-compatible

14. **Handle `waypoints` in binary format** in `src/storage/binary-format.ts`
    - Serialize waypoint count (uint8) + waypoint coordinates (int16 x, int16 y each)
    - This changes the binary wire format, so bump `FORMAT_VERSION` to 4
    - Add fallback for v3 binary data (no waypoints)

### Phase 7: Tests

15. **Update `src/__tests__/wire.test.ts`**
    - Test `addWireSegment()` with waypoints
    - Test waypoint accumulation during pending wire flow

16. **Add rendering/hit-test tests**
    - Test `drawOrthogonalWire` draws polyline path
    - Test hit-testing against polyline segments (not Bézier)

17. **Update persistence tests** in `src/__tests__/persistence.test.ts`
    - Test serialization/deserialization of wires with waypoints
    - Test backward compat: v2 wires without waypoints load as `waypoints: []`

---

## Relevant Files

- `src/core/types.ts` — Add `waypoints` to `WireSegment`, `pendingWaypoints` to `EditorState`
- `src/state/editor-state.ts` — Initialize `pendingWaypoints: []`
- `src/state/mutations.ts` — Update `addWireSegment()`, add `addPendingWaypoint()`, update `clearPendingWire()`, update `splitWireAtJunction()`
- `src/state/index.ts` — Export new mutation
- `src/ui/renderer.ts` — Replace `drawBezierWire()` with polyline, update `drawPendingWire()`
- `src/ui/hit-test.ts` — Replace Bézier sampling with polyline distance in `hitTestWire()`
- `src/ui/handlers.ts` — Change `handleWireClick()` for waypoint interaction
- `src/storage/persistence.ts` — Serialize/deserialize waypoints
- `src/storage/binary-format.ts` — Binary waypoint encoding, bump format version
- `src/__tests__/wire.test.ts` — Wire waypoint tests
- `src/__tests__/persistence.test.ts` — Persistence backward compat tests

## Verification

1. `npm run build` — no type errors after data model changes
2. `npm run test` — all existing tests pass (backward compat)
3. Manual: draw a wire with 2+ waypoints between two components — verify orthogonal polyline rendering
4. Manual: click on an existing wire with waypoints — verify junction split distributes waypoints correctly
5. Manual: save circuit, reload page — verify waypoints persist correctly
6. Manual: share circuit via URL — verify waypoints survive binary encoding
7. Manual: right-click during wire drawing — verify pending waypoints are cleared
8. Manual: load an old circuit (no waypoints) — verify wires render as direct straight lines (backward compat)

## Decisions

- **No auto-snapping**: user freely places waypoints; axis-alignment is the user's responsibility. This matches "livre com cliques."
- **Pending wire preview**: straight line from last point to cursor (not orthogonal), per user preference.
- **Waypoints are optional**: `waypoints?: Point[]` — backward compatible, no persistence version bump for JSON format.
- **Binary format version bump**: v3→v4 required since binary layout changes.
- **Scope exclusion**: no undo/redo for waypoint placement; no drag-to-edit existing waypoints (can be added later).