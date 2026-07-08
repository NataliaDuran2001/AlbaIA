// lib/fases/generarDocumento.ts
//
// Esqueleto de la Fase 2. Se completa cuando carguen los documentos/plantillas
// legales reales (ej. la solicitud de Sociedad de Emprendimiento en minegocio.gt).
// La firma queda lista para que el endpoint ya pueda enrutar hacia acá.

import type { PerfilNegocio } from "../types/perfil-negocio";

export interface ResultadoDocumento {
  estado: "generado" | "faltan_datos" | "tipo_no_soportado";
  documento?: string; // contenido generado, o URL/id si se guarda aparte
  campos_faltantes?: string[];
  mensaje?: string;
}

export async function generarDocumento(
  perfil: PerfilNegocio,
  tipoDocumento: string,
  datosAdicionales?: Record<string, any>
): Promise<ResultadoDocumento> {
  // TODO: cuando esté la plantilla real, aquí se arma el prompt con RAG
  // sobre chunks_regulacion (filtrado por pais + tema) y los datos del perfil.
  return {
    estado: "tipo_no_soportado",
    mensaje: `Fase 2 aún no tiene plantilla cargada para "${tipoDocumento}".`,
  };
}
