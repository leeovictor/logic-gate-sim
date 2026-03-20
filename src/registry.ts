import type { ComponentType, ComponentDef } from "./types";
import { andGate } from "./components/and-gate";
import { orGate } from "./components/or-gate";
import { notGate } from "./components/not-gate";
import { switchComponent } from "./components/switch";
import { lightComponent } from "./components/light";

const registry = new Map<ComponentType, ComponentDef>([
  ["and-gate", andGate],
  ["or-gate", orGate],
  ["not-gate", notGate],
  ["switch", switchComponent],
  ["light", lightComponent],
]);

export function getComponentDef(type: ComponentType): ComponentDef | undefined {
  return registry.get(type);
}
