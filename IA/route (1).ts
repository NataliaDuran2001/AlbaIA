// app/api/negocio/route.ts
//
// Un solo endpoint para todo AlbaIA. El flag "accion" en el body decide
// qué handler se ejecuta. Cada handler vive en lib/fases/ (ver ahí la lógica
// real) - este archivo solo enruta y maneja errores comunes.

import { NextRequest, NextResponse } from "next/server";
import type { SolicitudNegocio } from "@/lib/types/solicitud-negocio";
import { analizarNegocio } from "@/lib/fases/analizarNegocio";
import { generarDocumento } from "@/lib/fases/generarDocumento";

export async function POST(req: NextRequest) {
  const body: SolicitudNegocio = await req.json();

  try {
    switch (body.accion) {
      case "analizar_negocio": {
        const resultado = analizarNegocio(body.perfil);
        return NextResponse.json(resultado);
      }

      case "generar_documento": {
        const resultado = await generarDocumento(
          body.perfil,
          body.tipo_documento,
          body.datos_adicionales
        );
        return NextResponse.json(resultado);
      }

      default: {
        // Si TypeScript se queja aquí, es porque falta manejar una acción
        // nueva que agregaron al tipo SolicitudNegocio - el compilador
        // no deja que se les olvide.
        const _exhaustivo: never = body;
        return NextResponse.json(
          { estado: "error", mensaje: "Acción no reconocida" },
          { status: 400 }
        );
      }
    }
  } catch (err) {
    console.error("Error en /api/negocio:", err);
    return NextResponse.json(
      { estado: "error", mensaje: "Error inesperado" },
      { status: 500 }
    );
  }
}
