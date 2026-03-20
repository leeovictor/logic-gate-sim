# 07 — Barrel Export

**Fase:** 2.3 — State  
**Dependências:** 06-MUTATIONS  
**Arquivo alvo:** `src/state/index.ts`

---

## Objetivo

Re-exportar as novas mutations do módulo `state/` para que sejam acessíveis via `import { ... } from "@/state"`.

---

## Instruções de Implementação

### 1. Adicionar ao bloco de re-exports de `./mutations`

Localizar o bloco de exports em `src/state/index.ts`:

```ts
export {
  addComponent,
  setSelectedTool,
  // ... todas as exports existentes ...
  endSelectionBox,
} from "./mutations";
```

Adicionar as novas funções ao final, antes do `}`:

```ts
  // Step simulation mutations
  setSimulationMode,
  performStep,
  toggleAutoStep,
  setStepInterval,
  resetStep,
```

---

## Validação

```bash
npm run build
```

Verificar que os novos exports são acessíveis:

```ts
import { performStep, setSimulationMode } from "@/state";
```

---

## Checklist

- [ ] `setSimulationMode` re-exportada
- [ ] `performStep` re-exportada
- [ ] `toggleAutoStep` re-exportada
- [ ] `setStepInterval` re-exportada
- [ ] `resetStep` re-exportada
- [ ] Build passa
