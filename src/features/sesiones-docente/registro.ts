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
  const seg = Math.max(0, Math.round((Date.parse(hasta) - Date.parse(desde)) / 1000));
  if (seg < 60) return `${seg} s`;
  const min = Math.floor(seg / 60);
  return seg % 60 ? `${min} min ${seg % 60} s` : `${min} min`;
}
