---
name: plan-feature
description: '**WORKFLOW SKILL** — Plan a new feature for this project. USE FOR: designing new components, state mutations, UI additions, architectural changes, or any multi-step implementation. Produces a structured plan as an untitled .prompt.md file for review before execution. DO NOT USE FOR: bug fixes, single-line changes, refactors without new behavior, or questions about existing code.'
argument-hint: 'Describe the feature you want to add'
---

# Plan Feature

Produce a structured, actionable implementation plan for a new feature in this circuit simulator project. The plan is saved as an untitled `.prompt.md` file for the user to review and refine before executing.

## When to Use

- Adding a new component type (gate, input, output)
- Adding new editor capabilities (undo/redo, copy/paste, zoom, pan)
- Adding new UI controls or interactions
- Changing state management, persistence, or simulation behavior
- Any multi-file change that benefits from upfront design

## Procedure

### 1. Explore the Codebase

Use parallel subagents (Explore, thorough) to understand all parts of the codebase affected by the feature. Key areas to investigate:

- **Types** — `src/core/types.ts`: interfaces and unions that need extending
- **State mutations** — `src/state/mutations/`: which mutations exist, what they modify
- **Barrel exports** — `src/state/index.ts`, `src/state/mutations/index.ts`: what's re-exported
- **Event handlers** — `src/ui/handlers.ts`: how user interactions dispatch mutations
- **Toolbar** — `src/ui/toolbar.ts`: how UI controls are wired
- **Main orchestrator** — `src/main.ts`: how everything connects, keyboard handlers, render loop
- **Renderer** — `src/ui/renderer.ts`: what gets drawn and how
- **Simulation** — `src/core/simulation.ts`: evaluation pipeline
- **Persistence** — `src/storage/persistence.ts`: what gets saved/loaded
- **Existing tests** — `src/__tests__/`: testing patterns and conventions

Read the actual files — don't guess from names alone. Prioritize files the feature will touch.

### 2. Design the Approach

Choose the simplest approach that solves the problem. Consider:

- **Which architectural layer** does the feature belong to? (core, state, storage, ui, main)
- **What new types** are needed? Keep them minimal.
- **What new files** are needed? Prefer editing existing files over creating new ones.
- **What existing code** needs modification? List exact files and functions.
- **What are the tradeoffs** of this approach vs alternatives? Document the decision.

### 3. Write the Plan

Structure the plan with these sections:

```markdown
## Plan: <Feature Name>

<1-2 sentence summary of what the feature does and the chosen approach.>

**Approach:** <Why this approach over alternatives. Keep brief.>

<Key design decisions as bullet points — what's included, what's excluded, and why.>

---

### Phase N: <Group Name>

**Step N** — <What to do> in [file](file)
- Bullet points with specifics (function signatures, field names, logic)

### Phase N+1: ...

(Group related steps. Typical phases: Types, Core Logic, State/Mutations, Handler Integration, Main Wiring, Tests)

---

### Verification
1. `npm run build` — no type errors
2. `npm run test` — all tests pass
3. Manual testing scenarios (list specific user actions and expected results)

### Decisions
- **Decision** — rationale (one line each)
```

**Plan quality checklist:**
- [ ] Every modified file is linked: `[src/path/file.ts](src/path/file.ts)`
- [ ] Steps are ordered by dependency (types before implementation, implementation before tests)
- [ ] Each step says exactly what to add/change (not vague "update as needed")
- [ ] Verification includes both automated (build, test) and manual scenarios
- [ ] Decisions document tradeoffs, not just choices

### 4. Output the Plan

Save the plan as an untitled prompt file for the user to review:

```
create_file → untitled:plan-<camelCaseName>.prompt.md
```

Use camelCase for the feature name (e.g., `plan-undoRedo.prompt.md`, `plan-copyPaste.prompt.md`).

Do NOT include YAML frontmatter — the file is a plain markdown plan.

### 5. Summarize

After creating the file, give a brief (3-5 line) summary of:
- The chosen approach
- Number of files to create/modify
- Key design decisions
- What the user should review before approving execution

## Conventions

Follow the project's architecture rules (see `.github/copilot-instructions.md`):

- **Dependency layers:** `core/` ← `state/`, `storage/` ← `ui/` ← `main.ts` (no circular imports)
- **Mutations** are functions that directly mutate `EditorState` — not classes, not Redux actions
- **Barrel exports** in `state/index.ts` — new public functions must be re-exported
- **Tests** in `src/__tests__/` (flat structure) — mock canvas context with `vi.fn()`
- **Signals** are `number` (0 | 1), not booleans
- **IDs** are auto-incremented strings: `"comp-0"`, `"wire-0"`, etc.
- **Event flow:** interaction → handler → mutation → evaluateCircuit() → render loop
- **Toolbar** is HTML overlay (not canvas) for accessibility
