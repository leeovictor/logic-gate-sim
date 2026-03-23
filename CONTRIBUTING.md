# Contributing to Web-Based Circuit Logic Simulator

Thank you for your interest in contributing! This project is a modular, dependency-free TypeScript app using Vite and HTML5 Canvas. Please follow these guidelines to ensure a smooth contribution process.

## Getting Started
- **Install dependencies:** `npm install`
- **Start dev server:** `npm run dev` (http://localhost:5173)
- **Run tests:** `npm run test` or `npm run test:watch`

## Code Style & Structure
- **Language:** TypeScript (ES2020+)
- **No external UI/runtime dependencies** (except Vite, Vitest, fflate)
- **Directory structure:**
  - `src/core/` — Types, registry, simulation, components
  - `src/state/` — Editor state, mutations
  - `src/storage/` — Persistence, sharing
  - `src/ui/` — Rendering, handlers, toolbar
- **Component definitions:** Pure objects, no classes. See `src/core/components/` for examples.
- **Tests:** All in `src/__tests__/`, flat structure. Use `vi.fn()` to mock Canvas context.
- **No linter/formatter configured:** Follow existing code style and conventions.

## Best Practices
- **Keep modules decoupled:** Respect layer boundaries (core ← state, storage ← ui ← main.ts).
- **Direct state mutation:** Use functions in `state/mutations.ts`.
- **Simulation:** Use topological sort (Kahn's algorithm) for signal propagation.
- **IDs:** Use auto-incremented string IDs (e.g., `comp-0`, `wire-0`).
- **Wire validation:** Output→input only, no self-connections/duplicates.
- **Toolbar:** HTML overlay, not canvas.
- **Testing:** Cover new features and bugfixes with tests.

## Submitting Changes
1. **Fork and branch:** Create a feature branch from `main`.
2. **Write clear commits:** Use concise, descriptive messages.
3. **Test:** Ensure all tests pass before submitting.
4. **Pull Request:** Describe your changes and reference issues if applicable.

## Need Help?
Check `README.md`, `CLAUDE.md`, or open an issue.

Thank you for helping improve the project!