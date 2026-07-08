"""
Convierte un PDF de un código/ley de Guatemala al formato .md
(front-matter + '## ARTICULO N...') que espera el pipeline de ingesta
(segmentar.ts / ingest_regulaciones.py) que ya armamos para AlbaIA.

Uso:
    python3 pdf_a_md_regulacion.py entrada.pdf salida.md \
        --ley "Codigo de Trabajo" --decreto "1441" --tema "laboral"

Requiere: pdftotext (poppler-utils, ya viene instalado en este entorno)
"""

import argparse
import re
import subprocess
from collections import Counter


def extraer_texto(pdf_path: str) -> str:
    resultado = subprocess.run(
        ["pdftotext", "-layout", pdf_path, "-"],
        capture_output=True, text=True, check=True
    )
    return resultado.stdout


def quitar_encabezados_repetidos(texto: str, umbral: float = 0.5) -> str:
    """
    Elimina líneas que se repiten en un porcentaje alto de "apariciones"
    (encabezados/pies de página tipo 'OFICINA NACIONAL DE SERVICIO CIVIL'
    o 'El documento fue generado para el uso exclusivo de...').
    """
    lineas = texto.split("\n")
    conteo = Counter(l.strip() for l in lineas if l.strip())
    total_paginas_aprox = texto.count("\x0c") + 1  # form feed = salto de página
    umbral_repeticiones = max(3, total_paginas_aprox * umbral)

    lineas_a_quitar = {
        l for l, n in conteo.items()
        if n >= umbral_repeticiones and len(l) > 3
    }

    limpio = [l for l in lineas if l.strip() not in lineas_a_quitar]
    return "\n".join(limpio)


def segmentar_articulos(texto: str) -> list[dict]:
    """
    Divide el texto en artículos usando el patrón 'ARTICULO N' / 'ARTÍCULO N'
    (con o sin tilde, mayúsculas o minúsculas) al inicio de línea.
    """
    patron = re.compile(r"(?im)^\s*(art[íi]culo\s+\d+[\.\-]?.*)$")

    posiciones = [m.start() for m in patron.finditer(texto)]
    titulos = [m.group(1).strip() for m in patron.finditer(texto)]

    if not posiciones:
        return []

    articulos = []
    for i, pos in enumerate(posiciones):
        fin = posiciones[i + 1] if i + 1 < len(posiciones) else len(texto)
        bloque = texto[pos:fin].strip()
        # Colapsar múltiples líneas en blanco/espacios de más
        bloque = re.sub(r"\n{3,}", "\n\n", bloque)
        bloque = re.sub(r"[ \t]{2,}", " ", bloque)
        articulos.append({"titulo": titulos[i], "texto": bloque})

    return articulos


def construir_markdown(articulos: list[dict], metadata: dict) -> str:
    front_matter_lineas = ["---"]
    for k, v in metadata.items():
        front_matter_lineas.append(f'{k}: "{v}"')
    front_matter_lineas.append("---\n")

    cuerpo = []
    for art in articulos:
        # Aseguramos que cada artículo quede como header '## '
        primera_linea, _, resto = art["texto"].partition("\n")
        cuerpo.append(f"## {primera_linea.strip()}\n\n{resto.strip()}\n")

    return "\n".join(front_matter_lineas) + "\n".join(cuerpo)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_entrada")
    parser.add_argument("md_salida")
    parser.add_argument("--ley", required=True)
    parser.add_argument("--decreto", required=True)
    parser.add_argument("--tema", required=True)
    parser.add_argument("--vigente_desde", default="")
    parser.add_argument("--fuente", default="")
    args = parser.parse_args()

    texto = extraer_texto(args.pdf_entrada)
    texto = quitar_encabezados_repetidos(texto)
    articulos = segmentar_articulos(texto)

    print(f"Artículos detectados: {len(articulos)}")

    metadata = {
        "ley": args.ley,
        "decreto": args.decreto,
        "tema": args.tema,
        "vigente_desde": args.vigente_desde,
        "fuente": args.fuente,
    }

    markdown = construir_markdown(articulos, metadata)

    with open(args.md_salida, "w", encoding="utf-8") as f:
        f.write(markdown)

    print(f"Guardado en {args.md_salida}")


if __name__ == "__main__":
    main()
