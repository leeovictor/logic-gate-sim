# Plano: Conexões (Wires) entre Componentes

## Contexto

O editor permite colocar e selecionar componentes no canvas, mas não há forma de conectá-los. Esta funcionalidade adiciona o conceito de **portas (pins)** nos componentes e uma ferramenta **Wire** para criar conexões visuais entre elas. Não inclui lógica de simulação — apenas a modelagem e renderização das conexões.

## Conceitos

- **Pin**: ponto de conexão de um componente (entrada ou saída), definido com posição relativa ao componente e direção (`"input"` ou `"output"`)
- **Wire**: conexão entre dois pins de dois componentes distintos, armazenada como referência `{ fromComponentId, fromPinIndex, toComponentId, toPinIndex }`
- **Ferramenta Wire**: modo do toolbar que permite criar wires clicando em um pin de saída e depois em um pin de entrada

## Arquivos a criar

| Arquivo | Papel |
|---|---|
| `src/__tests__/wire.test.ts` | Testes para estado de wires, hit-test de pins e validações |

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/types.ts` | Adicionar tipos `PinDef`, `Pin`, `Wire`; expandir `ComponentDef` com array de pins; expandir `EditorState` com `wires` e `pendingWire`; expandir `ToolMode` com `"wire"` |
| `src/components/and-gate.ts` | Adicionar definição de pins: 2 inputs (esquerda) + 1 output (direita) |
| `src/state.ts` | Novas mutações: `addWire`, `removeWiresForComponent`, `setPendingWire`, `clearPendingWire`; atualizar `deleteSelected` para remover wires dos componentes deletados |
| `src/toolbar.ts` | Adicionar botão "Wire" na lista de ferramentas |
| `src/renderer.ts` | Desenhar wires como linhas pretas; desenhar pins como círculos vermelhos quando ferramenta Wire ativa; desenhar preview do wire pendente |
| `src/main.ts` | Lógica de click para criação de wires: hit-test em pins, gerenciamento de wire pendente |

## Implementação

### 1. Tipos (`src/types.ts`)

```ts
export type PinDirection = "input" | "output";

export interface PinDef {
  direction: PinDirection;
  /** Posição relativa ao top-left do componente */
  x: number;
  y: number;
}

export interface Wire {
  id: string;
  fromComponentId: string;
  fromPinIndex: number;
  toComponentId: string;
  toPinIndex: number;
}

export interface PendingWire {
  componentId: string;
  pinIndex: number;
}
```

- Expandir `ComponentDef` com `pins: PinDef[]`
- Expandir `ToolMode`: `"select" | "wire" | ComponentType`
- Expandir `EditorState` com:
  - `wires: Wire[]`
  - `pendingWire: PendingWire | null` (primeiro pin clicado durante criação)

### 2. Pins do AND Gate (`src/components/and-gate.ts`)

Baseado nas coordenadas reais do `draw()`:

| Pin | Direction | x | y | Justificativa |
|---|---|---|---|---|
| Input 0 | input | 0 | 12.5 | `h * 0.25` — ponta da linha superior esquerda |
| Input 1 | input | 0 | 37.5 | `h * 0.75` — ponta da linha inferior esquerda |
| Output 0 | output | 80 | 25 | `w` , `h * 0.5` — ponta da linha direita |

```ts
pins: [
  { direction: "input",  x: 0,  y: 12.5 },
  { direction: "input",  x: 0,  y: 37.5 },
  { direction: "output", x: 80, y: 25 },
]
```

### 3. Estado (`src/state.ts`)

Novas mutações:

- **`addWire(state, from, to): Wire`** — cria wire com id auto-incrementado (`wire-0`, `wire-1`, ...). Validações:
  - Os dois pins devem existir (componente + índice válido)
  - Não permitir conectar um componente a si mesmo
  - Não permitir conectar output↔output ou input↔input (from.pin deve ser output, to.pin deve ser input)
  - Não permitir wire duplicado (mesmos 4 campos)
- **`removeWiresForComponent(state, componentId)`** — remove todos os wires conectados ao componente
- **`setPendingWire(state, componentId, pinIndex)`** — define o primeiro pin de um wire em construção
- **`clearPendingWire(state)`** — cancela wire em construção
- **Atualizar `deleteSelected`** — chamar `removeWiresForComponent` para cada componente deletado

### 4. Toolbar (`src/toolbar.ts`)

Adicionar à lista `tools`:

```ts
{ id: "wire", label: "Wire" },
```

Posicionar entre "Select" e "AND Gate":

```ts
const tools: ToolDef[] = [
  { id: "select",   label: "Select" },
  { id: "wire",     label: "Wire" },
  { id: "and-gate", label: "AND Gate" },
];
```

### 5. Renderer (`src/renderer.ts`)

#### 5a. Desenhar Wires

Após desenhar todos os componentes (e antes do ghost preview), iterar `state.wires`:

- Para cada wire, resolver as posições absolutas dos pins (posição do componente + offset do pin)
- Desenhar linha preta (`#1a1a1a`), espessura 2px, entre os dois pontos

#### 5b. Desenhar Pins (modo Wire)

Quando `state.selectedTool === "wire"`:

- Para cada componente, iterar seus `pins` do `ComponentDef`
- Desenhar círculo vermelho (`#ef4444`) com raio 5px na posição absoluta de cada pin (posição do componente + offset do pin)
- Pin que faz parte do `pendingWire` deve ter destaque diferente (preenchimento sólido vermelho em vez de apenas contorno, ou borda mais grossa)

#### 5c. Preview do Wire Pendente

Quando `state.pendingWire !== null` e `state.cursorPosition !== null`:

- Desenhar linha tracejada (`setLineDash([6, 3])`) do pin de origem até a posição do cursor
- Cor preta, espessura 2px, 60% opacidade

#### Nova função utilitária: `getPinPosition`

```ts
export function getPinPosition(comp: PlacedComponent, pinDef: PinDef): Point {
  return { x: comp.position.x + pinDef.x, y: comp.position.y + pinDef.y };
}
```

#### Nova função: `hitTestPin`

```ts
export function hitTestPin(
  state: EditorState,
  point: Point,
  radius?: number,
): { componentId: string; pinIndex: number } | null
```

- Itera componentes e seus pins
- Retorna o primeiro pin cuja distância ao ponto é ≤ `radius` (default: 10px)

### 6. Main — Eventos de Wire (`src/main.ts`)

No handler de click do canvas, adicionar branch para `state.selectedTool === "wire"`:

```
if ferramenta === "wire":
  hit = hitTestPin(state, point)
  if hit:
    if pendingWire === null:
      // Primeiro click — inicia wire (só permite começar de output)
      if pin.direction === "output":
        setPendingWire(state, hit.componentId, hit.pinIndex)
    else:
      // Segundo click — completa wire (só permite terminar em input)
      if pin.direction === "input":
        addWire(state, pendingWire, hit)
        clearPendingWire(state)
      else:
        // Clicou em outro output — troca o ponto de origem
        setPendingWire(state, hit.componentId, hit.pinIndex)
  else:
    // Clicou no vazio — cancela wire pendente
    clearPendingWire(state)
```

Adicionar ao handler de `keydown`:
- `Escape` cancela wire pendente (`clearPendingWire`)

### 7. Testes (`src/__tests__/wire.test.ts`)

```
describe("addWire")
  ✓ cria wire com id único entre output e input de componentes diferentes
  ✓ rejeita wire entre dois pins do mesmo componente
  ✓ rejeita wire entre dois outputs
  ✓ rejeita wire entre dois inputs
  ✓ rejeita wire duplicado (mesmos from/to)
  ✓ retorna null nas rejeições acima

describe("removeWiresForComponent")
  ✓ remove todos os wires conectados a um componente (from e to)
  ✓ não remove wires de outros componentes

describe("deleteSelected com wires")
  ✓ ao deletar componente, seus wires são removidos junto

describe("pendingWire")
  ✓ setPendingWire define o wire pendente
  ✓ clearPendingWire limpa o wire pendente

describe("hitTestPin")
  ✓ retorna pin quando clique está dentro do raio
  ✓ retorna null quando clique está fora do raio
  ✓ respeita z-order (componente mais acima tem prioridade)

describe("getPinPosition")
  ✓ calcula posição absoluta do pin corretamente
```

## Ordem de Implementação

1. `src/types.ts` — tipos novos
2. `src/components/and-gate.ts` — pins do AND gate
3. `src/state.ts` — mutações de wire
4. `src/renderer.ts` — `getPinPosition`, `hitTestPin`, renderização
5. `src/toolbar.ts` — botão Wire
6. `src/main.ts` — eventos
7. `src/__tests__/wire.test.ts` — testes

## Verificação

1. `npm run build` — deve compilar sem erros
2. `npm run test` — todos os testes devem passar
3. Teste manual:
   - Colocar dois AND gates no canvas
   - Selecionar ferramenta Wire — pins aparecem como círculos vermelhos
   - Clicar no output de um gate — preview do wire segue o cursor
   - Clicar no input de outro gate — wire desenhado como linha preta
   - Pressionar Escape cancela wire pendente
   - Deletar componente remove seus wires
   - Trocar ferramenta cancela wire pendente
