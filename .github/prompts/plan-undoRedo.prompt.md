## Plan: Undo/Redo (Command History)

Snapshot-based undo/redo. Before each undoable action, deep-clone the circuit-structural state. Ctrl+Z undoes, Ctrl+Y redoes. Max 100 entries. No toolbar buttons.

**Approach:** Snapshot-based (vs command-pattern) — simpler and more reliable since all mutations directly mutate `EditorState`. Circuit data is small arrays of plain objects, so `structuredClone()` is cheap.

**What gets snapshot:** `components`, `wireSegments`, `junctions`, `_nextId`, `_nextWireId`, `_nextJunctionId`  
**Excluded (transient):** selections, cursor, hover, drag state, pending wire, simulation state, nets, events

---

### Phase 1: Core History Module

**Step 1** — Add `CircuitSnapshot` interface to [src/core/types.ts](../../src/core/types.ts)

**Step 2** — Create NEW file [src/state/history.ts](../../src/state/history.ts) with:
- `createHistory()` → `{ undoStack: [], redoStack: [] }`
- `captureSnapshot(state)` → `structuredClone()` of the 6 structural fields
- `pushSnapshot(history, state)` → capture + push to undo stack, clear redo stack, enforce max 100
- `popLastSnapshot(history)` → discard last push (for drag cancellation)
- `undo(history, state)` / `redo(history, state)` → swap current ↔ stack top, return `boolean`
- `canUndo(history)` / `canRedo(history)`

**Step 3** — Re-export from [src/state/index.ts](../../src/state/index.ts) barrel

### Phase 2: Handler Integration

**Step 4** — Extend `HandlerContext` in [src/ui/handlers.ts](../../src/ui/handlers.ts) with `pushSnapshot()` and `popSnapshot()`

**Step 5** — Insert `ctx.pushSnapshot()` at these 7 points:

| Location | Before what |
|---|---|
| `handleNullToolClick()` | `toggleSwitchValue()` |
| `handleWireClick()` — start wire on wire | `addJunction()` + `splitWireAtJunction()` |
| `handleWireClick()` — complete at pin | `addWireSegment()` |
| `handleWireClick()` — complete at wire | `addJunction()` + `splitWireAtJunction()` + `addWireSegment()` |
| `handlePlaceComponent()` | `addComponent()` |
| `handleCanvasMouseDown()` — hit component | `startDrag()` |
| `handleCanvasMouseDown()` — hit junction | `startJunctionDrag()` |

**Step 6** — In `handleCanvasMouseUp()`: if drag was active but `!dragOccurred`, call `ctx.popSnapshot()` to discard the pre-drag snapshot

### Phase 3: Main Integration

**Step 7** — In [src/main.ts](../../src/main.ts):
- Create history with `createHistory()`, wire `pushSnapshot`/`popSnapshot` into `handlerCtx`
- Before `deleteSelected()` on Delete key: `pushSnapshot()`
- Add `Ctrl+Z` → `undo()` → clear selection + pending wire → re-evaluate → save
- Add `Ctrl+Y` → `redo()` → same cleanup → re-evaluate → save
- `e.preventDefault()` to suppress browser Ctrl+Z/Y default

### Phase 4: Tests

**Step 8** — Create [src/__tests__/history.test.ts](../../src/__tests__/history.test.ts):
- Snapshot isolation (deep copy), undo/redo cycle, max limit (100), `popLastSnapshot`, empty stack returns false, redo cleared on new push, component state captured

---

### Verification
1. `npm run build` — no type errors
2. `npm run test` — existing + new tests pass
3. Manual: place → Ctrl+Z → gone → Ctrl+Y → back
4. Manual: drag → Ctrl+Z → original position restored
5. Manual: delete → Ctrl+Z → items restored
6. Manual: undo + new action → redo stack cleared

### Decisions
- **No toolbar buttons** — keyboard shortcuts only
- **100 entry max** — oldest dropped
- **Selection not restored** — cleared on undo (avoids stale ID references)
- **History in memory only** — not persisted to localStorage
- **Re-evaluate after undo/redo** — keeps simulation consistent
