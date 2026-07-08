-- Migración: soporte de análisis IA en roadmaps
-- Ejecutar en el SQL Editor de Supabase.
--
-- Añade trazabilidad al resultado del análisis (rationale mostrado al usuario +
-- metadata de generación) sin cambiar el resto del esquema. La política RLS
-- existente ("own roadmap", for all using user_id = auth.uid()) cubre las
-- columnas nuevas sin cambios: RLS es por fila, no por columna.

alter table public.roadmaps
  add column if not exists rationale text,
  add column if not exists generated_by text not null default 'fallback'
    check (generated_by in ('ai', 'fallback')),
  add column if not exists model text,
  add column if not exists catalog_version text;

comment on column public.roadmaps.rationale is 'Justificación en lenguaje natural mostrada al usuario';
comment on column public.roadmaps.generated_by is 'ai = Claude API; fallback = lógica determinista local';
comment on column public.roadmaps.model is 'Model ID usado (null si fallback)';
comment on column public.roadmaps.catalog_version is 'Versión de lib/ai/catalog.ts vigente al generar';

create index if not exists roadmaps_user_id_idx on public.roadmaps (user_id);
