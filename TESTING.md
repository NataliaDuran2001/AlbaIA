# AlbaIA — Testing

Cobertura de los criterios de aceptación del `Created MVP Review + Plan.md` §7.

## Estado actual (ejecutado en esta máquina)

| Suite | Requiere Supabase | Estado |
|---|---|---|
| `tests/unit/gating.spec.ts` (matriz tier × feature, `requiredTierFor`, `tierLabel`) | No | ✅ 5/5 verde |
| `tsc --noEmit` (typecheck estricto, cero `any`) | No | ✅ limpio |
| `next build` | No | ver §"Build" |
| `tests/e2e/*.spec.ts` (Playwright) | **Sí** | ⏳ escritos, **no ejecutados aquí** |
| RLS manual | **Sí** | ⏳ pendiente (procedimiento abajo) |
| Responsive 375px | corre la app | ⏳ pendiente |

> Los e2e **no se han corrido** en este entorno: no hay proyecto Supabase ni `.env.local` (Fase 0). No se reportan resultados simulados. Están listos para correr una vez completada la Fase 0.

## Cómo correr

```bash
# Unit (no necesita Supabase ni red)
npm run test:unit

# e2e (requiere Fase 0 completa + navegadores Playwright)
npm install              # instala @playwright/test y @axe-core/playwright
npx playwright install   # descarga navegadores
npm run seed:demo        # crea demo-free@albaia.gt y demo-pro@albaia.gt
npm run test:e2e
```

`playwright.config.ts` arranca `npm run dev` automáticamente (`webServer`).

## Suites e2e y qué criterio cubren

| Archivo | Criterio §7 |
|---|---|
| `flow-b-guest.spec.ts` | Flow B clickeable como invitado; el roadmap muestra estructura recomendada |
| `flow-a-full.spec.ts` | Flow A e2e con registro + compra Basic (demo); premium desbloqueado tras success |
| `flow-c-free.spec.ts` | Flow C: "Maybe later" sale sin comprar; premium sigue bloqueado; `/login` enlaza a `/signup` |
| `promotion.spec.ts` | Promoción guest→cuenta conserva datos (checklist sembrado del roadmap previo) |
| `a11y.spec.ts` | Sin violaciones serias (axe) en landing/checklist/pricing; hit targets ≥44px |

`gating.spec.ts` (unit) cubre el gating por feature de extremo a extremo.

## Pruebas manuales pendientes (documentar resultado al ejecutarlas)

### RLS — aislamiento entre usuarios
1. Crea usuario A y usuario B (signup con dos emails).
2. Como A, anota el `id` de una fila suya (p. ej. `business_profiles`) en el SQL Editor.
3. Con el **anon key** y la sesión de B, intenta `select`/`update` de esa fila:
   ```js
   const { data, error } = await supabase.from('business_profiles').select('*').eq('id', '<id-de-A>')
   ```
   Esperado: `data` vacío (RLS `user_id = auth.uid()` lo oculta). Repetir para `documents` vía storage: intentar `createSignedUrl` de un path de A desde B debe fallar.

### Responsive 375px
Abrir en 375px de ancho (DevTools iPhone SE) y verificar sin overflow horizontal:
- `/` (landing) — hero y form apilados.
- `/checklist` — items y card de unlock apilan.
- `/pricing` — las 3 cards en una columna.
