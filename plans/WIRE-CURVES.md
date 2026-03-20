# Wire Curves Rendering

## Overview

Replace straight-line wire rendering (`lineTo`) with cubic Bézier curves (`bezierCurveTo`). All pins follow a horizontal convention (inputs on left edge, outputs on right edge), so control points extend horizontally from each pin to create smooth S-curves. Only rendering changes — no type or state modifications needed.

## Steps

### Phase 1: Implement Bézier curve rendering

1. **Modify `drawWires()` in `src/renderer.ts`** — Replace `ctx.lineTo(to.x, to.y)` with `ctx.bezierCurveTo()`. Compute two control points that extend horizontally from each pin:
   - CP1 (from output pin, rightward): `(from.x + offset, from.y)`
   - CP2 (toward input pin, leftward): `(to.x - offset, to.y)`
   - `offset = Math.max(Math.abs(to.x - from.x) * 0.5, 40)` — ensures minimum curvature even for short wires

2. **Modify `drawPendingWire()` in `src/renderer.ts`** — Apply the same Bézier logic to the dashed preview wire so it visually matches the final wire.

### Phase 2: Handle edge cases

3. **Backward wires** — When `to.x < from.x` (target left of source), use a larger minimum offset (e.g. 80px) to keep curves readable and avoid collapse.

4. **Very short wires** — Clamp minimum offset so nearby components still get a visible curve instead of a near-straight line.

### Phase 3: Verify

5. **Run `npm run test`** — Existing wire tests are state-only (no rendering assertions on line shapes), so they should pass unchanged.

6. **Manual visual verification** — normal left-to-right wires, backward connections, pending wire preview, simulation colors on curves, short/long wires.

## Relevant files

| File | Change |
|---|---|
| `src/renderer.ts` | **Primary file to modify.** `drawWires()` (line 61–90) and `drawPendingWire()` (line 136–155) both use `ctx.lineTo()` → change to `ctx.bezierCurveTo()` |
| `src/types.ts` | Wire interface — **no changes needed** (control points computed at render time) |
| `src/components/*.ts` | Pin position reference: all inputs at `x=0`, outputs at `x=width` — **no changes needed** |

## Verification

1. `npm run test` — all existing tests pass
2. `npm run dev` — visually confirm curves for horizontal, diagonal, backward, short wires; pending wire preview; simulation coloring

## Decisions

- **Cubic Bézier (not quadratic)** — gives independent control of departure and arrival tangents, producing cleaner S-curves for non-horizontal connections.
- **No type/state changes** — control points are pure render-time computation from pin positions.
- **No wire hit-testing changes** — doesn't exist yet, out of scope.
- **Pending wire also curved** — for visual consistency with completed wires.

## Further Considerations

1. **Offset formula tuning** — `0.5 * dx` with 40px minimum is a starting point; may need visual adjustment after seeing real circuits.
2. **Vertical-only wires** — when components are stacked vertically (`from.x ≈ to.x`), horizontal control points produce a bulging U-shape. Could add vertical offset logic for this case, but recommend starting simple and only handling it if it looks bad in practice.
