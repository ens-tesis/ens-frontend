import type { EstadoPresencia } from "@/shared/types/sesiones";

export interface PersonaResumen {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}

export interface Curso {
  id: number;
  nombre: string;
  anioLectivo: number;
  turno: string | null;
  cantidadAlumnos: number;
  preceptores: PersonaResumen[];
}

export interface ConteosEventos {
  distracciones: number;
  ausenciasDigitales: number;
  cortesDeRed: number;
  desconexionesPorRed: number;
}

export interface SesionResumen extends ConteosEventos {
  id: number;
  codigo: string;
  iniciadaAt: string;
  ultimaActividad: string | null;
  docente: string;
  cursoId: number | null;
  curso: string | null;
  participantes: number;
}

export interface EventoPresencia {
  alumnoId: number;
  estado: EstadoPresencia;
  tipoDesconexion: string | null;
  ts: string;
}

export interface ParticipanteDetalle {
  alumnoId: number;
  nombre: string;
  apellido: string;
  estadoFinal: EstadoPresencia;
  joinedAt: string;
  leftAt: string | null;
}

export interface SesionDeAlumno extends ConteosEventos {
  sesionId: number;
  codigo: string;
  iniciadaAt: string;
  docente: string;
  curso: string | null;
  estadoFinal: EstadoPresencia;
}

export interface FilaMetricas extends ConteosEventos {
  grupo: string;
  sesiones: number;
  alumnosUnicos: number;
  participaciones: number;
}

export interface Periodo {
  desde: string;
  hasta: string;
}
