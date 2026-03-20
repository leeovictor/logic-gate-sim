# Toolbar Visual Overhaul — Icons + Light Theme

## Overview

Replace all text labels in the toolbar with inline SVG icons that visually represent each tool, and switch the toolbar from a dark glassmorphism theme to a light one that's still distinguishable from the white canvas background.

## Phase 1: Create SVG Icon Helpers

Create `src/toolbar-icons.ts` — a module exporting functions that return `SVGElement` for each tool:

- `selectIcon()`: Mouse cursor/pointer arrow icon
- `wireIcon()`: Horizontal/diagonal line with endpoint dots
- `andGateIcon()`: Simplified AND gate shape (flat left + arc right, matching `and-gate.ts` draw logic)
- `orGateIcon()`: Simplified OR gate shape (concave left + convex right tip, matching `or-gate.ts` draw logic)
- `notGateIcon()`: Triangle + inversion bubble (matching `not-gate.ts` draw logic)
- `switchIcon()`: Rectangle body with output line stub (matching `switch.ts` draw logic)
- `lightIcon()`: Circle body with input line stub (matching `light.ts` draw logic)
- `simulateIcon()`: Lightning bolt SVG (replacing the ⚡ emoji for consistency)

All icons: ~24×24 viewBox, stroke-based with `currentColor` so they inherit CSS color.

## Phase 2: Modify Toolbar to Use Icons

**Update `src/toolbar.ts`** — Replace text `<span>` labels with SVG elements:

- Import icon factory functions from `src/toolbar-icons.ts`
- For each button, call the corresponding icon function instead of creating a text span
- Add `title` + `aria-label` on each button for accessibility (tooltip shows tool name)
- Keep `<span class="shortcut-hint">` below each icon
- Map `ToolMode` IDs to icon functions via a lookup object

**Update dropdown trigger logic** — Currently sets `trigLabel.textContent = itemLabelText + " ▾"`:

- Replace the SVG child inside the trigger button with the selected gate's icon
- Append a small "▾" chevron span after the icon
- On deselect, revert to a default gate icon (AND gate shape)

## Phase 3: Light Theme CSS

**Update `src/style.css`** — Full dark → light color scheme overhaul:

| Selector / Property | Old (dark) | New (light) |
|---|---|---|
| `.toolbar` background | `rgba(30, 30, 30, 0.85)` | `rgba(245, 245, 245, 0.88)` |
| `.toolbar` border | `rgba(255, 255, 255, 0.1)` | `rgba(0, 0, 0, 0.12)` |
| `.toolbar` box-shadow | `0 4px 24px rgba(0, 0, 0, 0.4)` | `0 4px 24px rgba(0, 0, 0, 0.12)` |
| `.toolbar button` color | `#bbb` | `#555` |
| `.toolbar button:hover` bg | `rgba(255, 255, 255, 0.1)` | `rgba(0, 0, 0, 0.07)` |
| `.toolbar button:hover` color | `#eee` | `#222` |
| `.toolbar button.active` bg | `#264f78` | `#dbeafe` |
| `.toolbar button.active` border | `#3a8fd6` | `#3b82f6` |
| `.toolbar button.active` color | `#fff` | `#1d4ed8` |
| `.shortcut-hint` color | `#666` | `#999` |
| `.separator` bg | `rgba(255, 255, 255, 0.15)` | `rgba(0, 0, 0, 0.12)` |
| `.sim-toggle.active` bg | `#166534` | `#dcfce7` |
| `.sim-toggle.active` border | `#22c55e` | `#16a34a` |
| `.sim-toggle.active` color | `#fff` | `#166534` |
| `.dropdown` bg | `rgba(30, 30, 30, 0.92)` | `rgba(248, 248, 248, 0.95)` |
| `.dropdown` border | `rgba(255, 255, 255, 0.1)` | `rgba(0, 0, 0, 0.1)` |

Add SVG sizing rule: `.toolbar button svg { width: 24px; height: 24px; }`

## Phase 4: Button Layout Adjustments

Adjust button dimensions in CSS — icons are more compact than text:

- Reduce horizontal padding for icon-only layout
- Ensure consistent button height
- Adjust gap between icon and shortcut hint
- Possibly add `min-width` for uniform sizing

## Relevant Files

| File | Action |
|---|---|
| `src/toolbar-icons.ts` | **NEW** — SVG icon factory functions |
| `src/toolbar.ts` | Replace text with SVG icons, update dropdown trigger |
| `src/style.css` | Full color overhaul + SVG sizing + layout tweaks |
| `src/components/and-gate.ts` | Reference for AND gate icon shape |
| `src/components/or-gate.ts` | Reference for OR gate icon shape |
| `src/components/not-gate.ts` | Reference for NOT gate icon shape |
| `src/components/switch.ts` | Reference for switch icon shape |
| `src/components/light.ts` | Reference for light icon shape |

## Verification

1. `npm run build` — TypeScript compiles with new module
2. `npm run dev` — Visual check:
   - All 5 top-level toolbar buttons show icons (Select cursor, Gates icon, Wire line, Switch rect, Light circle)
   - Gates dropdown shows AND / OR / NOT gate icons
   - Selecting a gate updates the trigger icon to match the selected gate
   - Shortcut hints still visible below icons
   - Keyboard shortcuts still work (1–5, T, Escape)
   - Hover tooltips show tool names
   - Light theme: toolbar is visually light, distinguishable from white canvas background
   - Active states: blue highlight for tools, green for simulate
   - Dropdown opens/closes correctly with light theme
3. `npm run test` — No existing tests break

## Design Decisions

- **SVG over canvas icons** — SVGs integrate naturally in HTML, scale with CSS, and inherit `currentColor` for color transitions on hover/active. Matches the project convention of toolbar as HTML overlay.
- **`currentColor` stroke** — One CSS `color` property controls icon color across all states (default, hover, active).
- **Light semi-transparent white with backdrop blur** — Keeps the glassmorphism aesthetic while being clearly distinct from the plain white canvas.
- **Scope** — Toolbar visuals only. No changes to canvas rendering, component logic, or simulation.
