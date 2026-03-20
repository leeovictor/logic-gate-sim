# 11 — Feedback Visual no Canvas

**Fase:** 3.2 — UI  
**Dependências:** 05-FACTORY-STATE  
**Arquivo alvo:** `src/ui/renderer.ts`

---

## Objetivo

Exibir overlay no canvas com informações do modo step: contador de steps e indicador de estabilidade. O rendering de sinais (cores de wires/componentes) já funciona automaticamente via `pinValues` e `signalValue`.

---

## Instruções de Implementação

### 1. Adicionar `drawStepOverlay()` em `src/ui/renderer.ts`

Criar uma nova função interna:

```ts
function drawStepOverlay(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  width: number,
): void {
  if (!state.simulationEnabled || state.simulationMode !== "step") return;

  const { stepCount, stable } = state.stepSimulation;

  ctx.save();

  // Step counter — top right
  const text = `Step ${stepCount}`;
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";

  // Background pill
  const metrics = ctx.measureText(text);
  const padding = 8;
  const pillX = width - metrics.width - padding * 3;
  const pillY = 8;
  const pillW = metrics.width + padding * 2;
  const pillH = 22;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 6);
  ctx.fill();

  // Text
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, width - padding * 2, pillY + 4);

  // Stability dot
  const dotX = pillX - 12;
  const dotY = pillY + pillH / 2;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
  ctx.fillStyle = stable ? "#22c55e" : "#eab308";
  ctx.fill();

  ctx.restore();
}
```

### 2. Integrar no `drawAll()`

Localizar `drawAll()`:

```ts
export function drawAll(
  ctx: CanvasRenderingContext2D,
  state: EditorState,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  drawComponents(ctx, state);
  drawWireSegments(ctx, state);
  drawPinIndicators(ctx, state);
  drawPendingWire(ctx, state);
  drawSelectionBox(ctx, state);
  drawGhostPreview(ctx, state);
}
```

Adicionar a chamada ao overlay **no final** (deve ser desenhado por cima de tudo):

```ts
  drawGhostPreview(ctx, state);
  drawStepOverlay(ctx, state, width);  // ← NOVO
```

### 3. Compatibilidade com `roundRect`

`CanvasRenderingContext2D.roundRect()` é suportado em browsers modernos (Chrome 99+, Firefox 112+, Safari 15.4+). Se compatibilidade com browsers mais antigos for necessária, usar fallback:

```ts
// Fallback for roundRect
if (typeof ctx.roundRect === "function") {
  ctx.roundRect(pillX, pillY, pillW, pillH, 6);
} else {
  ctx.rect(pillX, pillY, pillW, pillH);
}
```

---

## Decisões de Design

- **Overlay no canto superior direito** — fora da área de trabalho principal, não interfere com componentes.
- **Pill com fundo semi-transparente** — garante legibilidade sobre qualquer cor de fundo.
- **Dot de estabilidade verde/amarelo** — consistente com as cores usadas na toolbar (Fase 10).
- **Sem informação no modo instant** — overlay só aparece no modo step.

---

## Validação

Validação visual:

```bash
npm run dev
```

1. Ativar simulação em modo step → overlay "Step 0" aparece no canto superior direito
2. Executar steps → counter incrementa
3. Circuito estabiliza → dot verde
4. Circuito oscilando → dot amarelo

---

## Checklist

- [ ] `drawStepOverlay()` implementada
- [ ] Chamada adicionada ao `drawAll()`
- [ ] Overlay aparece apenas no modo step
- [ ] Counter e indicador de estabilidade renderizam corretamente
