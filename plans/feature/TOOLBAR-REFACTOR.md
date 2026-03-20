# Toolbar Refactoring Plan

## Objetivo

Decompor a função monolítica `createToolbar` (218 linhas) em funções menores com responsabilidades bem definidas, melhorando testabilidade e extensibilidade sem alterar a API pública.

## Arquivo alvo

`src/toolbar.ts` — 274 linhas

---

## Fase 1 — Extrair `DropdownController`

**Violação**: SRP — estado do dropdown espalhado em 5 variáveis mutáveis no closure (`groupWrapper`, `groupTrigger`, `groupDropdownButtons`, `currentTriggerIcon`) + 4 funções auxiliares (`deactivateAll`, `closeDropdown`, `openDropdown`, `isDropdownOpen`).

### Estado atual (linhas 74–93)

```typescript
let groupWrapper: HTMLDivElement | null = null;
let groupTrigger: HTMLButtonElement | null = null;
let groupDropdownButtons: HTMLButtonElement[] = [];

function deactivateAll() { ... }
function closeDropdown() { ... }
function openDropdown() { ... }
function isDropdownOpen() { ... }
```

### Estado desejado

Criar interface e função factory:

```typescript
interface DropdownController {
  wrapper: HTMLDivElement;
  trigger: HTMLButtonElement;
  itemButtons: HTMLButtonElement[];
  open(): void;
  close(): void;
  isOpen(): boolean;
  activate(): void;
  deactivate(): void;
  setTriggerIcon(iconFactory: () => SVGSVGElement): void;
}
```

`setTriggerIcon` elimina a duplicação de `replaceChild` + reatribuição de `currentTriggerIcon` que existe nas linhas 153 e 188:

```typescript
// Linha 153 — no click do trigger (deselect)
const resetIcon = andGateIcon();
trigger.replaceChild(resetIcon, currentTriggerIcon);
currentTriggerIcon = resetIcon;

// Linha 188 — no click de item do dropdown
const newIcon = (toolIcons[itemId] ?? andGateIcon)();
trigger.replaceChild(newIcon, currentTriggerIcon);
currentTriggerIcon = newIcon;
```

Ambos passam a ser uma chamada:

```typescript
controller.setTriggerIcon(andGateIcon);       // deselect
controller.setTriggerIcon(toolIcons[itemId]);  // item select
```

### Implementação de `setTriggerIcon`

```typescript
setTriggerIcon(iconFactory: () => SVGSVGElement): void {
  const newIcon = iconFactory();
  trigger.replaceChild(newIcon, currentIcon);
  currentIcon = newIcon;
}
```

`currentIcon` passa a ser interno ao `DropdownController`, não mais variável solta no closure.

### Impacto

- `createToolbar` perde ~50 linhas de lógica de estado do dropdown.
- O singular `groupWrapper`/`groupTrigger` passa a ser `controller: DropdownController | null`, preparando para múltiplos grupos no futuro.

### Testes

Testar isoladamente:
- `controller.open()` → `wrapper.classList.contains("open")` é `true`
- `controller.close()` → `wrapper.classList.contains("open")` é `false`
- `controller.setTriggerIcon(orGateIcon)` → trigger contém SVG do OR gate
- `controller.activate()` / `deactivate()` → classe `"active"` adicionada/removida

---

## Fase 2 — Extrair `createToolButton`

**Violação**: SRP — construção de DOM + binding de click handler para botões simples está inline no loop (linhas 100–124).

### Estado atual

```typescript
if (!isGroup(entry)) {
  const btn = document.createElement("button");
  btn.appendChild((toolIcons[entry.id] ?? selectIcon)());
  const hint = document.createElement("span");
  hint.className = "shortcut-hint";
  hint.textContent = String(shortcutIndex);
  btn.appendChild(hint);
  btn.dataset.tool = entry.id;
  btn.title = entry.label;
  btn.setAttribute("aria-label", entry.label);

  const toolId = entry.id;
  btn.addEventListener("click", () => {
    const isActive = btn.classList.contains("active");
    deactivateAll();
    if (!isActive) {
      btn.classList.add("active");
      onToolSelect(toolId);
    } else {
      onToolSelect(null);
    }
  });

  topButtons.push(btn);
  toolbar.appendChild(btn);
  shortcutIndex++;
}
```

### Estado desejado

```typescript
function createToolButton(
  tool: ToolDef,
  shortcut: number,
  onSelect: (toolId: ToolMode | null) => void,
  deactivateAll: () => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.appendChild((toolIcons[tool.id] ?? selectIcon)());

  const hint = document.createElement("span");
  hint.className = "shortcut-hint";
  hint.textContent = String(shortcut);
  btn.appendChild(hint);

  btn.dataset.tool = tool.id;
  btn.title = tool.label;
  btn.setAttribute("aria-label", tool.label);

  btn.addEventListener("click", () => {
    const isActive = btn.classList.contains("active");
    deactivateAll();
    if (!isActive) {
      btn.classList.add("active");
      onSelect(tool.id);
    } else {
      onSelect(null);
    }
  });

  return btn;
}
```

### Impacto

- O loop em `createToolbar` fica reduzido a:
  ```typescript
  const btn = createToolButton(entry, shortcutIndex, onToolSelect, deactivateAll);
  topButtons.push(btn);
  toolbar.appendChild(btn);
  ```
- ~25 linhas removidas do corpo de `createToolbar`.

### Testes

- Verificar que `btn.dataset.tool` é populado corretamente.
- Click alterna classe `"active"` e chama `onSelect` com o `toolId` / `null`.

---

## Fase 3 — Extrair `createToolGroup`

**Violação**: SRP — construção do dropdown (wrapper, trigger, chevron, itens, panel) e seus event handlers estão todos inline (linhas 126–202).

### Estado atual

Bloco `else` do loop com ~76 linhas criando:
1. `wrapper` (div `.tool-group`)
2. `trigger` (button `.tool-group-trigger`) com ícone, chevron, hint
3. Click handler do trigger com 3 branches (deselect / close / open)
4. `dropdown` (div `.dropdown`) com loop interno para itens
5. Click handler de cada item (deactivateAll + swap icon + select)

### Estado desejado

```typescript
function createToolGroup(
  group: ToolGroup,
  shortcut: number,
  onSelect: (toolId: ToolMode | null) => void,
  deactivateTopButtons: () => void,
): DropdownController {
  // Constrói wrapper, trigger, dropdown panel, item buttons
  // Retorna DropdownController com todos os elementos e métodos
}
```

### Detalhes internos

O `trigger` click handler usa o `DropdownController` da Fase 1:

```typescript
trigger.addEventListener("click", (e) => {
  e.stopPropagation();
  if (controller.wrapper.classList.contains("active")) {
    controller.deactivate();
    controller.setTriggerIcon(defaultIconFactory);
    onSelect(null);
  } else if (controller.isOpen()) {
    controller.close();
  } else {
    deactivateTopButtons();
    controller.open();
  }
});
```

Cada item button:

```typescript
itemBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  deactivateTopButtons();
  controller.deactivate(); // limpa estado anterior
  controller.activate();
  controller.setTriggerIcon(toolIcons[itemId] ?? defaultIconFactory);
  onSelect(itemId);
});
```

### Dependência

Depende da Fase 1 (interface `DropdownController`).

### Impacto

- Remove ~76 linhas do corpo de `createToolbar`.
- O loop principal fica:
  ```typescript
  const controller = createToolGroup(entry, shortcutIndex, onToolSelect, deactivateTopButtons);
  dropdown = controller;
  toolbar.appendChild(controller.wrapper);
  ```

### Testes

- Verificar que click num item chama `onSelect(itemId)` e marca wrapper como `"active"`.
- Verificar que click no trigger com grupo ativo chama `onSelect(null)`.
- Verificar que ícone do trigger muda ao selecionar item.

---

## Fase 4 — Extrair `createSimToggle`

**Violação**: SRP menor — bloco autocontido (linhas 210–224) que constrói o botão de simulação.

### Estado atual

```typescript
const simBtn = document.createElement("button");
const simLabel = document.createElement("span");
simLabel.textContent = "⚡ Simulate";
const simHint = document.createElement("span");
simHint.className = "shortcut-hint";
simHint.textContent = "T";
simBtn.appendChild(simLabel);
simBtn.appendChild(simHint);
simBtn.className = "sim-toggle";
simBtn.addEventListener("click", () => {
  closeDropdown();
  simBtn.classList.toggle("active");
  onSimulationToggle(simBtn.classList.contains("active"));
});
```

### Estado desejado

```typescript
function createSimToggle(
  onToggle: (enabled: boolean) => void,
  onBeforeToggle?: () => void,
): HTMLButtonElement {
  const btn = document.createElement("button");
  const label = document.createElement("span");
  label.textContent = "⚡ Simulate";
  const hint = document.createElement("span");
  hint.className = "shortcut-hint";
  hint.textContent = "T";
  btn.appendChild(label);
  btn.appendChild(hint);
  btn.className = "sim-toggle";

  btn.addEventListener("click", () => {
    onBeforeToggle?.();
    btn.classList.toggle("active");
    onToggle(btn.classList.contains("active"));
  });

  return btn;
}
```

`onBeforeToggle` recebe `closeDropdown` para fechar o dropdown antes do toggle.

### Impacto

- ~15 linhas removidas de `createToolbar`.
- Independente das outras fases, pode ser feita a qualquer momento.

### Testes

- Click alterna classe `"active"`.
- `onToggle` recebe `true`/`false` corretamente.
- `onBeforeToggle` é chamado antes do toggle.

---

## Fase 5 — Extrair `bindToolbarShortcuts`

**Violação**: SRP — handler de teclado (linhas 235–271) misturado com construção de DOM.

### Estado atual

```typescript
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeDropdown(); return; }
  if (e.key === "t" || e.key === "T") { simBtn.click(); return; }

  const num = Number(e.key);
  if (num < 1) return;

  if (isDropdownOpen() && num >= 1 && num <= groupDropdownButtons.length) {
    groupDropdownButtons[num - 1].click();
    return;
  }

  if (num >= 1 && num <= topLevelCount) {
    let idx = 0;
    for (const entry of toolEntries) {
      idx++;
      if (idx === num) {
        if (isGroup(entry)) {
          groupTrigger?.click();
        } else {
          const btn = topButtons.find((b) => b.dataset.tool === entry.id);
          btn?.click();
        }
        break;
      }
    }
  }
});
```

### Estado desejado

```typescript
interface ShortcutBindings {
  topButtons: HTMLButtonElement[];
  dropdown: DropdownController | null;
  simButton: HTMLButtonElement;
}

function bindToolbarShortcuts(bindings: ShortcutBindings): void {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      bindings.dropdown?.close();
      return;
    }
    if (e.key === "t" || e.key === "T") {
      bindings.simButton.click();
      return;
    }

    const num = Number(e.key);
    if (num < 1) return;

    // Sub-shortcuts quando dropdown está aberto
    if (bindings.dropdown?.isOpen()) {
      const items = bindings.dropdown.itemButtons;
      if (num >= 1 && num <= items.length) {
        items[num - 1].click();
        return;
      }
    }

    // Top-level shortcuts
    if (num >= 1 && num <= toolEntries.length) {
      let idx = 0;
      for (const entry of toolEntries) {
        idx++;
        if (idx === num) {
          if (isGroup(entry)) {
            bindings.dropdown?.trigger.click();
          } else {
            const btn = bindings.topButtons.find(
              (b) => b.dataset.tool === entry.id,
            );
            btn?.click();
          }
          break;
        }
      }
    }
  });
}
```

### Impacto

- ~37 linhas removidas de `createToolbar`.
- Handler de teclado fica testável isoladamente (mockar `window.addEventListener`).

### Testes

- Disparar `KeyboardEvent` com key `"1"` → primeiro botão clicado.
- Disparar `"Escape"` → dropdown fecha.
- Com dropdown aberto, `"2"` → segundo item do dropdown clicado.
- `"t"` → simButton clicado.

---

## Fase 6 — Simplificar `createToolbar` (orquestrador)

Após as fases 1–5, `createToolbar` fica como orquestrador limpo:

```typescript
export function createToolbar(
  onToolSelect: (tool: ToolMode | null) => void,
  onSimulationToggle: (enabled: boolean) => void,
  events: EventTarget,
): HTMLDivElement {
  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";

  const topButtons: HTMLButtonElement[] = [];
  let dropdown: DropdownController | null = null;

  function deactivateAll() {
    for (const b of topButtons) b.classList.remove("active");
    dropdown?.deactivate();
    dropdown?.close();
  }

  // Escuta evento externo de mudança de ferramenta
  events.addEventListener("toolchange", (e: Event) => {
    const detail = (e as CustomEvent<ToolMode | null>).detail;
    if (detail === null) deactivateAll();
  });

  // Constrói botões a partir de toolEntries
  let shortcutIndex = 1;
  for (const entry of toolEntries) {
    if (!isGroup(entry)) {
      const btn = createToolButton(entry, shortcutIndex, onToolSelect, deactivateAll);
      topButtons.push(btn);
      toolbar.appendChild(btn);
    } else {
      const deactivateTopButtons = () => {
        for (const b of topButtons) b.classList.remove("active");
      };
      const controller = createToolGroup(entry, shortcutIndex, onToolSelect, deactivateTopButtons);
      dropdown = controller;
      toolbar.appendChild(controller.wrapper);
    }
    shortcutIndex++;
  }

  // Separador + toggle de simulação
  const separator = document.createElement("div");
  separator.className = "separator";
  toolbar.appendChild(separator);

  const simBtn = createSimToggle(onSimulationToggle, () => dropdown?.close());
  toolbar.appendChild(simBtn);

  // Fechar dropdown ao clicar fora
  document.addEventListener("click", (e) => {
    if (dropdown && !dropdown.wrapper.contains(e.target as Node)) {
      dropdown.close();
    }
  });

  // Atalhos de teclado
  bindToolbarShortcuts({ topButtons, dropdown, simButton: simBtn });

  return toolbar;
}
```

**Resultado**: ~50 linhas, contra as 218 originais. Cada responsabilidade isolada em sua própria função.

---

## Estrutura final do arquivo

```
src/toolbar.ts
├── Imports + constantes (toolIcons, toolEntries)        ~40 linhas
├── Tipos locais (ToolDef, ToolGroup, ToolEntry)         ~15 linhas
├── interface DropdownController                         ~12 linhas
├── interface ShortcutBindings                           ~6 linhas
├── createToolButton(...)                                ~25 linhas
├── createToolGroup(...) → DropdownController            ~65 linhas
├── createSimToggle(...)                                 ~18 linhas
├── bindToolbarShortcuts(...)                            ~35 linhas
└── createToolbar(...) — orquestrador                    ~50 linhas
                                                  Total: ~266 linhas
```

O total de linhas fica similar, mas a complexidade ciclomática de cada função cai drasticamente e cada peça se torna testável isoladamente.

---

## Ordem de execução

| Fase | Dependência | Risco |
|------|-------------|-------|
| 1. DropdownController | Nenhuma | Baixo |
| 2. createToolButton | Nenhuma | Baixo |
| 3. createToolGroup | Fase 1 | Baixo |
| 4. createSimToggle | Nenhuma | Baixo |
| 5. bindToolbarShortcuts | Fase 1 (usa DropdownController) | Baixo |
| 6. Simplificar createToolbar | Fases 1–5 | Baixo |

Fases 1, 2 e 4 são independentes e podem ser feitas em paralelo.

---

## Checklist de segurança

- [ ] Rodar `npm run build` após cada fase — garantir zero erros de tipo
- [ ] Rodar `npm run test` — nenhum teste existente deve quebrar
- [ ] Testar manualmente no browser:
  - [ ] Click em cada botão da toolbar seleciona/deseleciona a ferramenta
  - [ ] Dropdown de gates abre, seleciona gate, ícone do trigger atualiza
  - [ ] Click fora do dropdown fecha o dropdown
  - [ ] Atalhos numéricos (1–5) funcionam
  - [ ] Atalho T toggle simulação
  - [ ] Escape fecha dropdown
  - [ ] Evento `toolchange` com `null` desativa todos os botões
