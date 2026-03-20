# Refactoring: Divisão de `mutations.ts` em Módulos de Domínio

**Princípio violado:** Single Responsibility (SRP)  
**Arquivo alvo:** `src/state/mutations.ts` (427 linhas, 37 funções, 6 domínios misturados)  
**Risco:** Muito baixo — mudança puramente interna ao diretório `state/`  
**Impacto externo:** Zero — todos os consumidores importam via `@/state` (barrel `state/index.ts`)

---

## Objetivo

Substituir o único arquivo `mutations.ts` por um diretório `mutations/` com um módulo por domínio. O arquivo `state/index.ts` continua importando de `"./mutations"` — o TypeScript resolverá automaticamente para `./mutations/index.ts`.

---

## Estrutura Alvo

```
src/state/
├── editor-state.ts          (sem alteração)
├── index.ts                 (sem alteração — import de "./mutations" continua válido)
└── mutations/
    ├── index.ts             (barrel — re-exporta tudo dos 6 módulos abaixo)
    ├── component.ts         (addComponent, setSelectedTool, toggleSwitchValue)
    ├── wire.ts              (addWireSegment, addWire†, addJunction, splitWireAtJunction,
    │                         removeWireSegment, removeSegmentsForComponent, removeWiresForComponent†)
    ├── pending.ts           (setPendingWire†, setPendingWireEndpoint, addPendingWaypoint, clearPendingWire)
    ├── drag.ts              (startDrag, startJunctionDrag, updateDrag, endDrag)
    ├── selection.ts         (selectComponent, toggleComponentSelection, selectWire, toggleWireSelection,
    │                         selectJunction, toggleJunctionSelection, clearSelection, deleteSelected,
    │                         startSelectionBox, updateSelectionBox, endSelectionBox)
    └── simulation.ts        (toggleSimulation, setSimulationMode, performStep,
                              toggleAutoStep, setStepInterval, resetStep)
```

† funções deprecated mantidas para compatibilidade

---

## Grafo de Dependências Internas (entre os novos módulos)

```
component.ts  → nenhuma dependência interna
wire.ts       → nenhuma dependência interna
pending.ts    → nenhuma dependência interna
drag.ts       → nenhuma dependência interna
selection.ts  → importa de ./wire (removeWireSegment, removeSegmentsForComponent)
simulation.ts → nenhuma dependência interna
index.ts      → re-exporta todos os 6 módulos
```

---

## Instruções Detalhadas por Arquivo

---

### `mutations/component.ts`

**Funções a mover:** `addComponent`, `setSelectedTool`, `toggleSwitchValue`

**Imports necessários:**
```ts
import type { EditorState, ComponentType, ToolMode, PlacedComponent, Point } from "@/core/types";
import { getComponentDef } from "@/core/registry";
```

O `getComponentDef` é usado dentro de `addComponent` para obter `defaultState`.  
`setSelectedTool` despacha evento via `state.events` — nenhum import externo adicional.

---

### `mutations/wire.ts`

**Funções a mover:** `addWireSegment`, `addWire` (deprecated), `addJunction`, `splitWireAtJunction`, `removeWireSegment`, `removeSegmentsForComponent`, `removeWiresForComponent` (deprecated)

**Imports necessários:**
```ts
import type { EditorState, Point, WireSegment, WireJunction, WireEndpoint, PendingWire } from "@/core/types";
import { endpointsEqual } from "../editor-state";
```

`endpointsEqual` é usado em `addWireSegment` para checar duplicatas.  
`splitWireAtJunction` usa apenas tipos internos e o próprio `state`.  
`removeWireSegment` faz limpeza de junctions órfãos iterando `state.wireSegments` — sem deps externas.

---

### `mutations/pending.ts`

**Funções a mover:** `setPendingWire` (deprecated), `setPendingWireEndpoint`, `addPendingWaypoint`, `clearPendingWire`

**Imports necessários:**
```ts
import type { EditorState, Point, PendingWire } from "@/core/types";
```

Nenhuma dependência além dos tipos. Todas as funções apenas leem/escrevem `state.pendingWire` e `state.pendingWaypoints`.

---

### `mutations/drag.ts`

**Funções a mover:** `startDrag`, `startJunctionDrag`, `updateDrag`, `endDrag`

**Imports necessários:**
```ts
import type { EditorState, Point } from "@/core/types";
```

`startDrag` e `startJunctionDrag` constroem `Map<string, Point>` para `offsets` e `junctionOffsets` — sem deps além dos tipos.  
`updateDrag` e `endDrag` apenas leem/escrevem `state.dragging`.

> **Nota:** `startDrag` e `startJunctionDrag` compartilham a mesma lógica de construção de offset maps iterando `selectedComponentIds` e `selectedJunctionIds`. Isso é uma oportunidade de extração de helper privado — documentada aqui mas fora do escopo desta tarefa.

---

### `mutations/selection.ts`

**Funções a mover:** `selectComponent`, `toggleComponentSelection`, `selectWire`, `toggleWireSelection`, `selectJunction`, `toggleJunctionSelection`, `clearSelection`, `deleteSelected`, `startSelectionBox`, `updateSelectionBox`, `endSelectionBox`

**Imports necessários:**
```ts
import type { EditorState, Point } from "@/core/types";
import { getComponentDef } from "@/core/registry";
import { resolveEndpoint } from "../editor-state";
import { removeWireSegment, removeSegmentsForComponent } from "./wire";
```

Atenção especial:

1. `deleteSelected` chama `removeSegmentsForComponent` e `removeWireSegment` — que agora vivem em `./wire`. Este é o único caso de dependência entre módulos `mutations/`.

2. `endSelectionBox` chama `getComponentDef` (para obter `def.width` e `def.height`) e `resolveEndpoint` (para calcular posição dos endpoints dos fios na caixa de seleção).

---

### `mutations/simulation.ts`

**Funções a mover:** `setSimulationMode`, `performStep`, `toggleAutoStep`, `setStepInterval`, `resetStep`, `toggleSimulation`

**Imports necessários:**
```ts
import type { EditorState, SimulationMode } from "@/core/types";
import { stepCircuit, resetStepSimulation, startAutoStep, stopAutoStep } from "@/core/simulation";
```

`toggleSimulation` também despacha evento via `state.events` e chama `stopAutoStep` + `resetStepSimulation` — ambas importadas de `@/core/simulation`.

---

### `mutations/index.ts`

Barrel que re-exporta tudo dos 6 módulos. Deve exportar **exatamente** as mesmas funções que o `mutations.ts` atual exporta, na mesma ordem para não quebrar nada.

Padrão a seguir (sem implementação, apenas re-exports):

```ts
export { ... } from "./component";
export { ... } from "./wire";
export { ... } from "./pending";
export { ... } from "./drag";
export { ... } from "./selection";
export { ... } from "./simulation";
```

A lista exata de nomes exportados deve ser extraída do `state/index.ts` atual (bloco `from "./mutations"`), garantindo que nenhuma função seja omitida.

---

## Procedimento de Execução

A ordem recomendada minimiza o risco de ter o projeto em estado quebrado por muito tempo:

1. **Criar o diretório** `src/state/mutations/`
2. **Criar os 5 módulos sem dependências internas primeiro** (`component.ts`, `wire.ts`, `pending.ts`, `drag.ts`, `simulation.ts`) — movendo as funções correspondentes do `mutations.ts` original
3. **Criar `selection.ts`** por último, pois depende de `wire.ts`
4. **Criar `mutations/index.ts`** com todos os re-exports
5. **Deletar `src/state/mutations.ts`** (o arquivo plano original)
6. **Verificar que `state/index.ts` não precisa de alteração** — o import `from "./mutations"` resolve para `./mutations/index.ts` automaticamente
7. **Rodar `npm run test`** — todos os testes devem passar sem alteração
8. **Rodar `npm run build`** — deve compilar sem erros

---

## O Que NÃO Deve Mudar

- `src/state/editor-state.ts` — sem alteração
- `src/state/index.ts` — sem alteração
- Qualquer arquivo fora de `src/state/` — sem alteração
- A API pública (nomes das funções exportadas) — sem alteração
- Os testes em `src/__tests__/` — sem alteração

---

## Validação

Após a execução, verificar:

- [ ] `npm run test` — todos os testes passam
- [ ] `npm run build` — sem erros de compilação
- [ ] Nenhum arquivo fora de `src/state/` foi modificado
- [ ] O número total de funções exportadas via `@/state` permanece o mesmo (37)
- [ ] Nenhuma função deprecated foi removida (serão removidas em tarefa separada)
