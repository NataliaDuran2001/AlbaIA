// lib/catalogo-documentos.ts
//
// Catálogo de documentos que puede generar la Fase 2.
//
// "tema" → qué conjunto de chunks_regulacion buscar en Supabase.
//   null → documento especial sin RAG (template hardcodeado en generarDocumento.ts)
//
// "estado":
//   "documentado"          → se puede intentar generar (tiene base legal o template)
//   "pendiente_regulacion" → falta cargar la ley correspondiente a Supabase

import type { PerfilNegocio } from "@/lib/types/perfil-negocio"

export interface DocumentoCatalogo {
  nombre: string
  tema: "laboral" | "mercantil" | "tributario" | null
  estado: "documentado" | "pendiente_regulacion"
  nota?: string
}

export const DOCUMENTOS_SOPORTADOS: Record<string, DocumentoCatalogo> = {
  // ── Sociedad de Emprendimiento (Decreto 20-2018) ──────────────────────────
  // Template hardcodeado en generarDocumento.ts (sin RAG — el Decreto no está
  // en chunks aún, pero la guía es suficiente para pre-llenar el formulario).
  solicitud_sociedad_emprendimiento: {
    nombre: "Solicitud de Sociedad de Emprendimiento (minegocio.gt)",
    tema: null,
    estado: "documentado",
  },

  // ── Mercantil ─────────────────────────────────────────────────────────────
  inscripcion_comerciante_individual: {
    nombre: "Inscripción como comerciante individual",
    tema: "mercantil",
    estado: "documentado",
  },
  escritura_constitucion_srl: {
    nombre: "Escritura de constitución de S.R.L.",
    tema: "mercantil",
    estado: "documentado",
  },
  escritura_constitucion_sa: {
    nombre: "Escritura de constitución de S.A.",
    tema: "mercantil",
    estado: "documentado",
  },
  habilitacion_libros_contables: {
    nombre: "Solicitud de habilitación de libros contables y mercantiles",
    tema: "mercantil",
    estado: "documentado",
  },

  // ── Tributario ────────────────────────────────────────────────────────────
  inscripcion_rtu_sat: {
    nombre: "Inscripción / actualización del RTU ante SAT",
    tema: "tributario",
    estado: "documentado",
  },

  // ── Laboral ───────────────────────────────────────────────────────────────
  contrato_trabajo: {
    nombre: "Contrato individual de trabajo",
    tema: "laboral",
    estado: "documentado",
  },

  // ── Pendientes (ley no cargada aún) ───────────────────────────────────────
  permiso_bebidas_alcoholicas: {
    nombre: "Permiso para venta de bebidas alcohólicas",
    tema: null,
    estado: "pendiente_regulacion",
    nota: "Requiere cargar el Reglamento de bebidas alcohólicas (Acdo. Gub. 536-2001).",
  },
}

/** Busca un documento en el catálogo. Devuelve null si no existe. */
export function buscarDocumento(tipoDocumento: string): DocumentoCatalogo | null {
  return DOCUMENTOS_SOPORTADOS[tipoDocumento] ?? null
}

// ── Mapa: figura legal → documentos aplicables ────────────────────────────

const DOCS_POR_FIGURA: Record<string, string[]> = {
  comerciante_individual: [
    "inscripcion_comerciante_individual",
    "inscripcion_rtu_sat",
  ],
  sociedad_emprendimiento: [
    "solicitud_sociedad_emprendimiento",
    "inscripcion_rtu_sat",
  ],
  srl: [
    "escritura_constitucion_srl",
    "inscripcion_rtu_sat",
    "habilitacion_libros_contables",
  ],
  sa: [
    "escritura_constitucion_sa",
    "inscripcion_rtu_sat",
    "habilitacion_libros_contables",
  ],
}

/**
 * Devuelve la lista de tipos de documento aplicables según la figura legal y
 * características del perfil (empleados, venta de alcohol).
 */
export function documentosParaFigura(
  figuraLegal: string,
  perfil: Pick<PerfilNegocio, "tendra_empleados" | "vende_alcohol">,
): string[] {
  const base = DOCS_POR_FIGURA[figuraLegal] ?? []
  const extra: string[] = []

  if (perfil.tendra_empleados) extra.push("contrato_trabajo")
  if (perfil.vende_alcohol) extra.push("permiso_bebidas_alcoholicas")

  return [...base, ...extra]
}
