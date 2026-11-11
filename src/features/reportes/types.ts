import type { EstadoPresencia } from "@/shared/types/sesiones";

export interface ConteosEventos {
  distracciones: number;
  segundosFueraDeFoco: number;
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

export interface PlanillaAsistencia {
  umbralDistracciones: number;
  clases: { id: number; codigo: string; iniciadaAt: string; activa: boolean; docente: string }[];
  alumnos: { id: number; nombre: string; apellido: string; matriculado: boolean }[];
  // Solo las clases a las que el alumno entró; sin fila = no se conectó.
  participaciones: {
    sesionId: number;
    alumnoId: number;
    minutosDesdeInicio: number;
    // Vacío = presente sin infracciones (los arma el backend).
    motivos: string[];
  }[];
}
