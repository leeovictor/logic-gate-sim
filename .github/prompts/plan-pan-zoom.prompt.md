## Plan: Pan & Zoom for Large Circuit Navigation

Canvas pan (middle-mouse drag or Space+drag) and zoom (mouse wheel) so users can navigate circuits that exceed the viewport. Uses the Canvas 2D context's built-in `translate()`/`scale()` transforms with a `screenToWorld()` inverse function for all input coordinates.

**Approach:** Canvas-level transform applied in the render loop — all existing drawing code works unchanged in "world space" while mouse coordinates are converted from screen space before reaching handlers/hit-tests. This avoids modifying every draw call or hit-test function individually.

- Viewport state (`panX`, `panY`, `zoom`) is **transient** — not persisted to localStorage or shared URLs. Avoids bumping storage format version.
- Zoom is cursor-centered: the world point under the cursor stays fixed during zoom, matching standard editor UX.
- Pan via **middle mouse button drag** (primary) and **Space + left mouse drag** (alternative for trackpad users).
- Screen-space overlays (step counter) are drawn outside the transform so they stay fixed.
- Zoom limits: 0.1× to 5× with 1.1× multiplicative step per wheel tick.
- A **reset viewport** action (Home key) returns to `panX=0, panY=0, zoom=1`.

---

### Phase 1: Types

**Step 1** — Add `Viewport` interface to [src/core/types.ts](src/core/types.ts)
- New interface:
  ```typescript
  export interface Viewport {
    panX: number;
    panY: number;
    zoom: number;
  }
  ```
- Add `viewport: Viewport` field to the `EditorState` interface
- Add `panning: boolean` field to `EditorState` (tracks whether a pan gesture is in progress — prevents click dispatch on pan release)

---

### Phase 2: State Factory & Coordinate Utility

**Step 2** — Initialize viewport in [src/state/editor-state.ts](src/state/editor-state.ts)
- In `createEditorState()`, add:
  ```typescript
  viewport: { panX: 0, panY: 0, zoom: 1 },
  panning: false,
  ```

**Step 3** — Add `screenToWorld()` utility in [src/state/editor-state.ts](src/state/editor-state.ts)
- Export a pure function:
  ```typescript
  export function screenToWorld(screen: Point, viewport: Viewport): Point {
    return {
      x: (screen.x - viewport.panX) / viewport.zoom,
      y: (screen.y - viewport.panY) / viewport.zoom,
    };
  }
  ```
- This is the single coordinate conversion point — all handlers call it to translate `offsetX/offsetY` to world coordinates.

**Step 4** — Re-export `screenToWorld` from [src/state/index.ts](src/state/index.ts)
- Add `screenToWorld` to the existing `export { ... } from "./editor-state"` line.

---

### Phase 3: Viewport Mutations

**Step 5** — Create [src/state/mutations/viewport.ts](src/state/mutations/viewport.ts)
- Three mutation functions:
  ```typescript
  export function panViewport(state: EditorState, deltaX: number, deltaY: number): void {
    state.viewport.panX += deltaX;
    state.viewport.panY += deltaY;
  }

  export function zoomViewport(state: EditorState, factor: number, centerScreen: Point): void {
    const oldZoom = state.viewport.zoom;
    const newZoom = Math.max(0.1, Math.min(5, oldZoom * factor));
    // Adjust pan so the world point under centerScreen stays fixed
    state.viewport.panX = centerScreen.x - (centerScreen.x - state.viewport.panX) * (newZoom / oldZoom);
    state.viewport.panY = centerScreen.y - (centerScreen.y - state.viewport.panY) * (newZoom / oldZoom);
    state.viewport.zoom = newZoom;
  }

  export function resetViewport(state: EditorState): void {
    state.viewport = { panX: 0, panY: 0, zoom: 1 };
  }
  ```

**Step 6** — Export from [src/state/mutations/index.ts](src/state/mutations/index.ts)
- Add `export { panViewport, zoomViewport, resetViewport } from "./viewport";`

**Step 7** — Re-export from [src/state/index.ts](src/state/index.ts)
- Add `panViewport`, `zoomViewport`, `resetViewport` to the mutations re-export block.

---

### Phase 4: Renderer Transform

**Step 8** — Apply viewport transform in [src/ui/renderer.ts](src/ui/renderer.ts)
- In `drawAll()`, after `ctx.clearRect(0, 0, width, height)`:
  ```typescript
  ctx.save();
  ctx.translate(state.viewport.panX, state.viewport.panY);
  ctx.scale(state.viewport.zoom, state.viewport.zoom);
  ```
- After drawing all world-space elements (components, wires, pins, pending wire, selection box, ghost preview), call:
  ```typescript
  ctx.restore();
  ```
- Move `drawStepOverlay(ctx, state, width)` to **after** `ctx.restore()` so it renders in screen space (stays in the top-right corner regardless of pan/zoom).

---

### Phase 5: Handler Coordinate Conversion

**Step 9** — Convert screen→world in [src/ui/handlers.ts](src/ui/handlers.ts)
- Import `screenToWorld` from `@/state`.
- In `handleCanvasClick()` (line ~139): replace `{ x: e.offsetX, y: e.offsetY }` with `screenToWorld({ x: e.offsetX, y: e.offsetY }, state.viewport)`.
- In `handleCanvasMouseDown()` (line ~149): same conversion for `point`.
- In `handleCanvasMouseMove()` (line ~208): same conversion for `point`. Also update `state.cursorPosition` with the **world-space** point (the ghost preview and pending wire use this).
- In `handleCanvasMouseUp()`: no coordinate creation happens here (uses stored state), but add panning logic (see Step 11).

**Step 10** — Add pan gesture handling in [src/ui/handlers.ts](src/ui/handlers.ts)
- Add module-level state for panning:
  ```typescript
  let panStart: Point | null = null;
  let spaceHeld = false;
  ```
- New exported functions:
  - `handlePanStart(state, e)` — called on middle-button mousedown or space+left-button mousedown. Stores `panStart = { x: e.offsetX, y: e.offsetY }` (screen coords, NOT converted). Sets `state.panning = true`.
  - `handlePanMove(state, e)` — called on mousemove when `panStart !== null`. Computes screen-space delta, calls `panViewport(state, dx, dy)`, updates `panStart`.
  - `handlePanEnd(state)` — clears `panStart`, sets `state.panning = false`.

**Step 11** — Guard existing handlers against pan state in [src/ui/handlers.ts](src/ui/handlers.ts)
- In `handleCanvasMouseDown`: if `e.button === 1` (middle), call `handlePanStart` and return early. If `spaceHeld && e.button === 0`, same.
- In `handleCanvasMouseMove`: if `panStart !== null`, call `handlePanMove` and return early (skip all other move logic).
- In `handleCanvasMouseUp`: if `panStart !== null`, call `handlePanEnd` and return early.
- In `handleCanvasClick`: if `state.panning` was recently true, skip click dispatch (the existing `dragOccurred` pattern can be extended — set a `panOccurred` flag).

**Step 12** — Add zoom handler in [src/ui/handlers.ts](src/ui/handlers.ts)
- New exported function:
  ```typescript
  export function handleWheel(state: EditorState, e: WheelEvent): void {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    zoomViewport(state, factor, { x: e.offsetX, y: e.offsetY });
  }
  ```
- Note: `centerScreen` uses raw screen coords (`offsetX/offsetY`) because `zoomViewport` does the math internally.

---

### Phase 6: Main Wiring

**Step 13** — Wire new events in [src/main.ts](src/main.ts)
- Import `handleWheel` from `@/ui/handlers`, and `resetViewport` from `@/state`.
- Add wheel event listener on canvas:
  ```typescript
  canvas.addEventListener("wheel", (e) => {
    handleWheel(state, e);
  }, { passive: false });
  ```
- Add middle-mouse support: the existing `mousedown`/`mousemove`/`mouseup` handlers already delegate to `handleCanvasMouseDown`/`Move`/`Up`, which will handle the pan logic added in Step 10–11.
- Add Space key tracking in the existing `keydown` listener:
  ```typescript
  if (e.code === "Space" && !e.repeat) {
    e.preventDefault();
    // spaceHeld is managed inside handlers.ts — export setSpaceHeld(true/false)
  }
  ```
- Add `keyup` listener for Space release.
- Add Home key shortcut for `resetViewport(state)`.

**Step 14** — Export space-key helper from [src/ui/handlers.ts](src/ui/handlers.ts)
- `export function setSpaceHeld(value: boolean): void { spaceHeld = value; }`
- This allows `main.ts` to notify handlers of Space key state without duplicating state.

---

### Phase 7: Tests

**Step 15** — Add [src/__tests__/viewport.test.ts](src/__tests__/viewport.test.ts)
- Test `screenToWorld()`:
  - Identity viewport (pan=0, zoom=1) → same coords
  - With pan offset → shifted coords
  - With zoom → scaled coords
  - Combined pan+zoom → correct transform
- Test `panViewport()`: delta accumulates on panX/panY
- Test `zoomViewport()`:
  - Zoom in: factor > 1 increases zoom
  - Zoom out: factor < 1 decreases zoom
  - Clamps to [0.1, 5]
  - Cursor-centered: world point under cursor stays fixed after zoom
- Test `resetViewport()`: resets to `{ panX: 0, panY: 0, zoom: 1 }`

---

### Verification
1. `npm run build` — no type errors
2. `npm run test` — all existing + new viewport tests pass
3. Manual testing:
   - **Zoom**: scroll wheel over a component → component grows/shrinks, stays under cursor
   - **Pan**: middle-click drag → circuit moves with cursor; Space + left-drag → same behavior
   - **Place component**: while zoomed/panned, click to place → component appears at correct world position
   - **Draw wire**: while zoomed/panned, wire endpoints snap to correct pins
   - **Select/drag**: while zoomed/panned, selection box and component dragging work correctly
   - **Step overlay**: zoom/pan does not move the step counter overlay
   - **Reset**: press Home → viewport returns to origin at 1× zoom
   - **Zoom limits**: cannot zoom below 0.1× or above 5×

### Decisions
- **Canvas transform over manual offset math** — avoids touching every draw call; ctx.translate/scale handles it at the render level
- **Transient viewport, not persisted** — keeps storage format unchanged; pan/zoom is a navigation concern, not circuit data
- **Cursor-centered zoom** — standard editor UX; the world point under the mouse stays fixed during zoom
- **Middle mouse + Space+drag for pan** — covers both mouse and trackpad users; middle button is expected, Space is the Figma/Photoshop convention
- **`panning` flag on EditorState** — prevents click events from firing when a pan gesture ends (mirrors existing `dragOccurred` pattern)
- **`screenToWorld` as single conversion point** — one function to maintain; all handlers convert at entry, rest of the code stays world-space
- **New mutations file `viewport.ts`** — follows existing pattern of one file per mutation category (drag.ts, selection.ts, etc.)
