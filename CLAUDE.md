# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web-based circuit logic simulator built with TypeScript and Vite. The app renders on an HTML5 Canvas element that fills the full browser viewport, with an HTML toolbar overlay for component selection. Currently in early development — UI and rendering only, no simulation logic yet.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build (outputs to `dist/`)
- `npm run test` — run all tests once (`vitest run`)
- `npm run test:watch` — run tests in watch mode (`vitest`)
- `npx vitest run src/path/to/file.test.ts` — run a single test file

## Architecture

- **Entry point:** `index.html` loads `src/main.ts` as an ES module
- **Rendering:** Full-viewport `<canvas>` with 2D context, auto-resizes on `window.resize` (height = viewport − 48px toolbar)
- **Render loop:** Continuous `requestAnimationFrame` — clears and redraws every frame (no dirty-rect optimization)
- **Build tool:** Vite 8 with TypeScript (ES2020 target, ESNext modules, bundler resolution, strict mode). No custom `vite.config.ts`.
- **Testing:** Vitest 4 — test files use `*.test.ts` convention under `src/__tests__/` and are excluded from `tsconfig.json` compilation. Canvas context is mocked with `vi.fn()`.

## Source Files

| File | Role |
|---|---|
| `src/main.ts` | Orchestrator — DOM setup, toolbar creation, canvas sizing, event handlers, render loop |
| `src/types.ts` | Core interfaces: `Point`, `ComponentType`, `ComponentDef`, `PlacedComponent`, `EditorState` |
| `src/state.ts` | State factory (`createEditorState`) and mutations (`addComponent`, `setSelectedTool`). Direct mutation, auto-incrementing IDs (`comp-0`, `comp-1`, …) |
| `src/renderer.ts` | Component registry (`Map<ComponentType, ComponentDef>`) and `drawAll()` — renders placed components + ghost preview at cursor (40% opacity) |
| `src/toolbar.ts` | Creates HTML `<div class="toolbar">` with toggle buttons. Calls `onToolSelect(tool \| null)` on click |
| `src/components/and-gate.ts` | `ComponentDef` for AND gate — realistic symbol with arc body, 2 input lines, 1 output line (80×50px) |
| `src/style.css` | Global reset, fixed toolbar (48px, dark theme), canvas positioning, button styles with active state |

## Key Patterns

- **Component definitions** are pure objects with a `draw(ctx, x, y)` method — no state, no side effects, easy to test and extend.
- **Component registry** in `renderer.ts` maps `ComponentType → ComponentDef`. Add new gate types by registering them here.
- **`ComponentType`** is a string union in `types.ts` (currently `"and-gate"`). Extend it when adding new components.
- **Toolbar** is HTML (not canvas-drawn) for native accessibility and hover/focus states.
- **Event flow:** toolbar click → `setSelectedTool` / canvas click → `addComponent` / mousemove → update `cursorPosition` for ghost preview / mouseleave → clear cursor.

## Canvas Coordinate System

- Origin (0,0) at top-left of the canvas (which sits 48px below viewport top).
- Components positioned by their top-left corner.
