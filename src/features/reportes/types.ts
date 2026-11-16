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

// Matriculado en el curso de la clase que nunca se unió (RF-07).
export interface AlumnoAusente {
  alumnoId: number;
  nombre: string;
  apellido: string;
}

export interface SesionDeAlumno extends ConteosEventos {
  sesionId: number;
  codigo: string;
  iniciadaAt: string;
  docente: string;
  curso: string | null;
  estadoFinal: EstadoPresencia;
  eventos: Omit<EventoPresencia, "alumnoId">[];
}

export interface FilaMetricas extends ConteosEventos {
  grupo: string;
  sesiones: number;
  alumnosUnicos: number;
  participaciones: number;
  promedioAlumnos: number;
  tasaDistraccion: number;
}

export interface ClaseAsistencia {
  id: number;
  codigo: string;
  iniciadaAt: string;
  activa: boolean;
  docente: string;
}

export interface ClaseDetalle extends ClaseAsistencia {
  cursoId: number | null;
  curso: string | null;
  docenteId: number;
  finalizadaAt: string | null;
}

export interface AlumnoAsistencia {
  id: number;
  nombre: string;
  apellido: string;
  matriculado: boolean;
}

// Solo las clases a las que el alumno entró; sin fila = no se conectó.
export interface Participacion {
  sesionId: number;
  alumnoId: number;
  minutosDesdeInicio: number;
  tarde: boolean;
  distracciones: number;
  ausenciasDigitales: number;
  cortesDeRed: number;
  salidasAntesDelFinal: number;
  // Vacío = presente sin infracciones (los arma el backend).
  motivos: string[];
}

export interface PlanillaAsistencia {
  umbralDistracciones: number;
  clases: ClaseAsistencia[];
  alumnos: AlumnoAsistencia[];
  participaciones: Participacion[];
}

export interface AsistenciaDeClase {
  clase: ClaseDetalle;
  umbralDistracciones: number;
  alumnos: AlumnoAsistencia[];
  participaciones: Participacion[];
}
