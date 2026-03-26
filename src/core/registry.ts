import { andGate } from "@/core/components/and-gate";
import { lightComponent } from "@/core/components/light";
import { nandGate } from "@/core/components/nand-gate";
import { norGate } from "@/core/components/nor-gate";
import { notGate } from "@/core/components/not-gate";
import { orGate } from "@/core/components/or-gate";
import { switchComponent } from "@/core/components/switch";
import { xnorGate } from "@/core/components/xnor-gate";
import { xorGate } from "@/core/components/xor-gate";
import type { ComponentDef, ComponentType } from "@/core/types";

const registry = new Map<ComponentType, ComponentDef>([
  ["and-gate", andGate],
  ["or-gate", orGate],
  ["not-gate", notGate],
  ["nand-gate", nandGate],
  ["nor-gate", norGate],
  ["xor-gate", xorGate],
  ["xnor-gate", xnorGate],
  ["switch", switchComponent],
  ["light", lightComponent],
]);

export function getComponentDef(type: ComponentType): ComponentDef | undefined {
  return registry.get(type);
}
