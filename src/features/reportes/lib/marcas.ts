import type { Participacion } from "../types";

// Las marcas del libro de preceptoría.
//  Por clase: P (entró a horario), T (entró más de 10 min tarde), A (no entró).
//  Por día (todas las clases del día): P / T si entró a todas, PA si a
//  algunas, A si a ninguna. Faltar pesa más que llegar tarde: con una
//  ausencia es PA aunque haya llegado tarde a otra.
//  `salio` (se muestra como *): se desconectó antes del final de alguna.
export type MarcaClase = "P" | "T" | "A";
export type MarcaDia = MarcaClase | "PA";

export interface Marca<M extends string> {
  marca: M;
  salio: boolean;
}

export const ETIQUETA_MARCA: Record<MarcaDia, string> = {
  P: "Presente",
  T: "Llegó tarde",
  PA: "Presente con ausencia",
  A: "Ausente",
};

export function marcaClase(p: Participacion | undefined): Marca<MarcaClase> {
  if (!p) return { marca: "A", salio: false };
  return { marca: p.tarde ? "T" : "P", salio: p.salidasAntesDelFinal > 0 };
}

// null = ese día no hubo clase.
export function marcaDia(clasesDelDia: number, participaciones: Participacion[]): Marca<MarcaDia> | null {
  if (clasesDelDia === 0) return null;
  const salio = participaciones.some((p) => p.salidasAntesDelFinal > 0);
  if (participaciones.length === 0) return { marca: "A", salio };
  if (participaciones.length < clasesDelDia) return { marca: "PA", salio };
  return { marca: participaciones.some((p) => p.tarde) ? "T" : "P", salio };
}

export const textoMarca = (m: Marca<MarcaDia>): string => `${ETIQUETA_MARCA[m.marca]}${m.salio ? ", se desconectó antes del final" : ""}`;
