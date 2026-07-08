// lib/segmentar.ts
//
// Parsea archivos Markdown de regulación guatemalteca (Código Tributario,
// Código de Comercio, Código de Trabajo, etc.) en chunks por artículo.
//
// Formato esperado de los .md:
//   --- (front matter YAML)
//   ley: "Código Tributario"
//   decreto: "6-91"
//   tema: "tributario"
//   vigente_desde: ""
//   fuente: "Congreso de la República de Guatemala"
//   ---
//   ## Artículo 1. Título del artículo...
//   Cuerpo del artículo...
//
//   ## Artículo 2. Otro título...
//   Cuerpo...

export interface Metadata {
  ley?: string
  decreto?: string
  tema?: string
  vigente_desde?: string
  fuente?: string
  [key: string]: string | undefined
}

export interface Chunk {
  titulo: string   // "Artículo N. Título..."
  texto: string    // cuerpo completo del artículo
}

/**
 * Separa el front matter YAML del cuerpo Markdown.
 * Devuelve metadata (key-value simple) y el cuerpo sin los delimitadores ---.
 */
export function leerMarkdown(contenido: string): { metadata: Metadata; cuerpo: string } {
  const lineas = contenido.split("\n")
  if (lineas[0].trim() !== "---") {
    return { metadata: {}, cuerpo: contenido }
  }

  const cierreIdx = lineas.indexOf("---", 1)
  if (cierreIdx === -1) {
    return { metadata: {}, cuerpo: contenido }
  }

  const metadata: Metadata = {}
  for (const linea of lineas.slice(1, cierreIdx)) {
    const colonIdx = linea.indexOf(":")
    if (colonIdx === -1) continue
    const clave = linea.slice(0, colonIdx).trim()
    const valor = linea.slice(colonIdx + 1).trim().replace(/^"|"$/g, "")
    if (clave) metadata[clave] = valor
  }

  const cuerpo = lineas.slice(cierreIdx + 1).join("\n").trimStart()
  return { metadata, cuerpo }
}

/**
 * Divide el cuerpo Markdown en chunks individuales por artículo.
 * El separador es cualquier línea que empiece con "## Artículo " (case-insensitive).
 * Devuelve un array de { titulo, texto } con título = primera línea del chunk.
 */
export function segmentarPorArticulo(cuerpo: string): Chunk[] {
  // Divide por headers de artículo (## Artículo N o ## ARTÍCULO N)
  const partes = cuerpo.split(/(?=^## artículo |^## Artículo |^## ARTÍCULO )/im)

  const chunks: Chunk[] = []
  for (const parte of partes) {
    const trimmed = parte.trim()
    if (!trimmed) continue

    const primeraLinea = trimmed.split("\n")[0].replace(/^##\s*/, "").trim()
    const resto = trimmed.split("\n").slice(1).join("\n").trim()

    // Ignorar secciones sin cuerpo real (solo el título)
    if (!primeraLinea) continue

    chunks.push({
      titulo: primeraLinea,
      texto: resto || primeraLinea,
    })
  }

  return chunks
}
