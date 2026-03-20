# Module Refactoring — Alternativa B (Core / State / Storage / UI)

## Objetivo

Reorganizar o código-fonte de uma estrutura flat (`src/*.ts`) em 4 módulos com responsabilidades claras, melhorando a navegação, testabilidade e manutenção do projeto.

## Estrutura Alvo

```
src/
├── core/                        # Camada 0 — tipos, registro e simulação
│   ├── types.ts                 # Interfaces e type unions (sem mudanças)
│   ├── registry.ts              # Map<ComponentType, ComponentDef> + getComponentDef
│   ├── simulation.ts            # evaluateCircuit, buildNets, UnionFind, clearAllPinValues
│   └── components/              # ComponentDef por arquivo (sem mudanças internas)
│       ├── and-gate.ts
│       ├── or-gate.ts
│       ├── not-gate.ts
│       ├── switch.ts
│       └── light.ts
│
├── state/                       # Camada 1 — estado mutável do editor
│   ├── editor-state.ts          # createEditorState() factory
│   ├── mutations.ts             # Todas as funções de mutação do estado
│   └── index.ts                 # Barrel export (re-exporta tudo)
│
├── storage/                     # Camada 1 — persistência e compartilhamento
│   ├── persistence.ts           # localStorage save/load + serialization (v1/v2/v3 + migration)
│   └── sharing.ts               # URL encode/decode (generateShareUrl, loadFromUrl, copyShareUrl)
│
├── ui/                          # Camada 2 — interface visual e interação
│   ├── renderer.ts              # drawAll + getPinPosition + getEndpointPosition
│   ├── hit-test.ts              # hitTest, hitTestPin, hitTestWire, hitTestJunction
│   ├── handlers.ts              # Canvas event handlers + HandlerContext
│   ├── toolbar.ts               # createToolbar + dropdown/shortcut logic
│   ├── toolbar-icons.ts         # SVG icon factories
│   ├── toast.ts                 # showToast (extraído de sharing.ts)
│   └── style.css                # Estilos globais
│
├── __tests__/                   # Testes (atualizar imports)
│   ├── and-gate.test.ts
│   ├── light.test.ts
│   ├── net.test.ts
│   ├── not-gate.test.ts
│   ├── or-gate.test.ts
│   ├── persistence.test.ts
│   ├── sharing.test.ts
│   ├── simulation.test.ts
│   ├── state.test.ts
│   ├── switch.test.ts
│   └── wire.test.ts
│
└── main.ts                      # Entry point — wiring (atualizar imports)
```

## Regras de Dependência

```
core/  ← sem dependências internas (apenas types.ts + components)
state/ ← depende de core/
storage/ ← depende de core/
ui/    ← depende de core/ + state/
main.ts ← depende de tudo (orquestrador)
```

Nenhum módulo inferior importa de um módulo superior. Isso impede dependências circulares.

## Fases de Execução

### Fase 1 — Criar `core/` (mover types, registry, simulation, components)

**Arquivos movidos:**
| Origem | Destino |
|---|---|
| `src/types.ts` | `src/core/types.ts` |
| `src/registry.ts` | `src/core/registry.ts` |
| `src/simulation.ts` | `src/core/simulation.ts` |
| `src/components/*.ts` | `src/core/components/*.ts` |

**Mudanças de import nos arquivos movidos:**

- `core/registry.ts`: `"./types"` → `"./types"` (sem mudança), `"./components/X"` → `"./components/X"` (sem mudança)
- `core/simulation.ts`: `"./types"` → `"./types"` (sem mudança), `"./registry"` → `"./registry"` (sem mudança)
- `core/components/*.ts`: `"../types"` → `"../types"` (sem mudança — componentes continuam um nível abaixo)

**Impacto externo (arquivos que importam de types/registry/simulation):**
- `state.ts` → `"./types"` vira `"./core/types"`, `"./registry"` vira `"./core/registry"`
- `renderer.ts` → `"./types"` vira `"./core/types"`, `"./registry"` vira `"./core/registry"`
- `handlers.ts` → `"./types"` vira `"./core/types"`
- `persistence.ts` → `"./types"` vira `"./core/types"`
- `sharing.ts` → `"./types"` vira `"./core/types"`
- `toolbar.ts` → `"./types"` vira `"./core/types"`
- `main.ts` → `"./simulation"` vira `"./core/simulation"`

**Testes impactados:**
- `net.test.ts` → `"../simulation"` vira `"../core/simulation"`, `"../types"` vira `"../core/types"`
- `simulation.test.ts` → `"../simulation"` vira `"../core/simulation"`, `"../types"` vira `"../core/types"`
- `and-gate.test.ts` → `"../components/and-gate"` vira `"../core/components/and-gate"`
- `or-gate.test.ts` → `"../components/or-gate"` vira `"../core/components/or-gate"`
- `not-gate.test.ts` → `"../components/not-gate"` vira `"../core/components/not-gate"`
- `switch.test.ts` → `"../components/switch"` vira `"../core/components/switch"`
- `light.test.ts` → `"../components/light"` vira `"../core/components/light"`

**Validação:** `npm run test && npm run build` devem passar.

---

### Fase 2 — Criar `state/` (mover + dividir state.ts)

**Divisão do arquivo `src/state.ts` (~450 linhas):**

1. **`src/state/editor-state.ts`** — Factory + helpers internos:
   - `createEditorState()`
   - Helper: `endpointsEqual()`, `resolveEndpoint()` (usados por mutations)

2. **`src/state/mutations.ts`** — Todas as funções de mutação:
   - Componentes: `addComponent`, `selectComponent`, `toggleComponentSelection`, `clearSelection`, `deleteSelected`
   - Wires: `addWireSegment`, `addWire`, `removeWireSegment`, `removeSegmentsForComponent`, `removeWiresForComponent`
   - Junctions: `addJunction`, `splitWireAtJunction`, `selectJunction`, `toggleJunctionSelection`
   - Pending wire: `setPendingWire`, `setPendingWireEndpoint`, `clearPendingWire`
   - Drag: `startDrag`, `startJunctionDrag`, `updateDrag`, `endDrag`
   - Selection box: `startSelectionBox`, `updateSelectionBox`, `endSelectionBox`
   - Toggle: `toggleSwitchValue`, `toggleSimulation`
   - Wire selection: `selectWire`, `toggleWireSelection`

3. **`src/state/index.ts`** — Barrel re-export:
   ```typescript
   export { createEditorState } from "./editor-state";
   export { addComponent, selectComponent, /* ... todas as mutations */ } from "./mutations";
   ```

**Mudanças de import internas:**
- `editor-state.ts`: `"./types"` → `"../core/types"`, `"./registry"` → `"../core/registry"`
- `mutations.ts`: `"./types"` → `"../core/types"`, `"./registry"` → `"../core/registry"`, helpers importados de `"./editor-state"`

**Impacto externo — arquivos que importam de `"./state"`:**
- `handlers.ts` → `"./state"` vira `"./state/index"` ou `"./state"` (barrel funciona com ambos)
- `main.ts` → `"./state"` vira `"./state"` (barrel export resolve)
- Todos os testes que importam de `"../state"` → `"../state"` (barrel export resolve, sem mudança de path)

> **Nota:** Graças ao barrel `index.ts`, os imports externos que usam `"./state"` continuam funcionando — Vite resolve `./state` → `./state/index.ts` automaticamente.

**Validação:** `npm run test && npm run build` devem passar.

---

### Fase 3 — Criar `storage/` (mover persistence + sharing)

**Arquivos movidos:**
| Origem | Destino |
|---|---|
| `src/persistence.ts` | `src/storage/persistence.ts` |
| `src/sharing.ts` | `src/storage/sharing.ts` |

**Extração de `showToast` de sharing.ts:**
- A função `showToast()` sai de `sharing.ts` e vai para `src/ui/toast.ts` (criado na Fase 4)
- `sharing.ts` perde a responsabilidade de UI

**Mudanças de import nos arquivos movidos:**
- `storage/persistence.ts`: `"./types"` → `"../core/types"` (fflate não muda)
- `storage/sharing.ts`: `"./types"` → `"../core/types"`, `"./persistence"` → `"./persistence"` (mesmo diretório)

**Impacto externo:**
- `main.ts` → `"./persistence"` vira `"./storage/persistence"`, `"./sharing"` vira `"./storage/sharing"`
- `main.ts` → `showToast` agora importado de `"./ui/toast"` (após Fase 4)

**Testes impactados:**
- `persistence.test.ts` → `"../persistence"` vira `"../storage/persistence"`
- `sharing.test.ts` → `"../sharing"` vira `"../storage/sharing"`, `"../persistence"` vira `"../storage/persistence"`

**Validação:** `npm run test && npm run build` devem passar.

---

### Fase 4 — Criar `ui/` (mover renderer, handlers, toolbar, icons, style + criar toast)

**Arquivos movidos:**
| Origem | Destino |
|---|---|
| `src/renderer.ts` | `src/ui/renderer.ts` |
| `src/handlers.ts` | `src/ui/handlers.ts` |
| `src/toolbar.ts` | `src/ui/toolbar.ts` |
| `src/toolbar-icons.ts` | `src/ui/toolbar-icons.ts` |
| `src/style.css` | `src/ui/style.css` |

**Novo arquivo criado:**
- `src/ui/toast.ts` — contém `showToast()` extraído de `sharing.ts`

**Split de `renderer.ts` em renderer + hit-test:**

`src/ui/renderer.ts` mantém:
- `drawAll()`, `getPinPosition()`, `getEndpointPosition()`
- Funções internas de desenho (drawComponents, drawWireSegments, drawBezierWire, etc.)

`src/ui/hit-test.ts` recebe:
- `hitTest()`, `hitTestPin()`, `hitTestWire()`, `hitTestJunction()`
- Helper: `bezierPoint()` (necessário para hitTestWire)

**Mudanças de import nos arquivos movidos:**
- `ui/renderer.ts`: `"./types"` → `"../core/types"`, `"./registry"` → `"../core/registry"`
- `ui/hit-test.ts`: `"./types"` → `"../core/types"`, `"./registry"` → `"../core/registry"`, `getPinPosition` de `"./renderer"`
- `ui/handlers.ts`: `"./types"` → `"../core/types"`, `"./state"` → `"../state"`, `"./renderer"` → `"./renderer"` + `"./hit-test"`
- `ui/toolbar.ts`: `"./types"` → `"../core/types"`, `"./toolbar-icons"` → `"./toolbar-icons"`
- `ui/toolbar-icons.ts`: sem mudanças (sem imports)

**Impacto em `main.ts`:**
```typescript
// Antes
import { drawAll } from "./renderer";
import { handleCanvas* } from "./handlers";
import { createToolbar } from "./toolbar";
import "./style.css";

// Depois
import { drawAll } from "./ui/renderer";
import { handleCanvas* } from "./ui/handlers";
import { createToolbar } from "./ui/toolbar";
import { showToast } from "./ui/toast";
import "./ui/style.css";
```

**Testes impactados:**
- `wire.test.ts` → `"../renderer"` vira `"../ui/renderer"` (getPinPosition) + `"../ui/hit-test"` (hitTestPin)

**Validação:** `npm run test && npm run build` devem passar.

---

### Fase 5 — Atualizar documentação e configuração

**Arquivos a atualizar:**
- `.github/copilot-instructions.md` — atualizar tabela de arquivos e estrutura
- `CLAUDE.md` — atualizar arquitetura e paths
- `README.md` — se contiver informação de estrutura

**Nenhuma mudança necessária em:**
- `tsconfig.json` — `moduleResolution: "bundler"` resolve subpastas automaticamente
- `vite.config.ts` — sem mudanças necessárias
- `index.html` — aponta para `src/main.ts` que não muda de path

---

## Mapa Completo de Imports (Estado Final)

### main.ts
```typescript
import "./ui/style.css";
import { createEditorState, setSelectedTool, clearSelection, deleteSelected, clearPendingWire, toggleSimulation } from "./state";
import { createToolbar } from "./ui/toolbar";
import { drawAll } from "./ui/renderer";
import { evaluateCircuit } from "./core/simulation";
import { handleCanvasClick, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp } from "./ui/handlers";
import { saveCircuit, loadCircuit } from "./storage/persistence";
import { loadFromUrl, copyShareUrl } from "./storage/sharing";
import { showToast } from "./ui/toast";
```

### core/types.ts
Sem imports (raiz da árvore de dependências).

### core/registry.ts
```typescript
import type { ComponentType, ComponentDef } from "./types";
import { andGate } from "./components/and-gate";
import { orGate } from "./components/or-gate";
import { notGate } from "./components/not-gate";
import { switchComponent } from "./components/switch";
import { lightComponent } from "./components/light";
```

### core/simulation.ts
```typescript
import type { EditorState, Net, SignalValue, WireEndpoint } from "./types";
import { getComponentDef } from "./registry";
```

### core/components/*.ts
```typescript
import type { ComponentDef } from "../types";
```

### state/editor-state.ts
```typescript
import type { EditorState, ComponentType, ... } from "../core/types";
import { getComponentDef } from "../core/registry";
```

### state/mutations.ts
```typescript
import type { EditorState, ComponentType, Point, ... } from "../core/types";
import { getComponentDef } from "../core/registry";
import { endpointsEqual, resolveEndpoint } from "./editor-state";
```

### state/index.ts
```typescript
export { createEditorState, endpointsEqual, resolveEndpoint } from "./editor-state";
export { addComponent, setSelectedTool, selectComponent, ... } from "./mutations";
```

### storage/persistence.ts
```typescript
import { deflateSync, inflateSync } from "fflate";
import type { ComponentType, EditorState, PlacedComponent, Wire, WireSegment, WireJunction } from "../core/types";
```

### storage/sharing.ts
```typescript
import type { EditorState } from "../core/types";
import { exportCircuitToBase64, importCircuitFromBase64, type SerializedCircuitV2 } from "./persistence";
```

### ui/renderer.ts
```typescript
import type { EditorState, PlacedComponent, Point, PinDef, WireEndpoint } from "../core/types";
import { getComponentDef } from "../core/registry";
```

### ui/hit-test.ts
```typescript
import type { EditorState, PlacedComponent, Point, PinDef, WireEndpoint } from "../core/types";
import { getComponentDef } from "../core/registry";
import { getPinPosition, getEndpointPosition } from "./renderer";
```

### ui/handlers.ts
```typescript
import type { EditorState, Point, HoveredPin } from "../core/types";
import { addComponent, selectComponent, toggleComponentSelection, ... } from "../state";
import { hitTest, hitTestPin, hitTestWire, hitTestJunction } from "./hit-test";
```

### ui/toolbar.ts
```typescript
import type { ToolMode } from "../core/types";
import { selectIcon, wireIcon, andGateIcon, ... } from "./toolbar-icons";
```

### ui/toast.ts
```typescript
// Sem imports — função standalone de DOM
export function showToast(message: string, duration?: number): void { ... }
```

---

## Checklist por Fase

### Fase 1 — core/
- [ ] Criar diretório `src/core/`
- [ ] Mover `src/types.ts` → `src/core/types.ts`
- [ ] Mover `src/registry.ts` → `src/core/registry.ts`
- [ ] Mover `src/simulation.ts` → `src/core/simulation.ts`
- [ ] Mover `src/components/` → `src/core/components/`
- [ ] Atualizar imports em: state.ts, renderer.ts, handlers.ts, persistence.ts, sharing.ts, toolbar.ts, main.ts
- [ ] Atualizar imports em testes: and-gate, or-gate, not-gate, switch, light, net, simulation
- [ ] Rodar `npm run test && npm run build`

### Fase 2 — state/
- [ ] Criar diretório `src/state/`
- [ ] Extrair `createEditorState` + helpers para `src/state/editor-state.ts`
- [ ] Extrair mutations para `src/state/mutations.ts`
- [ ] Criar `src/state/index.ts` barrel export
- [ ] Remover `src/state.ts` original
- [ ] Atualizar imports em: handlers.ts, main.ts (se necessário)
- [ ] Verificar imports nos testes (barrel deve resolver automaticamente)
- [ ] Rodar `npm run test && npm run build`

### Fase 3 — storage/
- [ ] Criar diretório `src/storage/`
- [ ] Mover `src/persistence.ts` → `src/storage/persistence.ts`
- [ ] Mover `src/sharing.ts` → `src/storage/sharing.ts` (sem showToast)
- [ ] Atualizar imports internos (types → ../core/types)
- [ ] Atualizar imports em: main.ts
- [ ] Atualizar imports em testes: persistence.test.ts, sharing.test.ts
- [ ] Rodar `npm run test && npm run build`

### Fase 4 — ui/
- [ ] Criar diretório `src/ui/`
- [ ] Mover `src/renderer.ts` → `src/ui/renderer.ts`
- [ ] Extrair hit-testing para `src/ui/hit-test.ts`
- [ ] Mover `src/handlers.ts` → `src/ui/handlers.ts`
- [ ] Mover `src/toolbar.ts` → `src/ui/toolbar.ts`
- [ ] Mover `src/toolbar-icons.ts` → `src/ui/toolbar-icons.ts`
- [ ] Mover `src/style.css` → `src/ui/style.css`
- [ ] Criar `src/ui/toast.ts` com showToast extraído
- [ ] Atualizar imports internos
- [ ] Atualizar imports em: main.ts
- [ ] Atualizar imports em testes: wire.test.ts
- [ ] Rodar `npm run test && npm run build`

### Fase 5 — Documentação
- [ ] Atualizar `.github/copilot-instructions.md`
- [ ] Atualizar `CLAUDE.md`
- [ ] Verificar `README.md`

---

## Riscos e Mitigação

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Import circular entre state/ e ui/ | Baixa | handlers.ts importa de state/ (OK pela regra de camadas). state/ nunca importa de ui/. |
| Barrel export não resolve em testes | Baixa | Vitest com moduleResolution "bundler" resolve index.ts. Se falhar, usar path explícito `../state/index`. |
| Hit-test split causa dependência circular com renderer | Média | hit-test importa `getPinPosition` de renderer. renderer NÃO importa de hit-test. Direção unidirecional. |
| `getComponentDef` re-exportado de renderer.ts | Baixa | Remover re-export. Consumers devem importar direto de `core/registry`. |
| Testes com paths relativos quebrados | Média | Fase validation com `npm test` após cada fase garante detecção imediata. |

## Decisões de Design

1. **Barrel export para state/** — Mantém compatibilidade de import com `"./state"` e `"../state"` existentes.
2. **Não criar barrel para core/, storage/, ui/** — Não necessários pois os imports são específicos por arquivo. Evita indirection desnecessária.
3. **`endpointsEqual` e `resolveEndpoint` ficam em editor-state.ts** — São helpers usados pelas mutations, mas logicamente ligados à definição do estado. Exportados pelo barrel para uso externo se necessário.
4. **`showToast` vira módulo separado** — É uma utilidade de UI que não pertence a storage/sharing. Independente de qualquer outro módulo.
5. **Testes permanecem em `src/__tests__/`** — Não subdividir testes em módulos. Eles testam comportamento integrado e a flat structure é mais simples de navegar.
