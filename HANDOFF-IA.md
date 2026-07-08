# Handoff — Activar la IA en vivo (chatbot + análisis de roadmap)

> Estado al 2026-07-08. Todo el código está hecho, testeado y pusheado a `origin/main`.
> Lo ÚNICO pendiente es configuración de proveedor/entornos. La app funciona sin IA
> (fallback determinista): nada está roto mientras tanto.

## Tarea

Dejar la IA respondiendo en vivo en **local** y en **Vercel (producción)**:
1. El chatbot (burbuja flotante).
2. El análisis del roadmap (`generated_by='ai'` en la tabla `roadmaps`).

## Estado en LOCAL: RESUELTO ✅ (2026-07-08)

El bloqueo del modelo ya se resolvió. Historial:
- La key de Fireworks (`AI_API_KEY=fw_...`) autentica bien.
- El modelo inicial `accounts/fireworks/models/llama-v3p3-70b-instruct` daba
  **404 (Model not found)** — esa cuenta de Fireworks NO tiene Llama. Se consultó
  el catálogo real de la cuenta: 7 modelos, ninguno Llama.
- **Modelo elegido y validado: `accounts/fireworks/models/deepseek-v4-pro`.**
  Devuelve JSON estructurado correcto para el análisis del roadmap.
- `.env.local` ya tiene `AI_MODEL=accounts/fireworks/models/deepseek-v4-pro`.
- Validación integral en verde con `scripts/validate-setup.mts` (env vars, cifrado,
  Supabase, esquema 0001/0002, IA en vivo → `generatedBy: ai`).

> ⚠️ **`deepseek-v4-pro` es un modelo de razonamiento**: para el roadmap da igual
> (usa `response_format: json_object`), pero el chatbot puede sonar verboso. Si
> molesta, ajustar el prompt del asistente o usar otro modelo solo para ese caso.

**Pendiente en PRODUCCIÓN (Vercel):** setear las 7 env vars (ver checklist abajo)
usando **`AI_MODEL=accounts/fireworks/models/deepseek-v4-pro`** — NO el Llama.
Redeploy y verificar `generated_by='ai'` en Supabase.

Otros modelos de texto disponibles en la cuenta (por si se cambia): `gpt-oss-120b`,
`glm-5p1`, `glm-5p2`, `deepseek-v4-pro`, `kimi-k2p5`, `kimi-k2p6`.

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

- [x] Elegir un `AI_MODEL` válido → `deepseek-v4-pro` (2026-07-08).
- [x] Validación en local verde → `scripts/validate-setup.mts` (todo OK, `generatedBy: ai`).
- [ ] Probar la burbuja del chatbot en el navegador (el análisis del roadmap ya
      confirmado por el validador; falta la prueba manual del chatbot).
- [ ] Vercel → Settings → Environment Variables (Production + Preview) — las 7:
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `DATA_ENCRYPTION_KEY`, `AI_API_KEY`,
      `AI_BASE_URL=https://api.fireworks.ai/inference/v1`,
      `AI_MODEL=accounts/fireworks/models/deepseek-v4-pro`.
      Sobre `DATA_ENCRYPTION_KEY`: se reusó la misma de local (huella sha256 `26ac6ff3`);
      **respaldarla** — si se pierde o se rota, los datos ya cifrados quedan ilegibles.
- [ ] Redeploy en Vercel (las env vars solo aplican en builds nuevos).
- [ ] Verificar en prod: crear un roadmap y confirmar `generated_by='ai'` en Supabase.
- [ ] (Opcional) Validar las env vars de prod ANTES de redeploy: copiar los valores
      de Vercel a un archivo `.env.production.check` y correr
      `node --experimental-strip-types --import ./tests/unit/resolver.mjs scripts/validate-setup.mts .env.production.check`,
      luego borrar ese archivo (tiene secretos).
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
