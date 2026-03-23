# PRODUCT.md

## Web-Based Digital Logic Circuit Simulator

### Overview
A modern, browser-based digital logic circuit simulator for designing, simulating, and sharing digital circuits. Built with TypeScript and Vite, it features a full-viewport HTML5 Canvas interface and a native HTML toolbar, with no external UI frameworks or runtime dependencies. The simulator is modular, fast, and accessible, targeting students, educators, and hobbyists who want an intuitive, interactive environment for digital logic experimentation.

---

### Core Features

#### 1. **Visual Circuit Design**
- **Drag-and-drop interface:** Place, move, and connect logic components on a canvas.
- **Component palette:** Toolbar with selectable gates (AND, OR, NOT, NAND, NOR, XOR, XNOR), switches, and output indicators (lights).
- **Wire drawing:** Click-and-drag to connect outputs to inputs; supports multiple wires and junctions.
- **Selection tools:** Select, move, and delete components or groups; box selection for multi-component operations.
- **Undo/Redo:** Stepwise undo/redo of all editing actions (planned/roadmap).

#### 2. **Real-Time Simulation**
- **Instant feedback:** Circuit state updates live as you edit or toggle switches.
- **Accurate logic:** Uses topological sorting (Kahn's algorithm) to evaluate signal propagation in correct dependency order.
- **Component state:** Supports components with internal state (e.g., switches, memory elements in future).

#### 3. **Persistence & Sharing**
- **Local save/load:** Circuits are saved to browser localStorage with versioned, compressed formats.
- **URL sharing:** Generate compact, shareable URLs that encode the entire circuit for easy collaboration.
- **Migration:** Automatic migration of old circuit formats to the latest version.

#### 4. **Accessibility & Usability**
- **No login or install:** Runs entirely in the browser, no account required.
- **Keyboard shortcuts:** For common actions (planned/roadmap).
- **Responsive design:** Canvas resizes to fit any screen; toolbar remains accessible.
- **Native HTML toolbar:** Ensures accessibility and screen reader compatibility.

---

### Architecture Highlights
- **Canvas rendering:** All circuit visuals are drawn on a high-performance HTML5 Canvas, redrawn every animation frame for smooth interaction.
- **Modular codebase:** Four-layer architecture (core, state, storage, ui) ensures maintainability and extensibility.
- **Pure data model:** Circuits are represented as serializable, versioned data structures for easy saving, loading, and sharing.
- **Test coverage:** Comprehensive unit tests for simulation, state management, and persistence.

---

### Typical Use Cases
- **Education:** Visualize and experiment with digital logic concepts in real time.
- **Prototyping:** Quickly sketch and test logic circuits before hardware implementation.
- **Collaboration:** Share circuit designs with peers or instructors via URL.

---

### Roadmap & Extensibility
- **Planned features:**
  - Step-by-step simulation (clocked/step mode)
  - Custom ICs and subcircuits
  - More component types (flip-flops, multiplexers, etc.)
  - Export/import to standard formats (e.g., JSON, Verilog)
  - Enhanced accessibility and keyboard navigation

- **Extensible design:**
  - New components can be added by defining their logic and visuals in a single file and registering them.
  - State mutations and simulation logic are modular and testable.

---

### Summary
This project delivers a fast, accessible, and shareable digital logic simulator for the web, with a focus on usability, correctness, and extensibility. It is ideal for learning, teaching, and prototyping digital circuits in a modern browser environment.
