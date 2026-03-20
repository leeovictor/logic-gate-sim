# Plano: Toolbar + Placement de Gates no Canvas

## Contexto

O projeto é um simulador de circuitos lógicos web. Atualmente existe apenas um canvas full-viewport vazio. A primeira funcionalidade é uma **barra de ferramentas no topo** que permite selecionar uma porta lógica (AND) e colocá-la no canvas ao clicar. **Sem lógica de simulação** — apenas UI e renderização visual.

---

## Decisões de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Toolbar | **HTML overlay** (não desenhada no canvas) | Botões nativos = acessibilidade, hover, teclado de graça. Toolbar é UI chrome, não parte do circuito |
| Estrutura | **Módulos TS com interfaces simples** (sem classes) | Leve, testável, fácil de refatorar quando simulação chegar |
| Estado | **Objeto mutável `EditorState`** em `main.ts` | Simples, sem framework. Render loop lê dele a cada frame |
| Render | **`requestAnimationFrame` loop** | Idempotente — redesenha tudo a cada frame a partir do estado |

---

## Estrutura de Arquivos

```
src/
  main.ts              -- orquestrador: DOM, toolbar, canvas, state, render loop
  types.ts             -- interfaces (PlacedComponent, ComponentDef, EditorState, etc.)
  state.ts             -- factory + helpers (createEditorState, addComponent, setSelectedTool)
  toolbar.ts           -- cria toolbar HTML, bind de seleção de ferramenta
  renderer.ts          -- desenho no canvas: clear + draw de todos os componentes
  components/
    and-gate.ts        -- definição do AND gate: dimensões + função draw
  __tests__/
    state.test.ts      -- testes unitários do state
    and-gate.test.ts   -- testes do AND gate (dimensões, draw com ctx mockado)
```

---

## Módulos e Responsabilidades

### 1. `src/types.ts` — Tipos compartilhados

- `Point { x, y }`
- `ComponentType = "and-gate"` (union type, extensível)
- `ComponentDef { type, label, width, height, draw(ctx, x, y) }` — blueprint de um componente
- `PlacedComponent { id, type, position }` — instância no canvas
- `EditorState { selectedTool, components[] }`

### 2. `src/components/and-gate.ts` — Definição do AND Gate

- Exporta um `ComponentDef` com dimensões 80x50px
- Função `draw`: retângulo com fill claro + stroke escuro + texto "AND" centralizado
- Módulo puro (sem side effects, sem DOM) → fácil de testar

### 3. `src/state.ts` — Gerenciamento de Estado

- `createEditorState()` → estado inicial (`selectedTool: null`, `components: []`)
- `addComponent(state, type, position)` → adiciona `PlacedComponent` com id único
- `setSelectedTool(state, tool | null)` → define ferramenta ativa

### 4. `src/toolbar.ts` — Toolbar HTML

- `createToolbar(onToolSelect)` → retorna `<div class="toolbar">` com botão "AND Gate"
- Click no botão → `onToolSelect("and-gate")`. Click de novo → deseleciona (`null`)
- Classe CSS `active` no botão selecionado

### 5. `src/renderer.ts` — Renderização no Canvas

- Registry interno: `Map<ComponentType, ComponentDef>` (importa de `components/`)
- `drawAll(ctx, state, width, height)` → limpa canvas + itera `state.components` chamando `def.draw()`

### 6. `src/main.ts` — Orquestrador (reescrita)

1. Cria `EditorState`
2. Cria toolbar via `createToolbar()`, insere no `document.body`
3. Lê `toolbarElement.offsetHeight` (não hardcoda 48px)
4. Resize: `canvas.height = window.innerHeight - toolbarHeight`
5. Click no canvas: se `selectedTool != null`, chama `addComponent(state, selectedTool, {offsetX, offsetY})`
6. Render loop: `requestAnimationFrame` → `drawAll()`

### 7. `src/style.css` — Adições

- `.toolbar`: fixed top, height 48px, fundo escuro, flex row, gap entre botões
- `.toolbar button`: estilo base + `.active` com highlight azul
- `canvas`: `position: fixed; top: 48px` (abaixo da toolbar)

---

## Ordem de Implementação

1. **types.ts + state.ts** + testes → sem dependências
2. **components/and-gate.ts** + teste → depende só de types
3. **renderer.ts** → depende de types + and-gate
4. **toolbar.ts** → depende de types
5. **main.ts + style.css** → integra tudo
6. **Verificação** → `npm run build` + `npm run test` + teste manual no browser

---

## Verificação

- `npm run test` — todos os testes unitários passam
- `npm run build` — sem erros TypeScript
- `npm run dev` — abrir no browser e verificar:
  - Toolbar visível no topo com botão "AND Gate"
  - Clicar no botão → fica highlighted
  - Clicar no canvas → AND gate aparece na posição do click
  - Clicar novamente → mais gates aparecem
  - Resize da janela → canvas e toolbar se ajustam
