-- Migración: tipo de paso (data | upload), valor de dato cifrado y anti-duplicados
-- Ejecutar en el SQL Editor de Supabase.
--
-- Contexto:
--  * Bug de duplicados (#2): la lista mostraba el mismo paso dos veces. Se añade
--    una restricción UNIQUE (user_id, key) para que la BD rechace duplicados,
--    tras limpiar los que ya existan.
--  * Inputs vs uploads (#3): no todos los pasos suben documento; algunos capturan
--    un dato (DPI, NIT, dirección). Se añade input_kind y data_value.
--  * Cifrado (#13): los datos sensibles (DPI, NIT, dirección) se cifran en la capa
--    de aplicación (AES-256-GCM) ANTES de escribirse. data_value guarda SIEMPRE el
--    texto cifrado (nunca plano). data_is_sensitive marca las filas cifradas.

-- 1) Columnas nuevas en checklist_items ------------------------------------
alter table public.checklist_items
  add column if not exists input_kind text not null default 'upload'
    check (input_kind in ('data', 'upload')),
  -- Valor capturado para pasos de tipo "data". Cifrado en reposo cuando la fila
  -- es sensible; texto plano solo para datos no sensibles (p. ej. régimen SAT).
  add column if not exists data_value text,
  add column if not exists data_is_sensitive boolean not null default false;

comment on column public.checklist_items.input_kind is 'data = captura un dato; upload = sube un documento';
comment on column public.checklist_items.data_value is 'Valor del paso "data". Cifrado (AES-256-GCM) si data_is_sensitive = true';
comment on column public.checklist_items.data_is_sensitive is 'true → data_value está cifrado en la capa de aplicación';

-- 2) Limpieza de duplicados existentes --------------------------------------
-- Conserva la fila de menor sort_order (o menor id) por (user_id, key).
delete from public.checklist_items c
using public.checklist_items d
where c.user_id = d.user_id
  and c.key = d.key
  and (c.sort_order, c.id) > (d.sort_order, d.id);

-- 3) Restricción anti-duplicados --------------------------------------------
create unique index if not exists checklist_items_user_key_uidx
  on public.checklist_items (user_id, key);
