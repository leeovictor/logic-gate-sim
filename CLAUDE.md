# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web-based circuit logic simulator built with TypeScript and Vite. The app renders on an HTML5 Canvas element that fills the full browser viewport, with an HTML toolbar overlay for component selection. Modular architecture organized into 4 core layers: `core/`, `state/`, `storage/`, and `ui/`.

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
- **Build tool:** Vite 8 with TypeScript (ES2020 target, ESNext modules, bundler resolution, strict mode)
- **Testing:** Vitest 4 — test files use `*.test.ts` convention under `src/__tests__/` and are excluded from `tsconfig.json` compilation

### Modular Structure

```
src/
├── core/              # Types, registry, simulation, components (no dependencies)
│   ├── types.ts
│   ├── registry.ts
│   ├── simulation.ts
│   └── components/
├── state/             # Editor state factory + mutations (depends on core/)
│   ├── editor-state.ts
│   ├── mutations.ts
│   └── index.ts (barrel export)
├── storage/           # Persistence + URL sharing (depends on core/)
│   ├── persistence.ts
│   └── sharing.ts
├── ui/                # Rendering, handlers, toolbar (depends on core/ + state/)
│   ├── renderer.ts
│   ├── hit-test.ts
│   ├── handlers.ts
│   ├── toolbar.ts
│   ├── toolbar-icons.ts
│   ├── toast.ts
│   └── style.css
├── __tests__/         # All tests (flat structure)
└── main.ts            # Orchestrator
```

## Source Files by Module

### core/
| File | Role |
|---|---|
| `src/core/types.ts` | All interfaces and type unions (`ComponentType`, `ToolMode`, `EditorState`, etc.) |
| `src/core/registry.ts` | `Map<ComponentType, ComponentDef>` — single source of truth for component definitions |
| `src/core/simulation.ts` | `evaluateCircuit()` — topological sort + signal propagation |
| `src/core/components/*.ts` | Individual `ComponentDef` exports (one file per component type) |

### state/
| File | Role |
|---|---|
| `src/state/editor-state.ts` | Factory `createEditorState()` + internal helpers (`endpointsEqual`, `resolveEndpoint`) |
| `src/state/mutations.ts` | All state mutation functions (add/delete components, wires, drag, selection, etc.) |
| `src/state/index.ts` | Barrel export — re-exports factory + mutations for clean imports |

### storage/
| File | Role |
|---|---|
| `src/storage/persistence.ts` | `saveCircuit()`, `loadCircuit()` — localStorage + compression (v1/v2/v3) |
| `src/storage/sharing.ts` | `generateShareUrl()`, `loadFromUrl()`, `copyShareUrl()` — URL-based sharing |

### ui/
| File | Role |
|---|---|
| `src/ui/renderer.ts` | `drawAll()`, `getPinPosition()`, `getEndpointPosition()` — component rendering |
| `src/ui/hit-test.ts` | `hitTest()`, `hitTestPin()`, `hitTestWire()`, `hitTestJunction()` — interaction detection |
| `src/ui/handlers.ts` | Canvas event handlers — delegates to state mutations, triggers re-evaluation |
| `src/ui/toolbar.ts` | `createToolbar()` — HTML toolbar with tool selection |
| `src/ui/toolbar-icons.ts` | SVG icon factories |
| `src/ui/toast.ts` | `showToast()` — temporary notification display |
| `src/ui/style.css` | Global reset, toolbar, canvas, button styles |

| `src/main.ts` | Orchestrator — DOM setup, event wiring, render loop |

## Key Patterns

- **Dependency layers:** core/ ← state/, storage/ ← ui/ ← main.ts. No circular imports allowed.
- **Component definitions** are pure objects with `draw(ctx, x, y)` method — no state, no side effects.
- **Component registry** in `core/registry.ts` maps `ComponentType → ComponentDef`.
- **State mutations** are pure functions exported from `state/mutations.ts` that directly mutate `EditorState`.
- **Barrel export** in `state/index.ts` allows clean imports: `import { createEditorState } from "./state"`.
- **Toolbar** is HTML (not canvas-drawn) for native accessibility.
- **Event flow:** user interaction → handler → state mutation → `evaluateCircuit()` → render loop picks up changes.

## Adding a New Component

1. **Define type:** Add to `ComponentType` union in `src/core/types.ts`
2. **Create definition:** New file `src/core/components/<name>.ts` exporting a `ComponentDef` object
3. **Register:** Import and add to the `Map` in `src/core/registry.ts`
4. **Test:** Add `src/__tests__/<name>.test.ts`

## Canvas Coordinate System

- Origin (0,0) at top-left of the canvas (which sits 48px below viewport top)
- Components positioned by their top-left corner
- Mouse events use `offsetX`/`offsetY` for canvas-local coordinates
