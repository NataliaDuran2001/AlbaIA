# Handoff — Activar la IA en vivo (chatbot + análisis de roadmap)

> Estado al 2026-07-08. Todo el código está hecho, testeado y pusheado a `origin/main`.
> Lo ÚNICO pendiente es configuración de proveedor/entornos. La app funciona sin IA
> (fallback determinista): nada está roto mientras tanto.

## Tarea

Dejar la IA respondiendo en vivo en **local** y en **Vercel (producción)**:
1. El chatbot (burbuja flotante).
2. El análisis del roadmap (`generated_by='ai'` en la tabla `roadmaps`).

## Dónde quedó exactamente (bloqueo actual)

- La key de Fireworks en `.env.local` (`AI_API_KEY=fw_...`) **autentica bien**.
- El modelo configurado `accounts/fireworks/models/llama-v3p3-70b-instruct` devuelve
  **`404 Model not found, inaccessible, and/or not deployed`** en esa cuenta de Fireworks.
- Por eso el análisis cae al fallback (`generatedBy: fallback`). Verificado con el
  smoke test (ver abajo) el 2026-07-08.

**Siguiente paso concreto:** entrar a https://app.fireworks.ai/models, filtrar por
modelos *serverless* disponibles en tu cuenta, copiar el ID exacto (empieza con
`accounts/fireworks/models/...`) y ponerlo en `AI_MODEL` de `.env.local`. Re-correr
el smoke test hasta ver `chatCompletion: MODULE_OK` y `analyze.generatedBy: ai`.

## Cómo verificar (smoke test en vivo, sin levantar la app)

```bash
node --experimental-strip-types --import ./tests/unit/resolver.mjs scripts/smoke-ai.mts
```

Interpreta la salida según el encabezado del propio script (`scripts/smoke-ai.mts`).
Después de tocar `.env.local`, **reinicia el dev server** (Next solo lee env al arrancar).

## Archivos a leer, en orden

1. `.env.example` — referencia de TODAS las variables y de dónde sale cada una.
2. `lib/ai/openrouter.ts` — cliente provider-agnóstico (OpenAI-compatible). Lee
   `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL`; default Fireworks; fallback legacy a
   `OPENROUTER_*`. Pese al nombre del archivo, sirve para cualquier proveedor.
3. `lib/ai/analyze.ts` — análisis del roadmap: llamada JSON validada con Zod
   (`AnalysisSchema`), claves fuera del catálogo se descartan, fallback determinista.
4. `lib/actions/assistant.ts` — server action del chatbot, con fallback scripted.
5. `scripts/smoke-ai.mts` — el smoke test de arriba.

## Checklist restante

- [ ] Elegir un `AI_MODEL` válido (serverless, disponible en la cuenta de Fireworks).
- [ ] Smoke test verde en local (`MODULE_OK` + `generatedBy: ai`).
- [ ] Reiniciar dev server y probar la burbuja del chatbot en el navegador.
- [ ] Vercel → Settings → Environment Variables (Production + Preview):
      `AI_API_KEY`, `AI_BASE_URL=https://api.fireworks.ai/inference/v1`, `AI_MODEL`,
      y `DATA_ENCRYPTION_KEY` (generar UNA NUEVA para prod: `openssl rand -base64 32`,
      **respaldarla** — si se pierde, los datos cifrados quedan ilegibles).
- [ ] Redeploy en Vercel (las env vars solo aplican en builds nuevos).
- [ ] Verificar en prod: crear un roadmap y confirmar `generated_by='ai'` en Supabase.
- [ ] Revocar la key vieja de OpenRouter en https://openrouter.ai/keys (quedó
      expuesta en un chat; ya no se usa — el bloque `OPENROUTER_*` se eliminó de
      `.env.local`).

## Decisiones cerradas (no re-abrir)

- Cliente de IA **provider-agnóstico** vía endpoint OpenAI-compatible; se cambia de
  proveedor solo con env vars, sin tocar código. `AI_*` son las canónicas.
- **Fallback determinista siempre**: sin key o con error de API, el funnel y el
  chatbot siguen funcionando (`generated_by='fallback'`). Nunca romper el flujo.
- El modelo solo SELECCIONA claves del catálogo (`lib/ai/catalog.ts`); labels,
  descripciones y flags `premium`/`inputKind` se resuelven siempre en código.
- Keys solo en `.env.local` (gitignored) y en Vercel env vars. Nunca en el repo ni
  en chats. Plantilla: `.env.example`.
- Datos sensibles (DPI, NIT, dirección) cifrados AES-256-GCM en la capa de app
  (`lib/crypto/encryption.ts`); guardado falla cerrado sin `DATA_ENCRYPTION_KEY`.

## Entregable esperado

Chatbot y análisis respondiendo con IA real en local y en producción, checklist de
arriba completo, y este archivo eliminado del repo al cerrar (o movido a docs/).
