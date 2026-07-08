// app/api/negocio/route.ts
//
// Endpoint unificado para Fase 1 (análisis) y Fase 2 (generación de documentos).
// El campo "accion" en el body determina qué handler se ejecuta.
//
// POST /api/negocio
//   { accion: "generar_documento", perfil, tipo_documento, datos_adicionales? }
//
// Nota: el análisis de Fase 1 (roadmap) ocurre vía server actions en
// lib/actions/funnel.ts (buildRoadmapStep), no por este endpoint. Este
// endpoint existe específicamente para la generación de documentos de Fase 2
// y está diseñado para llamarse desde componentes cliente.

import { NextRequest, NextResponse } from "next/server"
import { generarDocumento } from "@/lib/fases/generarDocumento"
import type { PerfilNegocio } from "@/lib/types/perfil-negocio"

interface BodyGenerarDocumento {
  accion: "generar_documento"
  perfil: PerfilNegocio
  tipo_documento: string
  datos_adicionales?: Record<string, unknown>
}

type Body = BodyGenerarDocumento

export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ estado: "error", mensaje: "Body inválido (no es JSON)." }, { status: 400 })
  }

  try {
    switch (body.accion) {
      case "generar_documento": {
        if (!body.perfil || !body.tipo_documento) {
          return NextResponse.json(
            { estado: "error", mensaje: 'Se requieren "perfil" y "tipo_documento".' },
            { status: 400 },
          )
        }
        const resultado = await generarDocumento(body.perfil, body.tipo_documento, body.datos_adicionales)
        return NextResponse.json(resultado)
      }

      default: {
        return NextResponse.json({ estado: "error", mensaje: "Acción no reconocida." }, { status: 400 })
      }
    }
  } catch (err) {
    console.error("[/api/negocio] Error inesperado:", err)
    return NextResponse.json({ estado: "error", mensaje: "Error interno del servidor." }, { status: 500 })
  }
}
