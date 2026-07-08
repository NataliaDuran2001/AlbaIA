// lib/fases/generarDocumento.ts
//
// Fase 2 — Generación de documentos legales pre-llenados.
//
// Estrategia de búsqueda de base legal (sin Voyage/embeddings — costo $0):
//   1. Para Sociedad de Emprendimiento → template hardcodeado (no necesita DB).
//   2. Para los demás → buscar_chunks_texto en Supabase (full-text en español).
//      Si no hay chunks, devuelve estado "tipo_no_soportado" con mensaje útil.
//
// El modelo rellena el documento con los datos del perfil y marca con
// [PENDIENTE: descripción] los campos que faltan. El usuario ve el formulario
// llenado + lista de pendientes, y completa lo que falta él mismo.
//
// Usa el cliente de IA provider-agnóstico (lib/ai/openrouter.ts) — el mismo
// que usa el chatbot y el análisis de roadmap. NO usa @anthropic-ai/sdk.

import "server-only"
import { createClient } from "@supabase/supabase-js"
import { chatCompletion, available as aiAvailable } from "@/lib/ai/openrouter"
import { buscarDocumento } from "@/lib/catalogo-documentos"
import type { PerfilNegocio } from "@/lib/types/perfil-negocio"

// ── Cliente Supabase (service role para leer chunks) ─────────────────────────

let _supabase: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _supabase
}

// ── Tipos de salida ──────────────────────────────────────────────────────────

export interface ArticuloCitado {
  titulo: string
  relevancia: number
}

/** Fila devuelta por el RPC `buscar_chunks_texto` (full-text en Supabase). */
interface ChunkRegulacion {
  titulo: string
  texto: string
  relevancia: number
}

export interface ResultadoDocumento {
  estado: "generado" | "faltan_datos" | "tipo_no_soportado"
  documento?: string
  articulos_citados?: ArticuloCitado[]
  campos_faltantes?: string[]
  mensaje?: string
}

// ── Plantilla hardcodeada para Sociedad de Emprendimiento ────────────────────
// (Decreto 20-2018 — no está cargado en chunks_regulacion aún.)
// Genera un resumen de lo que hay que llevar a minegocio.gt, pre-llenando
// todos los datos que ya conocemos del perfil.

function generarPlantillaSE(perfil: PerfilNegocio, datosAdicionales?: Record<string, unknown>): ResultadoDocumento {
  const datos = { ...perfil, ...datosAdicionales }
  const faltantes: string[] = []

  function campo(valor: string | undefined | null, etiqueta: string): string {
    if (valor && valor.trim()) return valor.trim()
    faltantes.push(etiqueta)
    return `[PENDIENTE: ${etiqueta}]`
  }

  const nombre   = campo(datos.nombre_titular,    "nombre completo del/los socio(s)")
  const dpi      = campo(datos.dpi_numero,         "número de DPI (13 dígitos)")
  const correo   = campo(datos.correo,             "correo electrónico que revise frecuentemente")
  const dir      = campo(datos.direccion_negocio,  "dirección exacta del negocio (calle, núm., zona, municipio, depto.)")
  const nombreEmp= campo(datos.nombre_comercial,   "denominación/nombre de la empresa (verificar disponibilidad en registromercantil.gob.gt)")
  const objeto   = datos.objeto_social?.trim()
    ? datos.objeto_social.trim()
    : `comercio y prestación de servicios relacionados con ${datos.industry ?? "el giro del negocio"} en Guatemala`
  const ciudad   = datos.city ?? "Guatemala"

  // Régimen tributario recomendado
  const rango = datos.ingresos_mensuales_rango
  let regimen = "Pequeño Contribuyente (5% mensual sobre ventas brutas — el más sencillo para empezar)"
  let regimenNota = "Nota: el límite anual del Pequeño Contribuyente es Q500,285 (Decreto 31-2024). Si proyectas superar eso, consulta el Régimen Opcional Simplificado."
  if (rango === "high" || rango === "very_high") {
    regimen = "Régimen Opcional Simplificado sobre Ingresos (5% primeros Q30K/mes, 7% el resto + IVA 12%)"
    regimenNota = "Con ingresos proyectados altos puedes superar el límite del Pequeño Contribuyente. Considera el Régimen Simplificado desde el inicio."
  }

  const socios = datos.numero_socios ?? 1
  const socioTexto = socios > 1
    ? `\nSi hay más socios, adjunta los datos de cada uno (nombre, DPI y recibo de servicios).`
    : ""

  const documento = `SOCIEDAD DE EMPRENDIMIENTO — GUÍA DE SOLICITUD (minegocio.gt)
Base legal: Decreto 20-2018 del Congreso de la República de Guatemala
Preparado por AlbaIA · ${new Date().toLocaleDateString("es-GT", { year: "numeric", month: "long", day: "numeric" })}
AVISO: Este documento es una guía informativa. No reemplaza la revisión legal de un abogado.

═══════════════════════════════════════════════════════
DATOS DEL SOCIO / REPRESENTANTE LEGAL
═══════════════════════════════════════════════════════

Nombre completo   : ${nombre}
Número de DPI     : ${dpi}
Correo electrónico: ${correo}
Dirección del negocio: ${dir}${socioTexto}

═══════════════════════════════════════════════════════
DATOS DE LA EMPRESA
═══════════════════════════════════════════════════════

Denominación (nombre): ${nombreEmp}
Ciudad de operaciones : ${ciudad}
Objeto social         : ${objeto}
Número de socios      : ${socios}

═══════════════════════════════════════════════════════
RÉGIMEN TRIBUTARIO RECOMENDADO
═══════════════════════════════════════════════════════

${regimen}
${regimenNota}

Nota: el régimen se elige al inscribir la empresa en la SAT (paso posterior
a la inscripción en minegocio.gt). La Factura Electrónica (FEL) es obligatoria
para todos — se activa gratis en la Agencia Virtual de la SAT.

═══════════════════════════════════════════════════════
DOCUMENTOS QUE DEBES ADJUNTAR EN minegocio.gt
═══════════════════════════════════════════════════════

  ☐  DPI de cada socio — ambos lados, escaneado en JPG, PDF o PNG
  ☐  Recibo de servicios (agua, luz o teléfono) de los últimos 3 meses
     que compruebe la dirección del negocio

═══════════════════════════════════════════════════════
PASOS EN minegocio.gt (en orden)
═══════════════════════════════════════════════════════

1. Ir a https://minegocio.gt y crear una cuenta personal.
2. Pedir la certificación del nombre (denominación) en el Registro Mercantil
   → verificar que "${nombreEmp}" esté disponible en registromercantil.gob.gt
3. En minegocio.gt, iniciar la solicitud de "Sociedad de Emprendimiento".
   El sistema genera el contrato social automáticamente.
4. Adjuntar los documentos indicados arriba.
5. Pagar los aranceles en línea (cientos de Q, sin honorarios de notario).
6. Esperar inscripción y patente electrónica (días a 2 semanas).
7. Inscribir la empresa en la SAT → obtener NIT propio → activar FEL → elegir régimen.

Costo total aproximado: cientos de Q (sin notario).
Tiempo estimado: días a 2 semanas.

═══════════════════════════════════════════════════════
CONSIDERACIONES IMPORTANTES
═══════════════════════════════════════════════════════

• Límite de ingresos anuales: aprox. Q5,000,000. Si superas ese tope
  deberás transformarte en otra figura (ej. S.A.).
• Tu responsabilidad se limita a lo aportado — tu patrimonio personal
  queda protegido (a diferencia del Comerciante Individual).
• Todo se gestiona electrónicamente: Agencia Virtual, FEL y Declaraguate.
`

  return {
    estado: faltantes.length > 0 ? "faltan_datos" : "generado",
    documento,
    campos_faltantes: faltantes.length > 0 ? faltantes : undefined,
  }
}

// ── Generación con RAG (texto) + IA para el resto de documentos ──────────────

const PROMPT_SISTEMA = `Eres un asistente legal de AlbaIA que ayuda a redactar borradores de documentos para formalizar negocios en Guatemala.

Reglas estrictas:
1. Usa SOLO los artículos de la base legal proporcionada — nunca inventes artículos o requisitos que no estén ahí.
2. Si faltan datos del negocio necesarios para completar el documento, NO los inventes: márcalos como [PENDIENTE: descripción clara de qué se necesita].
3. Cita el número de artículo cuando corresponda (ej. "según el Artículo 23 del Código de Comercio...").
4. Este es un borrador informativo; siempre incluye al final: "AVISO: Este documento es un borrador generado por AlbaIA. Debe ser revisado por un abogado o contador antes de presentarse oficialmente."
5. Responde ÚNICAMENTE con el JSON indicado, sin prosa adicional.`

async function generarConRAG(
  perfil: PerfilNegocio,
  tipoDocumento: string,
  nombreDoc: string,
  tema: string,
  datosAdicionales?: Record<string, unknown>,
): Promise<ResultadoDocumento> {
  // 1. Búsqueda de base legal por texto en Supabase
  const consulta = `${nombreDoc} para ${(perfil.numero_socios ?? 1) === 1 ? "comerciante individual" : "sociedad"} en Guatemala`

  // El cliente es untyped (no hay tipos generados de Supabase en el repo), así
  // que .rpc() no conoce las funciones RPC — casteamos los args para el RPC
  // full-text `buscar_chunks_texto` definido en la base de datos.
  const rpcArgs = {
    consulta,
    pais_filtro: perfil.pais ?? "GT",
    tema_filtro: tema,
    match_count: 8,
  }
  const { data, error } = await getSupabase().rpc(
    "buscar_chunks_texto",
    rpcArgs as never,
  )
  const chunks = data as ChunkRegulacion[] | null

  if (error) {
    return {
      estado: "tipo_no_soportado",
      mensaje: `Error consultando la base legal: ${error.message}. ¿Está cargado el código "${tema}" en Supabase?`,
    }
  }

  if (!chunks || chunks.length === 0) {
    return {
      estado: "tipo_no_soportado",
      mensaje: `No se encontraron artículos relevantes para "${nombreDoc}". Ejecuta el script de carga: npx tsx scripts/carga-rapida-regulacion.ts IA/${tema === "mercantil" ? "Codigo_de_Comercio_GT.md" : tema === "tributario" ? "Codigo_Tributario_GT.md" : "Codigo_de_Trabajo_GT.md"} ${tema}`,
    }
  }

  // 2. Construir contexto legal
  const contextoLegal = chunks
    .map((c) => `${c.titulo}\n${c.texto}`)
    .join("\n\n---\n\n")

  // 3. Llamada al modelo
  const perfilTexto = JSON.stringify({ ...perfil, ...datosAdicionales }, null, 2)
  const userPrompt = `Documento a redactar: "${nombreDoc}"

Datos del negocio (algunos pueden estar incompletos):
${perfilTexto}

Base legal encontrada (Guatemala, tema: ${tema}):
${contextoLegal}

Responde ÚNICAMENTE con este JSON (sin texto adicional):
{
  "documento": "texto completo del borrador con [PENDIENTE: descripción] donde falte info",
  "campos_faltantes": ["lista de datos que el usuario todavía debe proporcionar"]
}`

  let raw: string
  try {
    raw = await chatCompletion(
      [
        { role: "system", content: PROMPT_SISTEMA },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 3000, temperature: 0.1, json: true },
    )
  } catch (err) {
    return {
      estado: "tipo_no_soportado",
      mensaje: `Error al llamar al modelo de IA: ${err instanceof Error ? err.message : "desconocido"}`,
    }
  }

  // 4. Parsear respuesta JSON
  let resultado: { documento: string; campos_faltantes: string[] }
  try {
    const limpio = raw.replace(/```json|```/g, "").trim()
    const jsonStart = limpio.indexOf("{")
    const jsonEnd = limpio.lastIndexOf("}")
    resultado = JSON.parse(limpio.slice(jsonStart, jsonEnd + 1))
  } catch {
    return { estado: "tipo_no_soportado", mensaje: "El modelo no devolvió JSON válido." }
  }

  const articulos_citados: ArticuloCitado[] = chunks.map((c) => ({
    titulo: c.titulo,
    relevancia: c.relevancia,
  }))

  return {
    estado: resultado.campos_faltantes?.length > 0 ? "faltan_datos" : "generado",
    documento: resultado.documento,
    articulos_citados,
    campos_faltantes: resultado.campos_faltantes?.length > 0 ? resultado.campos_faltantes : undefined,
  }
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Genera un documento legal pre-llenado para un negocio guatemalteco.
 *
 * @param perfil         - Datos del perfil (Fase 1 + datos adicionales Fase 2)
 * @param tipoDocumento  - Clave del catálogo (ej. "solicitud_sociedad_emprendimiento")
 * @param datosAdicionales - Campos extra que el usuario proveyó al iniciar Fase 2
 * @returns ResultadoDocumento con el borrador y los campos pendientes
 */
export async function generarDocumento(
  perfil: PerfilNegocio,
  tipoDocumento: string,
  datosAdicionales?: Record<string, unknown>,
): Promise<ResultadoDocumento> {
  const doc = buscarDocumento(tipoDocumento)

  if (!doc) {
    return {
      estado: "tipo_no_soportado",
      mensaje: `"${tipoDocumento}" no existe en el catálogo de documentos.`,
    }
  }

  if (doc.estado === "pendiente_regulacion") {
    return {
      estado: "tipo_no_soportado",
      mensaje: doc.nota ?? `Todavía no tenemos la regulación cargada para "${doc.nombre}".`,
    }
  }

  // Sociedad de Emprendimiento: template hardcodeado (sin RAG ni IA)
  if (tipoDocumento === "solicitud_sociedad_emprendimiento") {
    return generarPlantillaSE(perfil, datosAdicionales)
  }

  // Sin tema definido (no debería llegar aquí si estado="documentado", pero por seguridad)
  if (!doc.tema) {
    return {
      estado: "tipo_no_soportado",
      mensaje: `El documento "${doc.nombre}" no tiene base legal configurada.`,
    }
  }

  // Sin clave de IA → no se puede generar con RAG
  if (!aiAvailable()) {
    return {
      estado: "tipo_no_soportado",
      mensaje: "La IA no está configurada (falta AI_API_KEY). Configura la variable y reinicia el servidor.",
    }
  }

  return generarConRAG(perfil, tipoDocumento, doc.nombre, doc.tema, datosAdicionales)
}
