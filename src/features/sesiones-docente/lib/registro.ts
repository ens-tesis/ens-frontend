import { formatoDuracion } from "@/shared/lib/presencia";
import type { EstadoPresencia } from "@/shared/types/sesiones";

export interface EventoClase {
  alumnoId: number;
  estado: EstadoPresencia;
  tipoDesconexion: string | null;
  ts: string;
}

export interface EntradaRegistro {
  alumnoId: number;
  estado: EstadoPresencia;
  tipoDesconexion: string | null;
  desde: string;
  hasta: string | null; // null = sigue así
}

// "Lo malo" para el docente: todo lo que no es estar mirando la clase.
const MALOS = new Set<EstadoPresencia>([
  "fuera_de_foco",
  "ausente_digital",
  "actividad_reducida",
  "sin_red",
  "pantalla_suspendida",
  "desconectado",
]);

// Eventos crudos (orden de llegada) -> qué pasó, a quién, desde cuándo y
// hasta cuándo (el siguiente cambio de ese alumno). Un mismo estado
// repetido seguido se junta en una sola entrada. Lo más nuevo primero.
export function armarRegistro(eventos: EventoClase[]): EntradaRegistro[] {
  const ordenados = [...eventos].sort((a, b) => a.ts.localeCompare(b.ts));
  const abiertaPorAlumno = new Map<number, EntradaRegistro>();
  const entradas: EntradaRegistro[] = [];

  for (const e of ordenados) {
    const abierta = abiertaPorAlumno.get(e.alumnoId);
    if (abierta?.estado === e.estado) continue;
    if (abierta) {
      abierta.hasta = e.ts;
      abiertaPorAlumno.delete(e.alumnoId);
    }
    if (MALOS.has(e.estado)) {
      const entrada = { alumnoId: e.alumnoId, estado: e.estado, tipoDesconexion: e.tipoDesconexion, desde: e.ts, hasta: null };
      entradas.push(entrada);
      abiertaPorAlumno.set(e.alumnoId, entrada);
    }
  }
  return entradas.reverse();
}

export function duracion(desde: string, hasta: string): string {
  return formatoDuracion((Date.parse(hasta) - Date.parse(desde)) / 1000);
}

// Tiempo fuera de foco = lo que no es un problema técnico: fuera de foco,
// ausente digital y pantalla dividida (mismo criterio que los reportes).
const FUERA_DE_FOCO = new Set<EstadoPresencia>(["fuera_de_foco", "ausente_digital", "actividad_reducida"]);

export type Nivel = "verde" | "ambar" | "rojo";

export interface Atencion {
  distracciones: number;
  segundosFuera: number;
  nivel: Nivel;
}

// Semáforo: rojo cuando supera el umbral de distracciones del curso (el
// mismo que dispara la alerta) o lleva 5 min fuera; ámbar desde 2
// distracciones o 1 min fuera.
const SEG_AMBAR = 60;
const SEG_ROJO = 300;

// Por alumno, a partir del registro: cuántas veces se distrajo y cuánto
// tiempo estuvo fuera (lo que sigue abierto cuenta hasta `ahora`).
export function atencionPorAlumno(entradas: EntradaRegistro[], umbral: number, ahora: number): Map<number, Atencion> {
  const porAlumno = new Map<number, Atencion>();
  for (const e of entradas) {
    if (!FUERA_DE_FOCO.has(e.estado)) continue;
    const a = porAlumno.get(e.alumnoId) ?? { distracciones: 0, segundosFuera: 0, nivel: "verde" as Nivel };
    if (e.estado === "fuera_de_foco") a.distracciones++;
    a.segundosFuera += Math.max(0, ((e.hasta ? Date.parse(e.hasta) : ahora) - Date.parse(e.desde)) / 1000);
    porAlumno.set(e.alumnoId, a);
  }
  for (const a of porAlumno.values()) {
    a.nivel =
      a.distracciones > umbral || a.segundosFuera >= SEG_ROJO
        ? "rojo"
        : a.distracciones >= 2 || a.segundosFuera >= SEG_AMBAR
          ? "ambar"
          : "verde";
  }
  return porAlumno;
}
