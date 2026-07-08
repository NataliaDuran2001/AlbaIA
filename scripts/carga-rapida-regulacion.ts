// scripts/carga-rapida-regulacion.ts
//
// Carga un .md de regulación (ya segmentado por artículos) directo a
// Supabase SIN llamar a Claude ni a Voyage — costo $0, cero APIs externas.
//
// Necesita:
//   NEXT_PUBLIC_SUPABASE_URL      (de .env.local)
//   SUPABASE_SERVICE_ROLE_KEY     (de .env.local)
//
// Uso (desde la raíz del proyecto):
//
//   npx tsx --env-file=.env.local scripts/carga-rapida-regulacion.ts \
//     IA/Codigo_Tributario_GT.md tributario
//
//   npx tsx --env-file=.env.local scripts/carga-rapida-regulacion.ts \
//     IA/Codigo_de_Trabajo_GT.md laboral
//
//   npx tsx --env-file=.env.local scripts/carga-rapida-regulacion.ts \
//     IA/Codigo_de_Comercio_GT.md mercantil
//
// Si la versión de tsx no soporta --env-file, exporta las vars primero:
//   export $(cat .env.local | grep -v '#' | xargs) && npx tsx scripts/...

import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import { leerMarkdown, segmentarPorArticulo } from "../lib/segmentar"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const TAMANO_LOTE = 200

async function main() {
  const [rutaMdRel, tema] = process.argv.slice(2)

  if (!rutaMdRel || !tema) {
    console.error("Uso: carga-rapida-regulacion.ts <archivo.md> <tema>")
    console.error("  tema puede ser: tributario | laboral | mercantil")
    console.error("  Ejemplo: npx tsx scripts/carga-rapida-regulacion.ts IA/Codigo_Tributario_GT.md tributario")
    process.exit(1)
  }

  if (!["tributario", "laboral", "mercantil"].includes(tema)) {
    console.error(`Tema inválido: "${tema}". Debe ser tributario | laboral | mercantil.`)
    process.exit(1)
  }

  const rutaMd = path.resolve(rutaMdRel)
  if (!fs.existsSync(rutaMd)) {
    console.error(`Archivo no encontrado: ${rutaMd}`)
    process.exit(1)
  }

  const contenido = fs.readFileSync(rutaMd, "utf-8")
  const { metadata, cuerpo } = leerMarkdown(contenido)
  const chunks = segmentarPorArticulo(cuerpo)

  console.log(`\n📖 ${metadata.ley ?? path.basename(rutaMd)}`)
  console.log(`   Decreto: ${metadata.decreto ?? "(sin decreto)"}`)
  console.log(`   Tema: ${tema}`)
  console.log(`   Artículos encontrados: ${chunks.length}`)

  if (chunks.length === 0) {
    console.error("No se encontraron artículos. Verifica el formato del archivo (esperado: ## Artículo N...).")
    process.exit(1)
  }

  // Insertar registro de documento
  const { data: doc, error: errorDoc } = await supabase
    .from("documentos_regulacion")
    .insert({
      pais: "GT",
      ley: metadata.ley,
      decreto: metadata.decreto,
      tema,
      fuente: metadata.fuente,
      archivo_original: rutaMdRel,
    })
    .select()
    .single()

  if (errorDoc || !doc) {
    console.error("Error creando registro de documento:", errorDoc?.message)
    process.exit(1)
  }

  console.log(`\n✓ Documento registrado: ${doc.id}`)
  console.log("Cargando artículos en lotes de", TAMANO_LOTE, "...\n")

  // Insertar chunks en lotes
  let total = 0
  for (let i = 0; i < chunks.length; i += TAMANO_LOTE) {
    const lote = chunks.slice(i, i + TAMANO_LOTE).map((chunk) => ({
      documento_id: doc.id,
      pais: "GT",
      titulo: chunk.titulo,
      texto: chunk.texto,
      tema,
    }))

    const { error } = await supabase.from("chunks_regulacion").insert(lote)
    if (error) {
      console.error(`Error insertando lote ${i / TAMANO_LOTE + 1}:`, error.message)
      process.exit(1)
    }

    total = Math.min(i + TAMANO_LOTE, chunks.length)
    process.stdout.write(`\r  ${total} / ${chunks.length} artículos cargados`)
  }

  console.log(`\n\n✓ Listo. ${total} artículos cargados en chunks_regulacion.`)
  console.log("  Ya puedes generar documentos legales con lib/fases/generarDocumento.ts.\n")
}

main().catch((err) => {
  console.error("Error inesperado:", err)
  process.exit(1)
})
