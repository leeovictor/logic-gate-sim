## Plan: NAND, NOR, XOR, XNOR Logic Gates

Add four new logic gate types (NAND, NOR, XOR, XNOR) as first-class components. Each gate follows the same architecture as existing AND/OR/NOT gates: a pure `ComponentDef` object with `evaluate()` and `draw()`, registered in the component registry and exposed in the toolbar Gates dropdown.

**Approach:** Each gate gets its own file in `src/core/components/`, matching the one-file-per-component convention. NAND/NOR/XNOR reuse the AND/OR body shapes with an inversion bubble appended (like NOT gate). XOR reuses the OR body with an extra concave curve on the left. All 4 gates are 2-input, 1-output with identical pin layouts to AND/OR. No simulation, persistence, or state mutation changes needed — the system is already generic over `ComponentType`.

- NAND/NOR/XNOR gates use 90×50 dimensions (10px extra for inversion bubble + output line), output pin at x=90
- XOR uses 80×50 dimensions (same as OR — the extra left curve doesn't add width), output pin at x=80
- All new gates added to the "Gates" dropdown group in toolbar (no new top-level buttons)
- Toolbar dropdown sub-shortcuts extend naturally: gates numbered 1–7 inside dropdown
- No persistence migration needed — `ComponentType` string is stored as-is and loaded generically via `getComponentDef()`

---

### Phase 1: Types

**Step 1** — Extend `ComponentType` union in [src/core/types.ts](src/core/types.ts)
- Add `"nand-gate" | "nor-gate" | "xor-gate" | "xnor-gate"` to the `ComponentType` union
- `ToolMode` automatically picks up the new types (it's `"select" | "wire" | ComponentType`)

---

### Phase 2: Component Definitions

**Step 2** — Create [src/core/components/nand-gate.ts](src/core/components/nand-gate.ts)
- Export `nandGate: ComponentDef` with `type: "nand-gate"`, `label: "NAND Gate"`, `width: 90`, `height: 50`
- Pins: `[{ direction: "input", x: 0, y: 12.5 }, { direction: "input", x: 0, y: 37.5 }, { direction: "output", x: 90, y: 25 }]`
- `evaluate(inputs)`: return `[!(inputs[0] && inputs[1]) ? 1 : 0]` — propagate `'E'` if any input is `'E'`
- `draw()`: AND gate body (flat left + arc right, same geometry) + inversion bubble (circle r=5) + output line to x=90

**Step 3** — Create [src/core/components/nor-gate.ts](src/core/components/nor-gate.ts)
- Export `norGate: ComponentDef` with `type: "nor-gate"`, `label: "NOR Gate"`, `width: 90`, `height: 50`
- Pins: `[{ direction: "input", x: 0, y: 12.5 }, { direction: "input", x: 0, y: 37.5 }, { direction: "output", x: 90, y: 25 }]`
- `evaluate(inputs)`: return `[!(inputs[0] || inputs[1]) ? 1 : 0]` — propagate `'E'`
- `draw()`: OR gate body (concave left + convex arcs) + inversion bubble + output line to x=90

**Step 4** — Create [src/core/components/xor-gate.ts](src/core/components/xor-gate.ts)
- Export `xorGate: ComponentDef` with `type: "xor-gate"`, `label: "XOR Gate"`, `width: 80`, `height: 50`
- Pins: `[{ direction: "input", x: 0, y: 12.5 }, { direction: "input", x: 0, y: 37.5 }, { direction: "output", x: 80, y: 25 }]`
- `evaluate(inputs)`: return `[inputs[0] !== inputs[1] ? 1 : 0]` (XOR: exactly one input is 1) — propagate `'E'`
- `draw()`: OR gate body + extra concave curve ~6px to the left of the main left curve, output line same as OR

**Step 5** — Create [src/core/components/xnor-gate.ts](src/core/components/xnor-gate.ts)
- Export `xnorGate: ComponentDef` with `type: "xnor-gate"`, `label: "XNOR Gate"`, `width: 90`, `height: 50`
- Pins: `[{ direction: "input", x: 0, y: 12.5 }, { direction: "input", x: 0, y: 37.5 }, { direction: "output", x: 90, y: 25 }]`
- `evaluate(inputs)`: return `[inputs[0] === inputs[1] ? 1 : 0]` (XNOR: both same) — propagate `'E'`
- `draw()`: XOR body (OR body + extra left curve) + inversion bubble + output line to x=90

---

### Phase 3: Registry

**Step 6** — Register all 4 gates in [src/core/registry.ts](src/core/registry.ts)
- Import `nandGate`, `norGate`, `xorGate`, `xnorGate` from their respective files
- Add 4 entries to the `registry` Map: `["nand-gate", nandGate]`, `["nor-gate", norGate]`, `["xor-gate", xorGate]`, `["xnor-gate", xnorGate]`

---

### Phase 4: Toolbar Icons

**Step 7** — Add 4 icon functions in [src/ui/toolbar-icons.ts](src/ui/toolbar-icons.ts)
- `nandGateIcon()`: AND body path (same as `andGateIcon`) + inversion bubble circle + adjusted output line
- `norGateIcon()`: OR body path (same as `orGateIcon`) + inversion bubble circle + adjusted output line
- `xorGateIcon()`: OR body path + extra concave curve stroke on the left side
- `xnorGateIcon()`: XOR body (OR + extra curve) + inversion bubble circle + adjusted output line
- All icons use viewBox `0 0 28 22` (match existing gate icons) — NAND/NOR/XNOR may use `0 0 32 22` for the bubble

---

### Phase 5: Toolbar Integration

**Step 8** — Wire icons and dropdown items in [src/ui/toolbar.ts](src/ui/toolbar.ts)
- Import `nandGateIcon`, `norGateIcon`, `xorGateIcon`, `xnorGateIcon` from `./toolbar-icons`
- Add to `toolIcons` map: `"nand-gate": nandGateIcon`, `"nor-gate": norGateIcon`, `"xor-gate": xorGateIcon`, `"xnor-gate": xnorGateIcon`
- Add to `toolEntries` Gates group items array: `{ id: "nand-gate", label: "NAND" }`, `{ id: "nor-gate", label: "NOR" }`, `{ id: "xor-gate", label: "XOR" }`, `{ id: "xnor-gate", label: "XNOR" }`
- Dropdown sub-shortcuts (1–7) work automatically since they iterate `group.items`

---

### Phase 6: Tests

**Step 9** — Create [src/__tests__/nand-gate.test.ts](src/__tests__/nand-gate.test.ts)
- Truth table: NAND(0,0)=1, NAND(0,1)=1, NAND(1,0)=1, NAND(1,1)=0
- Error propagation: NAND(E,x)=E, NAND(x,E)=E
- Draw test: verify `beginPath`, `arc`, `fill`, `stroke` called (body + bubble)
- Metadata: type, label, width=90, height=50

**Step 10** — Create [src/__tests__/nor-gate.test.ts](src/__tests__/nor-gate.test.ts)
- Truth table: NOR(0,0)=1, NOR(0,1)=0, NOR(1,0)=0, NOR(1,1)=0
- Error propagation tests
- Draw test: verify `quadraticCurveTo` + `arc` called (OR body + bubble)
- Metadata: type, label, width=90, height=50

**Step 11** — Create [src/__tests__/xor-gate.test.ts](src/__tests__/xor-gate.test.ts)
- Truth table: XOR(0,0)=0, XOR(0,1)=1, XOR(1,0)=1, XOR(1,1)=0
- Error propagation tests
- Draw test: verify `quadraticCurveTo` called (OR body + extra curve)
- Metadata: type, label, width=80, height=50

**Step 12** — Create [src/__tests__/xnor-gate.test.ts](src/__tests__/xnor-gate.test.ts)
- Truth table: XNOR(0,0)=1, XNOR(0,1)=0, XNOR(1,0)=0, XNOR(1,1)=1
- Error propagation tests
- Draw test: verify `quadraticCurveTo` + `arc` called (XOR body + bubble)
- Metadata: type, label, width=90, height=50

---

### Verification

1. `npm run build` — no type errors
2. `npm run test` — all tests pass (existing + 4 new test files)
3. Manual testing:
   - Select each new gate from the Gates dropdown → ghost preview follows cursor
   - Place each gate on canvas → renders with correct shape (body + bubble for NAND/NOR/XNOR, extra curve for XOR/XNOR)
   - Wire two switches → new gate → light → toggle simulation → verify truth table outputs
   - NAND(1,1) should output 0 (light off), NAND(0,0) should output 1 (light on)
   - XOR(1,0) should output 1, XOR(1,1) should output 0
   - Save, reload page → circuit persists correctly with new gate types
   - Share URL → load shared URL → new gates round-trip correctly

### Decisions

- **90px width for bubble gates** — maintains same body proportions as AND/OR while fitting the inversion bubble + output line, without compressing the shape
- **80px width for XOR** — extra left curve is overlaid on existing body space, no extra width needed
- **All gates in one dropdown** — keeps toolbar compact; 7 items in dropdown is acceptable
- **No persistence migration** — `ComponentType` is stored as a string, `getComponentDef()` resolves it at load time; new types "just work"
- **XOR uses `!==` comparison** — treat signal values as numbers, `inputs[0] !== inputs[1]` correctly handles 0/1 XOR logic after the `'E'` guard
