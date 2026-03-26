# Plano: Persistência de Viewport (Zoom + Pan)

## Objetivo
Persistir o estado de viewport (`panX`, `panY`, `zoom`) tanto no localStorage quanto no compartilhamento por URL, garantindo que ao abrir um circuito salvo ou compartilhado, o usuário retorne ao mesmo enquadramento visual.

---

## Fase 1 — Tipos e Interface Compartilhada (`persistence.ts`)

1. Adicionar `viewport?: Viewport` ao `SerializedCircuitV2` (opcional, retrocompatível)
2. Criar `SerializedCircuitV3` com `version: 3` e `viewport: Viewport` (obrigatório)
3. Atualizar `serializeCircuit()` para emitir v3 com viewport atual
4. Atualizar `loadCircuit()` para lidar com v3 e v2 (v2 retorna viewport padrão)
5. Atualizar `isValidCircuit()` para aceitar version 3

---

## Fase 2 — Formato Binário + URL (`binary-format.ts`)

6. Bump `FORMAT_VERSION` para 7
7. Em `serializeToBinary()`: adicionar 12 bytes após header (3x `Float32LE`)
8. Em `deserializeFromBinary()`: ler viewport se versão >= 7

---

## Fase 3 — Aplicação na Carga (`main.ts`)

9. Após carregar circuito (URL ou localStorage), aplicar viewport carregado se existir

---

## Fase 4 — Testes

10. `persistence.test.ts`: testar save/load v3 com viewport, e v2 retorna viewport padrão
11. `viewport-sharing.test.ts`: round-trip de viewport no binário v7 e binário v6 retorna viewport undefined

---

## Decisões
- `Float32` para panX/panY/zoom no binário (precisão e footprint ideais)
- Viewport fica dentro do parâmetro `c=` da URL (sem novo query param)
- `viewport` opcional na interface para retrocompatibilidade

## Verificação
- `npm run test` deve passar
- Teste manual: salvar, recarregar, compartilhar e abrir links mantendo viewport
- Abrir circuitos antigos (v2) deve restaurar viewport padrão
