# Project Guidelines

## Overview

Web-based digital logic circuit simulator — TypeScript + Vite, HTML5 Canvas rendering, no external UI frameworks or runtime dependencies. Currently supports AND gate, switch, and light components with wire connections and real-time simulation.

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

- **Entry point:** `index.html` → `src/main.ts` (DOM setup, event wiring, render loop)
- **Rendering:** Continuous `requestAnimationFrame` loop — full clear + redraw each frame
- **State:** Mutable `EditorState` object — direct mutation, no immutability library
- **Simulation:** Topological sort (Kahn's algorithm) → `evaluate()` per component in dependency order

### Key source files

| File | Responsibility |
|---|---|
| `src/types.ts` | All interfaces and type unions (`ComponentType`, `ToolMode`, `PinDef`, `Wire`, `EditorState`, etc.) |
| `src/state.ts` | State factory + all mutation functions (add/delete components, wires, drag, selection) |
| `src/registry.ts` | `Map<ComponentType, ComponentDef>` — single source of truth for component definitions |
| `src/renderer.ts` | `drawAll()`, hit-testing (`hitTest`, `hitTestPin`), `getPinPosition()` |
| `src/handlers.ts` | Canvas event handlers — delegates to state mutations, calls `reEvaluate()` |
| `src/simulation.ts` | `evaluateCircuit()` — topological sort + signal propagation |
| `src/toolbar.ts` | HTML toolbar creation with tool-select buttons |
| `src/components/*.ts` | Individual `ComponentDef` exports (one file per component type) |

## Adding a New Component

1. **Define type:** Add to the `ComponentType` union in `src/types.ts`
2. **Create definition:** New file `src/components/<name>.ts` exporting a `ComponentDef` object:
   - `type`, `label`, `width`, `height`
   - `pins: PinDef[]` — positions relative to component top-left
   - `draw(ctx, x, y, state?)` — canvas rendering at absolute coords
   - `evaluate(inputs, state)` — returns `number[]` of output values (0 or 1)
   - `defaultState?` — initial mutable state (e.g., `{ value: 0 }`)
3. **Register:** Import and add to the `Map` in `src/registry.ts`
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
- **Event flow:** user interaction → handler → state mutation → `reEvaluate()` → render loop picks up changes.

## Canvas Coordinate System

- Origin `(0, 0)` at top-left of the canvas element (48px below viewport top due to toolbar).
- Components positioned by their top-left corner.
- Mouse events use `offsetX`/`offsetY` for canvas-local coordinates.

## Testing Patterns

- Canvas `CanvasRenderingContext2D` is mocked — each method replaced with `vi.fn()`.
- State tests use `createEditorState()` factory — no DOM dependencies.
- `evaluate()` tested with direct input arrays and state objects.
- All tests are synchronous — no async patterns needed.
