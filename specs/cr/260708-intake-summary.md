# Intake Summary — 2026-07-08

Feature nueva dividida en 3 CRs a partir de un borrador de spec ("lista de pasos"). Verificado en intake: **nada de esto existía en el repo** (solo migraciones `0001`/`0002`, sin `app/api/`, sin `IA/`, sin los scripts; no está en ninguna rama ni stash).

## Decisiones de negocio tomadas por el humano (no re-litigar)

1. **Reabrir la decisión cerrada de IA:** la IA sí podrá consultar/parafrasear texto legal GT (RAG legal). Antes estaba prohibido (`lib/ai/catalog.ts`, `HANDOFF-IA.md` L87). Autorizado por natalia.duran@comocom.com.
2. **Dividir en 3 CRs** (no un CR monolítico) para aislar el riesgo legal y permitir entregas incrementales.
3. **Orden de ejecución: CR-1 → CR-2 → CR-3.**

## CRs creados

| # | CR-ID | Sev | Track | Alcance | Depende de |
|---|-------|-----|-------|---------|------------|
| CR-1 | 260708-154709 | Normal | Standard | Perfil extendido + cifrado | — |
| CR-2 | 260708-154710 | High | Fast | Regulación legal GT + RAG + política IA sobre ley | — |
| CR-3 | 260708-154711 | Normal | Standard | Endpoint `/api/negocio` + generación de documentos | CR-1, CR-2 |

## Secuencia recomendada

1. **`/spec 260708-154709`** — perfil extendido. Bajo riesgo, desbloquea CR-3.
2. **`/spec 260708-154710`** — regulación legal. La spec debe resolver citación, disclaimers y responsabilidad como decisiones de negocio explícitas.
3. **`/spec 260708-154711`** — endpoint de documentos. Solo después de que CR-1 y CR-2 estén en `SPEC_APPROVED`. La spec debe resolver REST-vs-server-action y plantilla-vs-IA.

## Notas técnicas transversales

- Migración: dividir la propuesta `0003_perfil_extendido_y_regulaciones.sql` en dos (`0003` perfil, `0004` regulaciones) para desacoplar CR-1 y CR-2. A confirmar en spec/plan.
- CR-3 introduce el primer endpoint REST del proyecto (el resto son server actions en `lib/actions/`); esa divergencia de patrón debe justificarse.
- Cifrado sensible reutiliza `lib/crypto/encryption.ts` (AES-256-GCM, falla-cerrado).
