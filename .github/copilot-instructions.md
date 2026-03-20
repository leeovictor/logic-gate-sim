# Project Guidelines

## Overview

Web-based digital logic circuit simulator — TypeScript + Vite, HTML5 Canvas rendering, no external UI frameworks or runtime dependencies. Modular architecture with 4 core layers: `core/` (types, registry, simulation), `state/` (editor state), `storage/` (persistence), and `ui/` (rendering, handlers, toolbar).

## Build and Test

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # Production build → dist/
npm run test         # Vitest — run all tests once
npm run test:watch   # Vitest — watch mode
npx vitest run src/__tests__/file.test.ts  # Single test file
```

- No linter or formatter configured — follow existing code style.
- Tests live in `src/__tests__/*.test.ts`, excluded from `tsconfig.json` compilation.

## Architecture

- **Entry point:** `index.html` → `src/main.ts` (orchestrator, event wiring, render loop)
- **Rendering:** Continuous `requestAnimationFrame` loop — full clear + redraw each frame
- **State:** Mutable `EditorState` object — direct mutation via functions in `state/mutations.ts`
- **Simulation:** Topological sort (Kahn's algorithm) → `evaluate()` per component in dependency order
- **Dependency layers:** core/ (foundation) ← state/, storage/ ← ui/ ← main.ts (no circular imports)

### Modular Source Structure

| Layer | Directory | Purpose |
|---|---|---|
| **core** | `src/core/` | Types, registry, simulation, components — foundation with no internal dependencies |
| **state** | `src/state/` | Editor state factory + all mutation functions — depends only on core/ |
| **storage** | `src/storage/` | localStorage persistence + URL sharing — depends only on core/ |
| **ui** | `src/ui/` | Canvas rendering, hit-testing, event handlers, toolbar — depends on core/ + state/ |
| **tests** | `src/__tests__/` | All tests (flat structure) — tests behavior across modules |

### Key Source Files

| File | Responsibility |
|---|---|
| `src/core/types.ts` | All interfaces and type unions (`ComponentType`, `ToolMode`, `EditorState`, `Point`, etc.) |
| `src/core/registry.ts` | `Map<ComponentType, ComponentDef>` — single source of truth for component definitions, `getComponentDef()` |
| `src/core/simulation.ts` | `evaluateCircuit()` — topological sort via Kahn's algorithm + signal propagation |
| `src/core/components/*.ts` | Individual `ComponentDef` exports (one file per component type) |
| `src/state/editor-state.ts` | Factory `createEditorState()` + internal helpers (`endpointsEqual`, `resolveEndpoint`) |
| `src/state/mutations.ts` | All state mutations: `addComponent`, `selectComponent`, `addWire`, `startDrag`, `toggleSimulation`, etc. |
| `src/state/index.ts` | Barrel export — re-exports factory + mutations for clean `import { ... } from "./state"` |
| `src/storage/persistence.ts` | `saveCircuit()`, `loadCircuit()` — localStorage + fflate compression (v1/v2/v3 + migration) |
| `src/storage/sharing.ts` | `generateShareUrl()`, `loadFromUrl()`, `copyShareUrl()` — URL-based circuit sharing |
| `src/ui/renderer.ts` | `drawAll()`, `getPinPosition()`, `getEndpointPosition()` — renders components, wires, ghost preview |
| `src/ui/hit-test.ts` | `hitTest()`, `hitTestPin()`, `hitTestWire()`, `hitTestJunction()` — collision/interaction detection |
| `src/ui/handlers.ts` | Canvas event handlers — delegates to state mutations, calls `evaluateCircuit()` on changes |
| `src/ui/toolbar.ts` | `createToolbar()` — HTML overlay toolbar with tool-select buttons |
| `src/ui/toolbar-icons.ts` | SVG icon factories |
| `src/ui/toast.ts` | `showToast()` — temporary notification UI |
| `src/ui/style.css` | Global reset, toolbar, canvas, button styles |
| `src/main.ts` | Orchestrator — DOM setup, imports all modules, initializes event loop |

## Adding a New Component

1. **Define type:** Add to the `ComponentType` union in `src/core/types.ts`
2. **Create definition:** New file `src/core/components/<name>.ts` exporting a `ComponentDef` object:
   - `type`, `label`, `width`, `height`
   - `pins: PinDef[]` — positions relative to component top-left
   - `draw(ctx, x, y, state?)` — canvas rendering at absolute coords
   - `evaluate(inputs, state)` — returns `number[]` of output values (0 or 1)
   - `defaultState?` — initial mutable state (e.g., `{ value: 0 }`)
3. **Register:** Import and add to the `Map` in `src/core/registry.ts`
4. **Test:** Add `src/__tests__/<name>.test.ts` — mock canvas context with `vi.fn()`

## Conventions

- **Component definitions** are pure objects (no classes), stateless blueprints with `draw()` and `evaluate()` methods.
- **Pin positions** are relative to the component's top-left corner. Absolute = `component.position + pinDef.{x,y}`.
- **Signals** are `number` (`1` = on, `0` = off), not booleans. Unconnected inputs default to `0`.
- **IDs** are auto-incremented strings: `"comp-0"`, `"comp-1"`, `"wire-0"`, etc.
- **Wire validation:** output→input only, no self-connections, no duplicate wires.
- **Hit testing** iterates components in reverse (last placed = topmost z-order).
- **Selection box** requires components to be fully inside the box (no partial overlap).
- **Toolbar** is HTML overlay (not canvas) for native accessibility.
- **Event flow:** user interaction → handler → state mutation → `evaluateCircuit()` → render loop picks up changes.
- **Barrel export** for `state/` enables clean imports while maintaining module boundaries: `import { createEditorState, addComponent } from "./state"`.

## Canvas Coordinate System

- Origin `(0, 0)` at top-left of the canvas element (48px below viewport top due to toolbar).
- Components positioned by their top-left corner.
- Mouse events use `offsetX`/`offsetY` for canvas-local coordinates.

## Testing Patterns

- Canvas `CanvasRenderingContext2D` is mocked — each method replaced with `vi.fn()`.
- State tests use `createEditorState()` factory — no DOM dependencies.
- `evaluate()` tested with direct input arrays and state objects.
- All tests are synchronous — no async patterns needed.
- Tests remain in `src/__tests__/` (flat structure) — they test integrated behavior across modules.
