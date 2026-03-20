import type { ComponentType, ComponentDef } from "@/core/types";
import { andGate } from "@/core/components/and-gate";
import { orGate } from "@/core/components/or-gate";
import { notGate } from "@/core/components/not-gate";
import { switchComponent } from "@/core/components/switch";
import { lightComponent } from "@/core/components/light";

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
