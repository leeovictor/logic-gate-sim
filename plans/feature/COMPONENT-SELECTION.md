# Plano: Seleção de Componentes

## Contexto

O editor atualmente só permite colocar componentes no canvas. Não há forma de selecionar componentes já colocados. Esta funcionalidade é essencial para futuras operações como mover, deletar e editar propriedades de componentes.

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/types.ts` | Adicionar `selectedComponentIds` ao `EditorState`, criar tipo `ToolMode` |
| `src/state.ts` | Novas mutações: `selectComponent`, `toggleComponentSelection`, `clearSelection` |
| `src/toolbar.ts` | Adicionar botão "Select" (cursor) como primeira opção do toolbar |
| `src/renderer.ts` | Desenhar contorno azul nos componentes selecionados |
| `src/main.ts` | Lógica de hit-testing no click, suporte a CTRL+click |
| `src/style.css` | Estilo do botão Select (se necessário) |

## Implementação

### 1. Tipos (`src/types.ts`)

- Expandir `EditorState` com `selectedComponentIds: Set<string>`
- Criar tipo `ToolMode = "select" | ComponentType` para representar a ferramenta ativa (select vs colocação de componente)
- Mudar `selectedTool` de `ComponentType | null` para `ToolMode | null`

### 2. Estado (`src/state.ts`)

Adicionar 3 mutações:

- **`selectComponent(state, id)`** — limpa seleção anterior e seleciona um componente
- **`toggleComponentSelection(state, id)`** — adiciona/remove da seleção (para CTRL+click)
- **`clearSelection(state)`** — limpa toda a seleção

### 3. Toolbar (`src/toolbar.ts`)

- Adicionar botão "Select" como primeiro botão, antes do "AND Gate"
- O botão Select funciona no mesmo padrão toggle dos demais (mutuamente exclusivo — ao ativar Select, desativa AND Gate e vice-versa)
- Refatorar para iterar sobre uma lista de ferramentas em vez de criar botões manualmente

### 4. Renderer (`src/renderer.ts`)

- Após desenhar cada componente, verificar se seu `id` está em `selectedComponentIds`
- Se selecionado, desenhar `strokeRect` azul (`#3b82f6`) com 2px de espessura e 4px de padding ao redor do componente
- Usar as dimensões do `ComponentDef` (width/height) para calcular o retângulo

### 5. Main — Hit Testing e Eventos (`src/main.ts`)

- No handler de click do canvas:
  - Se a ferramenta ativa é `"select"`:
    - Fazer hit-test: verificar se o clique está dentro do bounding box de algum componente (iterar de trás para frente para respeitar z-order)
    - Se `CTRL` está pressionado (`e.ctrlKey`): chamar `toggleComponentSelection`
    - Se `CTRL` não está pressionado: chamar `selectComponent` (seleção única)
    - Se clicou no vazio sem CTRL: chamar `clearSelection`
  - Se a ferramenta ativa é um `ComponentType`: comportamento atual (colocar componente) + limpar seleção
- Não mostrar ghost preview quando ferramenta é `"select"`

### 6. Hit Testing

Criar função `hitTest(state, point): PlacedComponent | null` em `src/renderer.ts` (ou novo arquivo `src/hit-test.ts`):
- Itera componentes de trás para frente
- Usa `getComponentDef` para obter width/height
- Retorna o primeiro componente cujo bounding box contém o ponto

## Verificação

1. `npm run build` — deve compilar sem erros
2. `npm run test` — testes existentes devem continuar passando
3. Teste manual:
   - Clicar em "Select" no toolbar ativa o modo seleção
   - Clicar em um componente no canvas destaca com contorno azul
   - Clicar em outro componente sem CTRL troca a seleção
   - CTRL+click adiciona/remove componentes da seleção
   - Clicar no vazio limpa a seleção
   - Trocar para "AND Gate" limpa seleção e volta ao modo de colocação
