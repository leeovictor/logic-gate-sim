# Web-Based Circuit Logic Simulator

A browser-based digital logic circuit editor built with TypeScript and Vite. Place logic gates on a canvas, connect them with wires, and simulate signal propagation — all in the browser, no installation required.

> **Status:** Early development — UI and rendering are functional; simulation logic is in progress.

## Features

- Full-viewport HTML5 Canvas rendering
- Toolbar with selectable gate/tool modes
- Place logic gates by clicking the canvas
- Ghost preview follows the cursor while placing components
- Wire connections between component pins (in progress)
- Switch component for toggling input signals

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |

## Project Structure

```
src/
  main.ts          # Orchestrator — DOM setup, canvas sizing, event handlers, render loop
  types.ts         # Core interfaces: Point, ComponentType, ComponentDef, PlacedComponent, EditorState
  state.ts         # State factory and mutations (addComponent, setSelectedTool, …)
  renderer.ts      # Component registry and drawAll() — renders components + ghost preview
  toolbar.ts       # HTML toolbar with tool-select buttons
  style.css        # Global styles, toolbar, canvas positioning
  components/
    and-gate.ts    # AND gate ComponentDef (arc body, 2 inputs, 1 output)
    switch.ts      # Switch ComponentDef
  __tests__/       # Vitest test files
```

## Architecture

- **Rendering:** continuous `requestAnimationFrame` loop — clears and redraws every frame.
- **Components:** pure objects with a `draw(ctx, x, y)` method — stateless and easy to test.
- **Component registry:** `Map<ComponentType, ComponentDef>` in `renderer.ts`; add new gates by registering them there.
- **Event flow:** toolbar click → `setSelectedTool` → canvas click → `addComponent` → mousemove updates cursor for ghost preview.

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/) (strict mode, ES2020)
- [Vite](https://vitejs.dev/) (build tool & dev server)
- [Vitest](https://vitest.dev/) (unit testing)

## License

ISC
