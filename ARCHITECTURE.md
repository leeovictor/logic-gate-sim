# Architecture Overview

## Project Purpose

This project is a web-based digital logic circuit simulator built with TypeScript and Vite. It allows users to design, simulate, and share digital circuits using a modern HTML5 Canvas interface, with no external UI frameworks or runtime dependencies.

---

## High-Level Structure

The codebase is organized into four core layers, each with a clear responsibility and strict dependency boundaries:

| Layer      | Directory      | Purpose                                                      |
|-----------|---------------|--------------------------------------------------------------|
| **core**  | `src/core/`    | Types, registry, simulation, and component definitions       |
| **state** | `src/state/`   | Editor state factory and all mutation functions              |
| **storage**| `src/storage/`| Persistence (localStorage, URL sharing, compression)         |
| **ui**    | `src/ui/`      | Canvas rendering, hit-testing, event handlers, toolbar, toast|

- **Entry Point:** `index.html` → `src/main.ts` (orchestrator, event wiring, render loop)
- **Testing:** All tests in `src/__tests__/` (flat structure, Vitest)

---

## Core Concepts

### 1. Component Model
- **Component Definitions:** Pure objects in `src/core/components/` (e.g., AND, OR, NOT gates)
- **Component Registry:** `src/core/registry.ts` — single source of truth for all component types
- **Signals:** Numeric (`0` = off, `1` = on); unconnected inputs default to `0`
- **Pins:** Defined relative to component top-left; absolute position = component position + pin offset

### 2. State Management
- **Editor State:** Mutable object created by `createEditorState()` in `src/state/editor-state.ts`
- **Mutations:** All state changes via pure functions in `src/state/mutations/`
- **Direct Mutation:** State is mutated directly (no Redux/Immer); always followed by simulation re-evaluation

### 3. Simulation Engine
- **Topological Sort:** Kahn's algorithm for dependency ordering
- **Evaluation:** Each component's `evaluate()` method computes outputs from inputs
- **Propagation:** Signals propagate through wires in dependency order

### 4. Rendering & UI
- **Canvas Rendering:** `src/ui/renderer.ts` — full clear + redraw every animation frame
- **Hit Testing:** `src/ui/hit-test.ts` — detects user interaction targets (components, pins, wires)
- **Toolbar:** HTML overlay (`src/ui/toolbar.ts`), not canvas-drawn, for accessibility
- **Event Flow:** User action → handler → state mutation → simulation → render

### 5. Persistence & Sharing
- **Local Storage:** `src/storage/persistence.ts` — save/load circuits with versioned, compressed format
- **URL Sharing:** `src/storage/sharing.ts` — generate/load shareable URLs for circuits

---

## Key Source Files

| File                                 | Responsibility                                    |
|--------------------------------------|---------------------------------------------------|
| `src/core/types.ts`                  | All interfaces and type unions                    |
| `src/core/registry.ts`               | Component registry                                |
| `src/core/simulation.ts`             | Circuit evaluation logic                          |
| `src/core/components/*.ts`           | Individual component definitions                  |
| `src/state/editor-state.ts`          | Editor state factory and helpers                  |
| `src/state/mutations/`               | All state mutation functions                      |
| `src/storage/persistence.ts`         | Local storage persistence                         |
| `src/storage/sharing.ts`             | URL-based sharing                                 |
| `src/ui/renderer.ts`                 | Canvas rendering                                  |
| `src/ui/hit-test.ts`                 | Hit-testing for interaction                       |
| `src/ui/handlers.ts`                 | Canvas event handlers                             |
| `src/ui/toolbar.ts`                  | HTML toolbar overlay                              |
| `src/ui/toast.ts`                    | Temporary notification UI                         |
| `src/main.ts`                        | App orchestrator, event loop, DOM setup           |

---

## Dependency Flow

```
core/ ← state/, storage/ ← ui/ ← main.ts
```
- **No circular imports allowed.**
- Each layer only depends on the layer(s) to its left.

---

## Canvas & Event Model
- **Canvas Origin:** (0,0) at top-left, 48px below viewport top (toolbar height)
- **Component Positioning:** By top-left corner
- **Mouse Events:** Use `offsetX`/`offsetY` for canvas-local coordinates
- **Render Loop:** `requestAnimationFrame` — always full redraw

---

## Testing
- **Framework:** Vitest
- **Location:** `src/__tests__/`
- **Patterns:**
  - Canvas context is mocked
  - State tested via `createEditorState()`
  - All tests are synchronous

---

## Extensibility
- **Adding Components:**
  1. Add type to `ComponentType` in `src/core/types.ts`
  2. Create definition in `src/core/components/`
  3. Register in `src/core/registry.ts`
  4. Add test in `src/__tests__/`

---

## Summary
This architecture enables a modular, testable, and extensible digital logic simulator with a clear separation of concerns, efficient simulation, and a modern, accessible UI.