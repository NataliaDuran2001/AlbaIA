// lib/types/solicitud-negocio.ts
//
// El campo "accion" es el flag que distingue Fase 1 de Fase 2.
// Ser un "discriminated union" (no un string suelto) le da algo importante:
// TypeScript te obliga a manejar cada caso explícitamente en el switch,
// y si agregan una tercera acción más adelante, el compilador les avisa
// en todos los lugares donde falte manejarla.

import type { PerfilNegocio } from "./perfil-negocio";

export type SolicitudNegocio =
  | {
      accion: "analizar_negocio";
      perfil: PerfilNegocio;
    }
  | {
      accion: "generar_documento";
      perfil: PerfilNegocio; // ya debe venir completo, con recomendación previa
      tipo_documento: string; // ej. "solicitud_sociedad_emprendimiento"
      datos_adicionales?: Record<string, any>; // lo que falte solo para el documento
    };
