# Plano: Compartilhamento de Circuito via URL

## Contexto

O projeto já possui uma camada de persistência em `src/persistence.ts` que serializa o circuito no formato `SerializedCircuitV2` (componentes, wireSegments, junctions e contadores de ID) e salva em `localStorage`. A feature de compartilhamento vai reutilizar essa lógica de serialização para gerar uma URL com o conteúdo codificado em Base64.

## Formato da URL

```
https://leeovictor.github.io/logic-gate-sim?c=<base64_content>
```

Onde `<base64_content>` é o JSON do circuito (formato `SerializedCircuitV2`) codificado em Base64 URL-safe.

## Tarefas

### 1. Funções de serialização para URL (`src/persistence.ts`)

- Extrair a lógica de serialização do circuito (já existente em `saveCircuit()`) para uma função reutilizável `serializeCircuit(state): SerializedCircuitV2`
- Criar `exportCircuitToBase64(state): string` — serializa o estado, converte para JSON, depois para Base64 URL-safe (`btoa` + substituição de `+/=` por chars URL-safe)
- Criar `importCircuitFromBase64(encoded): SerializedCircuitV2 | null` — decodifica Base64, faz parse do JSON, valida com `isValidCircuit()`, retorna os dados ou `null`
- `saveCircuit()` passa a usar `serializeCircuit()` internamente (refactor sem mudança de comportamento)

### 2. Lógica de compartilhamento (`src/sharing.ts` — novo arquivo)

- `generateShareUrl(state): string` — usa `exportCircuitToBase64()` para gerar a URL completa com `window.location.origin + window.location.pathname + '?c=' + base64`
- `copyShareUrl(state): Promise<boolean>` — gera a URL, copia para o clipboard via `navigator.clipboard.writeText()`, retorna sucesso/falha
- `loadFromUrl(): SerializedCircuitV2 | null` — lê `URLSearchParams` do `window.location.search`, extrai o param `c`, decodifica via `importCircuitFromBase64()`

### 3. Botão "Share" na toolbar (`src/toolbar.ts` + `src/toolbar-icons.ts` + `src/style.css`)

- Adicionar ícone SVG `shareIcon()` em `src/toolbar-icons.ts` (ícone de compartilhamento padrão — seta saindo de uma caixa ou nós conectados)
- Adicionar botão "Share" na toolbar, posicionado **à direita** separado dos botões de ferramentas (semelhante ao botão "Simulate" que já fica isolado)
- O botão recebe callback `onShare` passado para `createToolbar()`
- Estilização: consistente com os botões existentes, sem estado ativo (é uma ação, não um toggle)

### 4. Feedback visual — Toast/Notificação (`src/style.css` + `src/sharing.ts`)

- Criar uma função `showToast(message: string, duration?: number)` que:
  - Cria um `<div class="toast">` com a mensagem
  - Adiciona ao DOM com animação de fade-in
  - Remove automaticamente após `duration` ms (padrão: 3000ms)
- Mensagem de sucesso: `"Link copied to clipboard!"`
- Mensagem de erro (fallback se clipboard API falhar): `"Failed to copy link"`
- CSS: posição fixa no bottom-center, fundo escuro, texto branco, `border-radius`, animação de entrada/saída

### 5. Carregamento de circuito via URL (`src/main.ts`)

- No boot da aplicação (em `src/main.ts`), **antes** de carregar do `localStorage`, verificar se existe o query param `c` na URL
- Se existir: decodificar e carregar o circuito compartilhado (priorizando a URL sobre o localStorage)
- Após carregar com sucesso, limpar o query param da URL com `history.replaceState()` para deixar a URL limpa (evitar recarregar o circuito compartilhado em refreshes futuros)
- Salvar o circuito carregado no localStorage para persistência local

### 6. Testes (`src/__tests__/sharing.test.ts` — novo arquivo)

- **`exportCircuitToBase64` / `importCircuitFromBase64`**: round-trip (serializar → deserializar preserva dados)
- **`generateShareUrl`**: gera URL no formato esperado com param `c`
- **`loadFromUrl`**: mockar `window.location.search`, verificar parsing correto
- **Casos de erro**: Base64 inválido, JSON corrompido, circuito com schema inválido → retorna `null`
- **Limite de tamanho**: verificar que circuitos grandes geram URLs válidas (awareness, não bloqueante)

## Ordem de implementação

1. Refactor de `serializeCircuit()` em `persistence.ts`
2. Funções de export/import Base64 em `persistence.ts`
3. `src/sharing.ts` com `generateShareUrl`, `copyShareUrl`, `loadFromUrl`, `showToast`
4. Ícone SVG + botão Share na toolbar
5. CSS do toast
6. Integração no `main.ts` — boot via URL + wiring do botão Share
7. Testes

## Riscos e considerações

- **Limite de tamanho de URL**: URLs têm limite prático de ~2000 chars em alguns browsers. Um circuito com muitos componentes pode ultrapassar isso. Para o MVP, apenas documentar essa limitação. Futuramente pode-se usar compressão (ex: `pako`/deflate antes do Base64).
- **Base64 URL-safe**: Usar variante URL-safe (`-` no lugar de `+`, `_` no lugar de `/`, sem padding `=`) para evitar encoding issues no query param.
- **Versionamento**: O formato já tem campo `version: 2`, então circuitos compartilhados com versões futuras podem ser migrados normalmente.
- **Segurança**: A decodificação usa `JSON.parse` + validação com `isValidCircuit()`. Não há execução de código arbitrário — apenas dados estruturados são aceitos.

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/persistence.ts` | Extrair `serializeCircuit()`, adicionar `exportCircuitToBase64()`, `importCircuitFromBase64()` |
| `src/sharing.ts` (novo) | `generateShareUrl()`, `copyShareUrl()`, `loadFromUrl()`, `showToast()` |
| `src/toolbar.ts` | Adicionar botão Share + callback `onShare` |
| `src/toolbar-icons.ts` | Adicionar `shareIcon()` |
| `src/style.css` | Estilos do toast + ajuste de posicionamento do botão Share |
| `src/main.ts` | Carregar circuito da URL no boot + wiring do Share |
| `src/__tests__/sharing.test.ts` (novo) | Testes de serialização, URL, e casos de erro |
