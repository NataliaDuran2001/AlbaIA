// scripts/pdf-a-md-regulacion.ts
//
// Convierte un PDF de un código/ley de Guatemala al formato .md
// (front-matter + '## ARTICULO N...') que espera el pipeline de ingesta
// (segmentar.ts) que ya armamos para AlbaIA.
//
// npm install pdf-parse
//
// Uso:
//   npx tsx scripts/pdf-a-md-regulacion.ts entrada.pdf salida.md \
//     --ley "Codigo de Trabajo" --decreto "1441" --tema "laboral"

import fs from "fs";
import pdfParse from "pdf-parse";

interface Metadata {
  ley: string;
  decreto: string;
  tema: string;
  vigente_desde?: string;
  fuente?: string;
}

interface Articulo {
  titulo: string;
  texto: string;
}

async function extraerTexto(pdfPath: string): Promise<string> {
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);
  // pdf-parse a veces deja caracteres de control invisibles (saltos de forma,
  // bytes de control de fuentes, etc.) que ensucian el markdown resultante.
  return data.text.replace(/[\x00-\x08\x0B\x0E-\x1F]/g, "").replace(/\r/g, "");
}

/**
 * Elimina líneas que se repiten en un porcentaje alto de "apariciones"
 * (encabezados/pies de página tipo 'OFICINA NACIONAL DE SERVICIO CIVIL'
 * o 'El documento fue generado para el uso exclusivo de...').
 */
function quitarEncabezadosRepetidos(texto: string, umbral = 0.5): string {
  const lineas = texto.split("\n");
  const conteo = new Map<string, number>();

  for (const linea of lineas) {
    const key = linea.trim();
    if (!key) continue;
    conteo.set(key, (conteo.get(key) ?? 0) + 1);
  }

  // \f = salto de página (form feed) que suele dejar pdf-parse entre páginas
  const totalPaginasAprox = (texto.match(/\f/g)?.length ?? 0) + 1;
  const umbralRepeticiones = Math.max(3, totalPaginasAprox * umbral);

  const lineasAQuitar = new Set(
    [...conteo.entries()]
      .filter(([linea, n]) => n >= umbralRepeticiones && linea.length > 3)
      .map(([linea]) => linea)
  );

  return lineas.filter((l) => !lineasAQuitar.has(l.trim())).join("\n");
}

/**
 * Divide el texto en artículos usando el patrón 'ARTICULO N' / 'ARTÍCULO N'
 * (con o sin tilde, mayúsculas o minúsculas) al inicio de línea.
 */
function segmentarArticulos(texto: string): Articulo[] {
  const patron = /^\s*(art[íi]culo\s+\d+[.\-]?.*)$/gim;

  const posiciones: number[] = [];
  const titulos: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = patron.exec(texto)) !== null) {
    posiciones.push(match.index);
    titulos.push(match[1].trim());
  }

  if (posiciones.length === 0) return [];

  const articulos: Articulo[] = [];
  for (let i = 0; i < posiciones.length; i++) {
    const fin = i + 1 < posiciones.length ? posiciones[i + 1] : texto.length;
    let bloque = texto.slice(posiciones[i], fin).trim();
    bloque = bloque.replace(/\n{3,}/g, "\n\n");
    bloque = bloque.replace(/[ \t]{2,}/g, " ");
    articulos.push({ titulo: titulos[i], texto: bloque });
  }

  return articulos;
}

function construirMarkdown(articulos: Articulo[], metadata: Metadata): string {
  const frontMatter = ["---"];
  for (const [k, v] of Object.entries(metadata)) {
    if (v) frontMatter.push(`${k}: "${v}"`);
  }
  frontMatter.push("---\n");

  const cuerpo = articulos.map((art) => {
    const [primeraLinea, ...resto] = art.texto.split("\n");
    return `## ${primeraLinea.trim()}\n\n${resto.join("\n").trim()}\n`;
  });

  return frontMatter.join("\n") + "\n" + cuerpo.join("\n");
}

function parseArgs(argv: string[]) {
  const [pdfEntrada, mdSalida, ...rest] = argv;
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) {
    flags[rest[i].replace(/^--/, "")] = rest[i + 1];
  }
  return { pdfEntrada, mdSalida, flags };
}

async function main() {
  const { pdfEntrada, mdSalida, flags } = parseArgs(process.argv.slice(2));

  if (!pdfEntrada || !mdSalida || !flags.ley || !flags.decreto || !flags.tema) {
    console.error(
      "Uso: pdf-a-md-regulacion.ts entrada.pdf salida.md --ley '...' --decreto '...' --tema '...' [--vigente_desde '...'] [--fuente '...']"
    );
    process.exit(1);
  }

  let texto = await extraerTexto(pdfEntrada);
  texto = quitarEncabezadosRepetidos(texto);
  const articulos = segmentarArticulos(texto);

  console.log(`Artículos detectados: ${articulos.length}`);

  const markdown = construirMarkdown(articulos, {
    ley: flags.ley,
    decreto: flags.decreto,
    tema: flags.tema,
    vigente_desde: flags.vigente_desde,
    fuente: flags.fuente,
  });

  fs.writeFileSync(mdSalida, markdown, "utf-8");
  console.log(`Guardado en ${mdSalida}`);
}

main();
