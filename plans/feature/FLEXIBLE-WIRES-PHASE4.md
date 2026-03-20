# Phase 4: Rendering Updates

> Part of [FLEXIBLE-WIRES.md](FLEXIBLE-WIRES.md) — Flexible Wires & Robust Simulation

## Step 4.1 — Update wire rendering in `src/renderer.ts`

- `drawWires` → `drawWireSegments`: Iterate `wireSegments` instead of `wires`
- Handle free endpoints: draw a small circle at the end of unconnected wires
- Handle junction rendering: draw a filled dot at junction points where 3+ wires meet
- Signal coloring:
  - `1` → green (`#22c55e`)
  - `0` → gray (`#6b7280`)
  - `'E'` → red (`#ef4444`) — visually distinct error state
- For wire endpoints that are free points (not connected to pins), render a small open circle

## Step 4.2 — Update pin indicator rendering

- When wire tool is active, highlight ALL pins (not just valid direction targets)
- Color coding: output pins in one color, input pins in another (visual hint, not enforcement)
- Show junction points as hoverable targets

## Step 4.3 — Update component rendering for error state

- `light.ts`: When `state.value === 'E'`, render in red/yellow with "E" label instead of "0"/"1"
- Gates: When output is `'E'`, render output line in red
- Wire signal text/color should reflect error state

## Relevant Files

- `src/renderer.ts` — Update `drawWires()`, `drawPinIndicators()`, add junction rendering, error state coloring
- `src/components/light.ts` — Render error state visually

## Verification

1. Manual test: `'E'` signal renders red on wires and components
2. Manual test: free-standing wire endpoints display small open circle
3. Manual test: junction points render as filled dots
