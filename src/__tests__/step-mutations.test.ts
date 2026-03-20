import { describe, it, expect, vi } from "vitest";
import {
  createEditorState,
  setSimulationMode,
  performStep,
  toggleAutoStep,
  setStepInterval,
  resetStep,
  toggleSimulation,
} from "@/state";

describe("Step Simulation Mutations", () => {
  describe("setSimulationMode", () => {
    it("setSimulationMode alterna entre instant e step", () => {
      const state = createEditorState();
      expect(state.simulationMode).toBe("instant");

      setSimulationMode(state, "step");
      expect(state.simulationMode).toBe("step");

      setSimulationMode(state, "instant");
      expect(state.simulationMode).toBe("instant");
    });

    it("setSimulationMode para step reseta stepSimulation", () => {
      const state = createEditorState();
      state.simulationEnabled = true;
      state.simulationMode = "step";
      state.stepSimulation.stepCount = 5;

      setSimulationMode(state, "instant");
      setSimulationMode(state, "step");

      expect(state.stepSimulation.stepCount).toBe(0);
    });
  });

  describe("performStep", () => {
    it("performStep incrementa stepCount", () => {
      const state = createEditorState();
      state.simulationEnabled = true;
      state.simulationMode = "step";

      performStep(state);
      expect(state.stepSimulation.stepCount).toBe(1);
    });

    it("performStep não faz nada em modo instant", () => {
      const state = createEditorState();
      state.simulationEnabled = true;
      // simulationMode = "instant" (default)

      performStep(state);
      expect(state.stepSimulation.stepCount).toBe(0);
    });
  });

  describe("toggleAutoStep", () => {
    it("toggleAutoStep liga e desliga running", () => {
      const state = createEditorState();
      state.simulationEnabled = true;
      state.simulationMode = "step";

      const onStep = vi.fn();

      toggleAutoStep(state, onStep);
      expect(state.stepSimulation.running).toBe(true);
      expect(state.stepSimulation.autoStepTimer).not.toBeNull();

      toggleAutoStep(state, onStep);
      expect(state.stepSimulation.running).toBe(false);
      expect(state.stepSimulation.autoStepTimer).toBeNull();
    });
  });

  describe("setStepInterval", () => {
    it("setStepInterval muda o intervalo", () => {
      const state = createEditorState();
      expect(state.stepSimulation.stepInterval).toBe(500);

      setStepInterval(state, 200);
      expect(state.stepSimulation.stepInterval).toBe(200);
    });
  });

  describe("resetStep", () => {
    it("resetStep zera contadores", () => {
      const state = createEditorState();
      state.simulationEnabled = true;
      state.simulationMode = "step";

      performStep(state);
      performStep(state);
      expect(state.stepSimulation.stepCount).toBe(2);

      resetStep(state);
      expect(state.stepSimulation.stepCount).toBe(0);
      expect(state.stepSimulation.stable).toBe(false);
    });
  });

  describe("toggleSimulation interaction", () => {
    it("toggleSimulation para auto-step ao desabilitar", () => {
      const state = createEditorState();
      state.simulationEnabled = true;
      state.simulationMode = "step";

      toggleAutoStep(state, vi.fn());
      expect(state.stepSimulation.running).toBe(true);

      toggleSimulation(state); // disables
      expect(state.simulationEnabled).toBe(false);
      expect(state.stepSimulation.running).toBe(false);
      expect(state.stepSimulation.stepCount).toBe(0);
    });
  });
});
