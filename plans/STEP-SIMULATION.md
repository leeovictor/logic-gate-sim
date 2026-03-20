# Simulação por Propagação de Sinal em Steps

## Motivação

A simulação atual usa avaliação instantânea com convergência iterativa: `evaluateCircuit()` executa um loop de até 100 iterações, avaliando todos os componentes e resolvendo nets a cada iteração até que os valores estabilizem. Circuitos cíclicos que não convergem são marcados como erro e todos os `pinValues` são limpos.

Essa abordagem tem duas limitações:

1. **Sem visibilidade intermediária** — o usuário não acompanha como o sinal se propaga passo a passo pelo circuito.
2. **Circuitos cíclicos não funcionam** — latches, flip-flops e osciladores são marcados como erro ao não convergir em 100 iterações.

A simulação por step resolve ambos os problemas: cada step propaga sinais por exatamente **uma camada de profundidade**, permitindo observação gradual e suporte natural a ciclos (o estado anterior alimenta a próxima iteração).

---

## Análise do Código Atual

### `evaluateCircuit()` — [src/core/simulation.ts](src/core/simulation.ts#L152-L237)

- Chamada em pontos discretos: após toggle de switch, adição de wire/componente, toggle de simulação.
- Fluxo: `buildNets()` → loop de convergência (até 100 iterações) → para cada componente: lê inputs das nets → `evaluate()` → escreve `pinValues` → `resolveNetSignal()` por net → checa convergência.
- Se não convergir: `clearAllPinValues()` — destrói todo estado de simulação.

### Estado relevante em `EditorState`

- `simulationEnabled: boolean` — liga/desliga simulação.
- `nets: Net[]` — reconstruídas a cada `evaluateCircuit()`.
- `comp.state.pinValues: SignalValue[]` — valores de pinos por componente (set pelo loop de simulação).
- `comp.state.value` — estado interno de switches e lights.

### Pontos de chamada de `evaluateCircuit()`

| Arquivo | Contexto |
|---|---|
| `main.ts` | `reEvaluate()` — wrapper chamado pelos handlers |
| `main.ts` | Toggle de simulação (direto) |
| `handlers.ts` | Indiretamente via `ctx.reEvaluate()` após: toggle switch, complete wire, place component, delete |

### Rendering e feedback visual

- Wires já colorem por sinal: verde (1), cinza (0), vermelho (E).
- Componentes usam `comp.state.pinValues` e `comp.state.value` para renderização.
- O render loop é contínuo (`requestAnimationFrame`) — qualquer mudança no state já aparece no próximo frame.

---

## Plano de Implementação

### Fase 1 — Modelo de simulação por step (core)

**Objetivo:** Substituir o loop de convergência por uma função de step único, mantendo backward-compatibility com o modo instantâneo existente.

#### 1.1 Novos tipos em `src/core/types.ts`

```ts
export type SimulationMode = "instant" | "step";

export interface StepSimulationState {
  /** Contagem de steps executados desde o início/reset da simulação */
  stepCount: number;
  /** Se a simulação está rodando automaticamente (auto-step) */
  running: boolean;
  /** Intervalo em ms entre auto-steps (default: 500) */
  stepInterval: number;
  /** ID do timer de auto-step (para cancelamento) */
  autoStepTimer: ReturnType<typeof setInterval> | null;
  /** Snapshot dos valores de net do step anterior (para detecção de estabilidade) */
  previousNetValues: Map<string, SignalValue>;
  /** Se o circuito estabilizou (nenhuma net mudou no último step) */
  stable: boolean;
}
```

Adicionar ao `EditorState`:

```ts
simulationMode: SimulationMode;
stepSimulation: StepSimulationState;
```

#### 1.2 Nova função `stepCircuit()` em `src/core/simulation.ts`

```ts
/**
 * Executa exatamente UM step de propagação:
 * 1. (Re)constrói nets se necessário
 * 2. Para cada componente, lê inputs das nets atuais, avalia, escreve pinValues
 * 3. Resolve sinais das nets com base nos novos outputs
 * 4. Compara com valores anteriores para detectar estabilidade
 * 5. Incrementa stepCount
 */
export function stepCircuit(state: EditorState): void;
```

Internamente, extrai o corpo de **uma única iteração** do loop atual de `evaluateCircuit()`. A lógica de comparação com valores anteriores muda de "convergência para parar o loop" para "flag de estabilidade para informar o usuário".

A função `evaluateCircuit()` existente continua funcionando para o modo `"instant"` — sem breaking change.

#### 1.3 Funções auxiliares de controle

```ts
/** Reseta o estado da simulação step (zera contadores, limpa valores) */
export function resetStepSimulation(state: EditorState): void;

/** Inicia auto-step com o intervalo configurado */
export function startAutoStep(state: EditorState, onStep: () => void): void;

/** Para o auto-step */
export function stopAutoStep(state: EditorState): void;
```

#### 1.4 Mudança no `evaluateCircuit()` existente

Adicionar um guard no início:

```ts
export function evaluateCircuit(state: EditorState): void {
  if (!state.simulationEnabled) {
    clearAllPinValues(state);
    return;
  }

  // No modo step, não executa automaticamente — o usuário controla
  if (state.simulationMode === "step") {
    // Apenas reconstrói nets para manter a topologia atualizada
    state.nets = buildNets(state);
    return;
  }

  // ... resto do modo instant (inalterado)
}
```

#### 1.5 Mudança na detecção de ciclos

No modo step, ciclos deixam de ser erros. O circuito simplesmente oscila entre estados a cada step. A flag `stable` indica se o circuito convergiu ou se está em oscilação.

---

### Fase 2 — Integração com o estado do editor

#### 2.1 Factory `createEditorState()` em `src/state/editor-state.ts`

Adicionar inicialização dos novos campos:

```ts
simulationMode: "instant",
stepSimulation: {
  stepCount: 0,
  running: false,
  stepInterval: 500,
  autoStepTimer: null,
  previousNetValues: new Map(),
  stable: false,
},
```

#### 2.2 Novas mutations em `src/state/mutations.ts`

```ts
/** Alterna entre modo instant e step */
export function setSimulationMode(state: EditorState, mode: SimulationMode): void;

/** Executa um step manual (delega para stepCircuit) */
export function performStep(state: EditorState): void;

/** Toggle de auto-step (play/pause) */
export function toggleAutoStep(state: EditorState, onStep: () => void): void;

/** Ajusta velocidade do auto-step */
export function setStepInterval(state: EditorState, ms: number): void;

/** Reseta a simulação step (volta ao step 0) */
export function resetStep(state: EditorState): void;
```

#### 2.3 Barrel export em `src/state/index.ts`

Re-exportar as novas mutations.

#### 2.4 Integração com `toggleSimulation()`

Quando a simulação é desabilitada, garantir que o auto-step é parado e o estado step é resetado:

```ts
export function toggleSimulation(state: EditorState): void {
  state.simulationEnabled = !state.simulationEnabled;
  if (state.simulationEnabled) {
    state.selectedTool = null;
    state.events.dispatchEvent(new CustomEvent("toolchange", { detail: null }));
  } else {
    stopAutoStep(state);
    resetStepSimulation(state);
  }
}
```

---

### Fase 3 — Interface de usuário

#### 3.1 Controles de simulação na toolbar (`src/ui/toolbar.ts`)

Quando o modo step estiver ativo, exibir um painel de controles abaixo ou ao lado do botão de simulação com:

| Controle | Ação | Shortcut |
|---|---|---|
| **Mode toggle** | Alterna instant ↔ step | `M` |
| **Step** | Executa um step (só no modo step) | `N` ou `Space` |
| **Play/Pause** | Toggle auto-step | `P` |
| **Reset** | Volta ao step 0 | `R` |
| **Speed slider** | Ajusta `stepInterval` (100ms–2000ms) | — |
| **Step counter** | Exibe "Step: 42" (read-only) | — |
| **Stable indicator** | Ícone ● verde se estável, ● amarelo se oscilando | — |

Os controles de step só ficam visíveis quando `simulationEnabled && simulationMode === "step"`.

#### 3.2 Feedback visual no canvas (`src/ui/renderer.ts`)

- **Step counter overlay** — Exibir "Step N" no canto superior direito do canvas quando no modo step.
- **Estabilidade** — Se `stable === true`, exibir indicador "Estável" ou borda verde sutil.
- Os wires e componentes já reagem dinamicamente via `pinValues` e `signalValue` das nets — nenhuma mudança necessária no rendering de sinais.

#### 3.3 Novos atalhos de teclado (`src/main.ts`)

Dentro do `keydown` listener existente:

```ts
if (e.key === "n" || e.key === "N") {
  if (state.simulationEnabled && state.simulationMode === "step") {
    performStep(state);
    save();
  }
}
if (e.key === "m" || e.key === "M") {
  if (state.simulationEnabled) {
    setSimulationMode(state, state.simulationMode === "instant" ? "step" : "instant");
    evaluateCircuit(state);
  }
}
```

#### 3.4 Integração com handlers (`src/ui/handlers.ts`)

No modo step, `ctx.reEvaluate()` deve ter comportamento diferente:

- **Mudanças estruturais** (adicionar wire, componente, deletar): Reconstruir nets mas **não** executar step automaticamente. Resetar `stepCount` para 0 (topologia mudou).
- **Toggle de switch**: Em modo step, **não** propaga imediatamente — o valor é registrado no estado do switch e será propagado no próximo step manual. Alternativamente, pode executar um step automático (decisão de UX — recomendo não propagar para ser consistente com o modelo step).

Implementar via mudança no `reEvaluate()` em `main.ts`:

```ts
function reEvaluate() {
  if (!state.simulationEnabled) return;
  if (state.simulationMode === "step") {
    // Reconstruir topologia, resetar step counter
    state.nets = buildNets(state);
    resetStepSimulation(state);
    // Não executa step — o usuário decide quando propagar
  } else {
    evaluateCircuit(state);
  }
}
```

---

### Fase 4 — Persistência e compartilhamento

#### 4.1 `src/storage/persistence.ts`

Salvar `simulationMode` no circuito persistido. O `stepSimulation` runtime (timer, stepCount) **não** é persistido — é estado transiente.

Atualizar o formato de serialização (incrementar versão se necessário) para incluir:

```ts
simulationMode?: SimulationMode; // default "instant" para backward-compat
```

#### 4.2 `src/storage/sharing.ts`

Mesmo tratamento: incluir `simulationMode` no payload compartilhado se for `"step"`. Omitir se `"instant"` para manter URLs menores.

---

### Fase 5 — Testes

#### 5.1 Testes unitários de `stepCircuit()` — `src/__tests__/step-simulation.test.ts`

| Caso de teste | Descrição |
|---|---|
| **Step propaga uma camada** | Switch(1) → AND → Light. Step 1: switch output propaga para net. Step 2: AND avalia input, produz output. Step 3: Light recebe valor. Verificar valores intermediários. |
| **Step counter incrementa** | Verificar `stepCount` após N steps. |
| **Estabilidade detectada** | Circuito acíclico simples: após N steps suficientes, `stable === true`. |
| **Ciclo não gera erro** | NOT gate alimentando a si mesmo: steps alternam entre 0 e 1 sem erro. `stable === false`. |
| **Ciclo estável** | AND(0,x) loop: step estabiliza em 0. `stable === true`. |
| **Reset limpa estado** | Após steps, `resetStepSimulation()` zera contadores e pinValues. |
| **Mudança estrutural reseta** | Adicionar wire no meio da simulação step reseta `stepCount`. |
| **Multi-driver conflict** | Dois switches conflitantes: step detecta `"E"` normalmente. |
| **Simulação desabilitada limpa step** | `toggleSimulation()` para auto-step e reseta. |

#### 5.2 Testes de mutations — `src/__tests__/step-mutations.test.ts`

| Caso de teste | Descrição |
|---|---|
| **setSimulationMode** | Alterna entre modos, verifica campo no state. |
| **performStep** | Chama `stepCircuit`, incrementa counter. |
| **toggleAutoStep** | Liga/desliga timer, verifica `running`. |
| **setStepInterval** | Muda intervalo, reinicia timer se `running`. |
| **resetStep** | Zera tudo, limpa `pinValues`. |

#### 5.3 Testes de regressão nos existentes

Os testes em `simulation.test.ts` continuam passando — `evaluateCircuit()` no modo `"instant"` (default) não muda de comportamento.

---

## Modelo de Propagação — Detalhamento Técnico

### Semântica de um step

Um step executa a sequinte sequência atômica:

```
Para cada componente C:
  1. Ler SignalValue de cada net conectada aos pinos de entrada de C
  2. Chamar C.evaluate(inputs, state)
  3. Escrever outputs em C.state.pinValues

Para cada net N:
  4. Chamar resolveNetSignal(N, state) com os novos pinValues
  5. Atualizar N.signalValue
```

Isso significa que no modelo step, **todos os componentes leem os valores da "rodada anterior"** e escrevem para a próxima. Isso é uma **simulação síncrona baseada em ciclos** (similar a como hardware real funciona com clock).

### Diferença do modelo atual

| Aspecto | Instant (atual) | Step (novo) |
|---|---|---|
| Propagação | Loop até convergência | Uma camada por step |
| Ciclos | Erro se não converge | Oscilação natural |
| Feedback visual | Resultado final | Estado intermediário visível |
| Trigger | Automático (a cada mudança) | Manual ou auto-step com timer |
| Flip-flops | Impossíveis | Viáveis (comportamento desejável com clock) |

### Profundidade de propagação

Em um circuito acíclico de profundidade D (maior caminho de input a output), são necessários no mínimo D steps para propagar o sinal completamente. O indicador de estabilidade mostra ao usuário quando pode parar.

---

## Planos de Implementação Detalhados

Cada fase foi dividida em planos individuais na pasta `plans/step-simulation/`:

| # | Arquivo | Fase | Dependências |
|---|---|---|---|
| 01 | [01-TIPOS.md](step-simulation/01-TIPOS.md) | 1.1 — Novos tipos | Nenhuma |
| 02 | [02-STEP-CIRCUIT.md](step-simulation/02-STEP-CIRCUIT.md) | 1.2 — `stepCircuit()` | 01 |
| 03 | [03-FUNCOES-AUXILIARES.md](step-simulation/03-FUNCOES-AUXILIARES.md) | 1.3 — Reset/Auto-step | 01, 02 |
| 04 | [04-GUARD-EVALUATE.md](step-simulation/04-GUARD-EVALUATE.md) | 1.4 — Guard em `evaluateCircuit()` | 01 |
| 05 | [05-FACTORY-STATE.md](step-simulation/05-FACTORY-STATE.md) | 2.1 — Factory state | 01 |
| 06 | [06-MUTATIONS.md](step-simulation/06-MUTATIONS.md) | 2.2 — Mutations step | 01, 02, 03, 05 |
| 07 | [07-BARREL-EXPORT.md](step-simulation/07-BARREL-EXPORT.md) | 2.3 — Barrel export | 06 |
| 08 | [08-TESTES-CORE.md](step-simulation/08-TESTES-CORE.md) | 5.1 — Testes stepCircuit | 02, 03, 05 |
| 09 | [09-TESTES-MUTATIONS.md](step-simulation/09-TESTES-MUTATIONS.md) | 5.2 — Testes mutations | 06, 07 |
| 10 | [10-TOOLBAR-CONTROLES.md](step-simulation/10-TOOLBAR-CONTROLES.md) | 3.1 — Toolbar controls | 06, 07 |
| 11 | [11-CANVAS-OVERLAY.md](step-simulation/11-CANVAS-OVERLAY.md) | 3.2 — Canvas overlay | 05 |
| 12 | [12-KEYBOARD-E-INTEGRACAO.md](step-simulation/12-KEYBOARD-E-INTEGRACAO.md) | 3.3/3.4 — Keyboard + handlers | 06, 07, 10 |
| 13 | [13-PERSISTENCIA.md](step-simulation/13-PERSISTENCIA.md) | 4 — Persistência | 01 |
| 14 | [14-TESTES-REGRESSAO.md](step-simulation/14-TESTES-REGRESSAO.md) | 5.3 — Testes regressão | Todas |

### Ordem de Implementação Recomendada

```
01 Tipos                    → sem dependências
02 stepCircuit()            → depende de 01
03 Funções auxiliares       → depende de 01, 02
04 Guard em evaluateCircuit → depende de 01
05 Factory state            → depende de 01
06 Mutations                → depende de 01, 02, 03, 05
07 Barrel export            → depende de 06
08 Testes step core         → depende de 02, 03, 05
09 Testes step mutations    → depende de 06, 07
10 Toolbar controls         → depende de 06, 07
11 Canvas overlay           → depende de 05
12 Keyboard + integração    → depende de 06, 07, 10
13 Persistência             → depende de 01
14 Testes regressão         → depende de tudo
```

---

## Riscos e Decisões Pendentes

1. **Switch toggle em modo step** — propagar imediatamente ou esperar o próximo step? Recomendação: esperar, para manter consistência. O toggle do switch muda `comp.state.value`, que será lido no próximo `stepCircuit()`.

2. **Auto-step e performance** — a cada tick do timer, `stepCircuit()` executa. Para circuitos grandes, garantir que `buildNets()` não seja rechamado desnecessariamente (cache de topologia, invalidar só quando a estrutura muda).

3. **Feedback de oscilação** — circuitos que oscilam indefinidamente (ex: NOT → NOT loop) nunca estabilizam. Considerar um indicador visual distinto para "oscilando" vs "propagando" vs "estável".

4. **Granularidade do step** — o plano define step como "avaliar todos os componentes uma vez". Uma alternativa seria "avaliar um componente por vez" para granularidade máxima, mas isso adiciona complexidade significativa sem benefício claro para a maioria dos casos.

5. **Backward-compatibility** — circuitos salvos antes dessa feature usam modo `"instant"` por default. Nenhuma migração necessária.
