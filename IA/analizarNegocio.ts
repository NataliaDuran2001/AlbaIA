// lib/fases/analizarNegocio.ts
//
// Misma lógica que antes, ahora como función pura -- no sabe nada de HTTP,
// así que se puede llamar desde un endpoint, un test, o un futuro worker.

import { REQUISITOS_MINIMOS, type PerfilNegocio } from "../types/perfil-negocio";
import { recomendar, PaisNoSoportadoError } from "../reglas";

export type ResultadoAnalisis =
  | { estado: "faltan_datos"; siguiente_campo: keyof PerfilNegocio; campos_faltantes: (keyof PerfilNegocio)[] }
  | { estado: "completo"; recomendacion: ReturnType<typeof recomendar> }
  | { estado: "pais_no_soportado"; mensaje: string };

export function analizarNegocio(perfil: PerfilNegocio): ResultadoAnalisis {
  const camposFaltantes = REQUISITOS_MINIMOS.filter(
    (campo) => perfil[campo] === null || perfil[campo] === undefined
  );

  if (camposFaltantes.length > 0) {
    return {
      estado: "faltan_datos",
      siguiente_campo: camposFaltantes[0],
      campos_faltantes: camposFaltantes,
    };
  }

  try {
    const recomendacion = recomendar(perfil);
    return { estado: "completo", recomendacion };
  } catch (err) {
    if (err instanceof PaisNoSoportadoError) {
      return { estado: "pais_no_soportado", mensaje: err.message };
    }
    throw err; // errores inesperados sí deben burbujear como 500
  }
}
