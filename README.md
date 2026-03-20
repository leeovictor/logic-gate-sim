# Web-Based Circuit Logic Simulator

A browser-based digital logic circuit editor and simulator built with TypeScript and Vite. Design circuits by placing logic gates on a canvas, connecting them with wires, and watching signals propagate in real time — all in the browser with zero installation. 

**Online demo:** https://leeovictor.github.io/logic-gate-sim/

## Features

### Circuit Design
- Full-viewport HTML5 Canvas rendering
- Toolbar with selectable component modes
- Place logic gates by clicking the canvas
- Ghost preview follows cursor while placing
- Wire connections between component pins (output → input)
- Select, drag, and multi-select components (Ctrl+click and selection box)
- Undo/redo support (Ctrl+Z / Ctrl+Shift+Z)

### Simulation
- Real-time circuit evaluation with topological sort (Kahn's algorithm)
- Cycle detection and graceful handling
- Toggle switch inputs by clicking in select mode
- Light component as visual output indicator
- Signal propagation: `1` (on) / `0` (off)

### Supported Components
- **AND Gate** — logical AND of 2 inputs
- **OR Gate** — logical OR of 2 inputs  
- **NOT Gate** — logical NOT (inverter)
- **Switch** — toggle input (0/1)
- **Light** — output indicator (visual feedback)

### Data Persistence & Sharing
- Save/load circuits in browser localStorage
- Export circuits as compressed shareable URLs
- Import circuits from shared links
- JSON circuit format with optional compression

## Getting Started

### Prerequisites
- Node.js 18 or later
- npm or yarn

### Installation & Development

```bash
# Clone and install
git clone https://github.com/leeovictor/logic-gate-sim.git
cd web-based-circuit-logic-simulator
npm install

# Start dev server (opens at http://localhost:5173)
npm run dev
```

### Build for Production

```bash
npm run build
# Outputs to dist/
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Create optimized production build in `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run all tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
  main.ts                         # Orchestrator — canvas setup, event wiring, render loop
  
  core/                           # Foundation layer (no dependencies)
    types.ts                      # Type unions & interfaces (ComponentType, ToolMode, EditorState, etc.)
    registry.ts                   # Map<ComponentType, ComponentDef> — component definitions registry
    simulation.ts                 # evaluateCircuit() — topological sort + signal propagation
    components/
      and-gate.ts                 # AND gate component definition
      or-gate.ts                  # OR gate component definition
      not-gate.ts                 # NOT gate component definition
      switch.ts                   # Switch (toggle input)
      light.ts                    # Light (output indicator)
  
  state/                          # Editor state & mutations (depends on core/)
    editor-state.ts               # createEditorState() factory + helpers
    mutations.ts                  # All state mutations (addComponent, addWire, selectComponent, etc.)
    index.ts                      # Barrel export for clean imports
  
  storage/                        # Persistence & sharing (depends on core/)
    persistence.ts                # saveCircuit(), loadCircuit() — localStorage + compression
    sharing.ts                    # generateShareUrl(), loadFromUrl(), copyShareUrl()
  
  ui/                             # Rendering & interaction (depends on core/ + state/)
    renderer.ts                   # drawAll(), getPinPosition(), getEndpointPosition()
    hit-test.ts                   # hitTest(), hitTestPin(), hitTestWire(), hitTestJunction()
    handlers.ts                   # Canvas event handlers (mouse, keyboard)
    toolbar.ts                    # createToolbar() — HTML toolbar with tool buttons
    toolbar-icons.ts              # SVG icon factories
    toast.ts                       # showToast() — temporary notifications
    style.css                      # Styles (reset, toolbar, canvas, buttons)
  
  __tests__/                      # Vitest unit tests (flat structure)
```

## Architecture

### Modular Layers

The architecture is organized into **4 independent layers** with clear dependency flow:

```
ui/  (rendering, handlers, toolbar)
 ↓
state/  (mutations)  +  storage/  (persistence, sharing)
 ↓
core/  (types, registry, simulation)
```

- **core/** — Foundation layer with no dependencies. Exports types, component registry, and circuit evaluation logic.
- **state/** — Depends on core/. Manages all mutable editor state and state mutations.
- **storage/** — Depends on core/. Handles localStorage persistence and URL-based circuit sharing.
- **ui/** — Depends on core/ + state/. Renders components, handles user interactions, provides the toolbar.
- **main.ts** — Orchestrator that imports all layers and runs the render loop.

### Core Design Principles

- **No external dependencies** — Rendering and logic built with vanilla TypeScript & Canvas API
- **Pure component definitions** — Components are stateless objects with `draw()` and `evaluate()` methods; easy to test and extend
- **Mutable state** — Direct mutation of `EditorState` object (no immutability overhead)
- **Continuous rendering** — `requestAnimationFrame` loop clears and redraws canvas every frame
- **Topological sort** — Circuit evaluation order determined by Kahn's algorithm; cycles detected and handled
- **Modular isolation** — Each layer has a single responsibility; no circular imports

### Signal Flow

User interaction → Event handler → State mutation → `reEvaluate()` → Render loop picks up changes

### Data Format

Circuits stored as JSON:
```json
{
  "components": [
    { "id": "comp-0", "type": "switch", "position": { "x": 10, "y": 20 }, "state": { "value": 1 } },
    { "id": "comp-1", "type": "light", "position": { "x": 100, "y": 20 } }
  ],
  "wires": [
    { "id": "wire-0", "from": { "componentId": "comp-0", "pinIndex": 0 }, "to": { "componentId": "comp-1", "pinIndex": 0 } }
  ]
}
```

Serializable to compressed URLs for easy sharing.

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/) (5.x, strict mode)
- [Vite](https://vitejs.dev/) (8.x, dev server & build tool)
- [Vitest](https://vitest.dev/) (4.x, unit testing)
- [fflate](https://github.com/101arrowz/fflate) (data compression for sharing)

## Development

### Testing

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npx vitest run src/__tests__/and-gate.test.ts
```

Test files use [Vitest](https://vitest.dev/) and mock the Canvas 2D context with `vi.fn()`.

### Adding a New Component

1. **Define the type** in [src/core/types.ts](src/core/types.ts) — add to the `ComponentType` union
2. **Create component definition** — new file [src/core/components/my-component.ts](src/core/components/)
   ```typescript
   export const myComponent: ComponentDef = {
     type: 'my-component',
     label: 'My Component',
     width: 60,
     height: 40,
     pins: [
       { x: 0, y: 10, kind: 'input' },
       { x: 60, y: 10, kind: 'output' }
     ],
     draw(ctx, x, y, state) {
       // Canvas drawing code
     },
     evaluate(inputs, state) {
       return [inputs[0] ? 1 : 0]; // Output array
     }
   };
   ```
3. **Register** in [src/core/registry.ts](src/core/registry.ts) — add to the component `Map`
4. **Test** — create [src/__tests__/my-component.test.ts](src/__tests__/)

### Code Style

- Follow existing patterns in the codebase
- No linter or formatter configured — maintain consistency with surrounding code
- Write unit tests for new logic

## Roadmap

Planned features tracked in [plans/](plans/):
- Flexible wire routing (curved paths, grid snapping)
- Circuit sharing via URL
- URL compression for large circuits
- Additional component types (XOR, NAND, NOR, etc.)
- Keyboard shortcuts for common operations
- Dark/light theme toggle

## License

ISC
