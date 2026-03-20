# Phase 5: Tests

> Part of [FLEXIBLE-WIRES.md](FLEXIBLE-WIRES.md) — Flexible Wires & Robust Simulation

## Step 5.1 — Update existing tests in `src/__tests__/wire.test.ts`

- Update all tests that reference old `Wire` interface to use new `WireSegment`
- Remove tests for direction restriction (no longer enforced)
- Add tests for: wire created from input→input, output→output, any direction
- Add tests for free-standing wire (endpoints not connected to pins)
- Add tests for wire-to-wire junction creation

## Step 5.2 — Update simulation tests in `src/__tests__/simulation.test.ts`

- Update cycle test: instead of clearing all values, cycles should resolve to `'E'` or converge
- Add tests for multi-driver conflict → `'E'` signal
- Add tests for: two switches both outputting to same net, one ON one OFF → `'E'`
- Add tests for: two switches outputting same value → no error
- Add tests for net building (connected components via wire graph)

## Step 5.3 — New test file `src/__tests__/net.test.ts`

- Test `buildNets()` with various topologies
- Test `resolveNetSignal()` with 0, 1, multiple drivers
- Test error propagation through gates

## Step 5.4 — Update component tests

- Update `and-gate.test.ts`, `or-gate.test.ts`, `not-gate.test.ts`, `light.test.ts` for `'E'` input handling

## Step 5.5 — Update persistence tests

- Test migration from version 1 → 2
- Test serialization of new wire segment and junction model

## Relevant Files

- `src/__tests__/wire.test.ts` — Rewrite for new model
- `src/__tests__/simulation.test.ts` — Update for net-based evaluation + error states
- `src/__tests__/net.test.ts` — New file for net/signal resolution tests
- `src/__tests__/and-gate.test.ts`, `or-gate.test.ts`, `not-gate.test.ts`, `light.test.ts` — `'E'` handling
- `src/__tests__/persistence.test.ts` — Migration tests

## Verification

1. `npm run test` — all tests pass
2. No regressions in existing component behavior
