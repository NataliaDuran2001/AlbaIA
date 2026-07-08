-- Migración 0003: perfil extendido + base legal para RAG
--
-- Parte A: nuevas columnas en business_profiles para el formulario inteligente
--   (número de socios, empleados, licencias especiales, rango de ingresos).
--   Usadas por lib/ai/analyze.ts para recomendaciones más precisas y por
--   lib/fases/generarDocumento.ts para pre-llenar documentos.
--
-- Parte B: tablas documentos_regulacion + chunks_regulacion con búsqueda
--   de texto (tsvector/GIN). Sin Voyage/embeddings — costo $0.
--   Función buscar_chunks_texto lista para usar desde lib/fases/generarDocumento.ts.
--
-- Ejecutar en el SQL Editor de Supabase.

-- ============================================================
-- PARTE A — business_profiles extendido
-- ============================================================

alter table public.business_profiles
  -- Número mínimo de propietarios/socios (1 = comerciante individual / SE,
  -- 2-20 = SRL, 2+ = SA). Reemplaza el campo "size" como señal primaria.
  add column if not exists numero_socios integer,

  -- Los socios son familia o personas de confianza cercana → orienta hacia SRL.
  add column if not exists socios_son_familia boolean,

  -- Busca atraer inversionistas externos o emitir acciones → SA.
  add column if not exists busca_inversionistas boolean,

  -- Tendrá empleados (true) o no. Con 3+ → IGSS patronal obligatorio.
  add column if not exists tendra_empleados boolean,

  -- Número aproximado de empleados. Null si tendra_empleados = false.
  add column if not exists numero_empleados integer,

  -- Venderá bebidas alcohólicas → permiso especial (Ministerio de Gobernación).
  add column if not exists vende_alcohol boolean,

  -- Tendrá local físico abierto al público → licencia municipal + rótulo.
  add column if not exists local_fisico boolean,

  -- Rango de ingresos mensuales esperados. Orienta el régimen tributario:
  --   "low"       = < Q10,000   → Pequeño Contribuyente casi siempre viable
  --   "medium"    = Q10K–Q40K   → Pequeño Contribuyente viable (< Q500K/año)
  --   "high"      = Q40K–Q150K  → revisar límite anual (~Q500K); tal vez Simplificado
  --   "very_high" = > Q150K     → Simplificado u Sobre Utilidades
  add column if not exists ingresos_mensuales_rango text
    check (ingresos_mensuales_rango in ('low', 'medium', 'high', 'very_high'));

comment on column public.business_profiles.numero_socios       is 'Número mínimo de propietarios; define figura legal viable';
comment on column public.business_profiles.socios_son_familia  is 'true → SRL es más adecuada que SA';
comment on column public.business_profiles.busca_inversionistas is 'true → SA (puede emitir acciones)';
comment on column public.business_profiles.tendra_empleados    is 'true → incluir pasos IGSS y contratos';
comment on column public.business_profiles.numero_empleados    is '≥3 → IGSS patronal obligatorio';
comment on column public.business_profiles.vende_alcohol       is 'true → permiso bebidas alcohólicas';
comment on column public.business_profiles.local_fisico        is 'true → licencia municipal y rótulo';
comment on column public.business_profiles.ingresos_mensuales_rango is 'Rango orientativo para régimen tributario';

-- ============================================================
-- PARTE B — base legal (RAG por texto, sin embeddings)
-- ============================================================

-- Registro de documentos de regulación cargados (un registro por .md)
create table if not exists public.documentos_regulacion (
  id             uuid primary key default gen_random_uuid(),
  pais           text not null default 'GT',
  ley            text,
  decreto        text,
  tema           text,   -- 'tributario' | 'mercantil' | 'laboral'
  vigente_desde  date,
  fuente         text,
  archivo_original text,
  created_at     timestamptz default now()
);

-- Fragmentos (chunks) de artículos por ley
create table if not exists public.chunks_regulacion (
  id              uuid primary key default gen_random_uuid(),
  documento_id    uuid references public.documentos_regulacion(id) on delete cascade,
  pais            text not null default 'GT',
  titulo          text,   -- "Artículo 123. Título del artículo"
  texto           text not null,
  tema            text,   -- mismo tema que el documento padre
  aplica_a        text,   -- hint opcional para el modelo
  resumen_busqueda text,  -- descripción corta (opcional, para enriquecer búsqueda)
  montos_mencionados jsonb,
  -- Columna generada para búsqueda full-text en español (sin costo de Voyage):
  texto_busqueda  tsvector generated always as (
    to_tsvector('spanish', coalesce(titulo, '') || ' ' || texto)
  ) stored,
  created_at      timestamptz default now()
);

-- Índice GIN para full-text search
create index if not exists chunks_regulacion_texto_idx
  on public.chunks_regulacion using gin (texto_busqueda);

-- Índices auxiliares
create index if not exists chunks_regulacion_pais_tema_idx
  on public.chunks_regulacion (pais, tema);

-- RLS: solo el service role puede insertar/leer (los scripts de carga usan
-- SUPABASE_SERVICE_ROLE_KEY; el endpoint de generarDocumento también).
alter table public.documentos_regulacion enable row level security;
alter table public.chunks_regulacion enable row level security;

-- Política de lectura pública (los chunks legales no son datos personales)
-- drop-if-exists antes de create para que la migración sea re-ejecutable sin error
-- (create policy no soporta "if not exists").
drop policy if exists "chunks_read_all" on public.chunks_regulacion;
create policy "chunks_read_all" on public.chunks_regulacion
  for select using (true);

drop policy if exists "docs_read_all" on public.documentos_regulacion;
create policy "docs_read_all" on public.documentos_regulacion
  for select using (true);

-- ============================================================
-- Función RPC — búsqueda por texto (gratis, sin Voyage)
-- ============================================================

create or replace function public.buscar_chunks_texto(
  consulta      text,
  pais_filtro   text    default 'GT',
  tema_filtro   text    default null,
  match_count   int     default 8
)
returns table (
  id        uuid,
  titulo    text,
  texto     text,
  tema      text,
  relevancia float
)
language sql stable
as $$
  select
    id,
    titulo,
    texto,
    tema,
    ts_rank(texto_busqueda, websearch_to_tsquery('spanish', consulta)) as relevancia
  from public.chunks_regulacion
  where pais = pais_filtro
    and (tema_filtro is null or tema = tema_filtro)
    and texto_busqueda @@ websearch_to_tsquery('spanish', consulta)
  order by relevancia desc
  limit match_count;
$$;

-- ============================================================
-- Función RPC — búsqueda vectorial (activar cuando haya presupuesto para Voyage)
-- Descomentada aquí como placeholder; requiere: create extension vector;
-- y columna embedding vector(1024) en chunks_regulacion.
-- ============================================================
-- create or replace function public.buscar_chunks_relevantes(
--   query_embedding vector(1024),
--   pais_filtro text default 'GT',
--   match_count int default 8
-- )
-- returns table (id uuid, titulo text, texto text, tema text, similarity float)
-- language sql stable
-- as $$
--   select id, titulo, texto, tema,
--     1 - (embedding <=> query_embedding) as similarity
--   from public.chunks_regulacion
--   where pais = pais_filtro
--   order by embedding <=> query_embedding
--   limit match_count;
-- $$;
