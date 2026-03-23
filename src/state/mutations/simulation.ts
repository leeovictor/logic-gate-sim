import type { EditorState, SimulationMode } from "@/core/types";
import { stepCircuit, resetStepSimulation, startAutoStep, stopAutoStep } from "@/core/simulation";
import { setCurrentTheme } from "@/core/theme";

export function setSimulationMode(state: EditorState, mode: SimulationMode): void {
  if (state.simulationMode === mode) return;
  state.simulationMode = mode;

  // When switching modes, reset step state and clear simulation values
  if (mode === "step") {
    resetStepSimulation(state);
  }
}

export function performStep(state: EditorState): void {
  if (!state.simulationEnabled || state.simulationMode !== "step") return;
  stepCircuit(state);
}

export function toggleAutoStep(state: EditorState, onStep: () => void): void {
  if (!state.simulationEnabled || state.simulationMode !== "step") return;

  if (state.stepSimulation.running) {
    stopAutoStep(state);
  } else {
    startAutoStep(state, onStep);
  }
}

export function setStepInterval(state: EditorState, ms: number): void {
  state.stepSimulation.stepInterval = ms;
  // If running, the caller (UI) should stop and restart auto-step
  // to apply the new interval
}

export function resetStep(state: EditorState): void {
  if (state.simulationMode !== "step") return;
  resetStepSimulation(state);
}

export function toggleSimulation(state: EditorState): void {
  state.simulationEnabled = !state.simulationEnabled;
  if (state.simulationEnabled) {
    state.selectedTool = null;
    state.events.dispatchEvent(new CustomEvent("toolchange", { detail: null }));
  } else {
    stopAutoStep(state);
    resetStepSimulation(state);
  }
}

export function setTheme(state: EditorState, theme: "light" | "dark"): void {
  state.theme = theme;
  setCurrentTheme(theme);
  document.documentElement.dataset.theme = theme;
}
