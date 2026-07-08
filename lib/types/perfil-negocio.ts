// lib/types/perfil-negocio.ts
//
// Tipo completo del perfil de negocio usado en las dos fases de AlbaIA:
//   Fase 1 — análisis + recomendación de figura/régimen/permisos
//   Fase 2 — generación de documentos pre-llenados
//
// Los campos de la Parte A vienen del formulario inteligente (profile-form).
// Los campos de la Parte B son datos personales/legales adicionales que el
// usuario provee al llegar a la Fase 2 (nombre completo, DPI, dirección, etc.)
// y se usan como placeholders en los documentos generados.
//
// Todos los campos son opcionales en el tipo para poder construir el perfil
// progresivamente a lo largo del flujo. generarDocumento.ts marca como
// [PENDIENTE: ...] cualquier campo requerido que falte.

// ── Parte A: datos del negocio (Fase 1) ─────────────────────────────────────

export type IngresosMensualesRango = "low" | "medium" | "high" | "very_high"

export interface PerfilNegocio {
  // Contexto general
  pais?: string              // ISO — "GT" por defecto
  city?: string              // ciudad / departamento
  industry?: string          // retail | food | services | tech | manufacturing | other
  idea_text?: string         // descripción libre del negocio

  // Estructura societaria
  /** Número mínimo de propietarios/socios. 1 = CI/SE, 2-20 = SRL, 2+ = SA. */
  numero_socios?: number
  /** Los socios son familia o conocidos de confianza → SRL preferida sobre SA. */
  socios_son_familia?: boolean
  /** Quiere emitir acciones o atraer inversionistas externos → SA. */
  busca_inversionistas?: boolean

  // Empleados
  tendra_empleados?: boolean
  /** Número aproximado. ≥3 → IGSS patronal obligatorio (~12.67% sobre salarios). */
  numero_empleados?: number

  // Operación
  /** Venderá bebidas alcohólicas → permiso Ministerio de Gobernación. */
  vende_alcohol?: boolean
  /** Tendrá local físico abierto al público → licencia municipal + rótulo. */
  local_fisico?: boolean
  /** Rango de ingresos mensuales esperados — orienta el régimen tributario. */
  ingresos_mensuales_rango?: IngresosMensualesRango

  // ── Parte B: datos personales/legales para documentos (Fase 2) ───────────

  /** Nombre completo del titular / representante legal. */
  nombre_titular?: string
  /** Número de DPI del titular (13 dígitos). */
  dpi_numero?: string
  /** NIT del titular o de la empresa (si ya lo tiene). */
  nit_numero?: string
  /** Dirección física completa del negocio (calle, número, zona, municipio, depto.). */
  direccion_negocio?: string
  /** Nombre comercial o denominación de la empresa. */
  nombre_comercial?: string
  /** Correo electrónico del titular. */
  correo?: string
  /** Objeto social: descripción legal de las actividades de la empresa. */
  objeto_social?: string
  /** Para SRL / SA: datos de cada socio. */
  socios?: SocioDatos[]
  /** Para SRL / SA: nombre del administrador / representante legal. */
  nombre_representante_legal?: string
  /** Para SRL / SA: capital social total en quetzales. */
  capital_total_q?: number
  /** Número de acciones (solo SA). */
  numero_acciones?: number
}

export interface SocioDatos {
  nombre: string
  dpi: string
  /** Aportación de capital en quetzales. */
  aportacion_q: number
}
