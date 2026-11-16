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
  umbralDistracciones: number;
  preceptores: PersonaResumen[];
  docentes: (PersonaResumen & { materias: string[] })[];
  // Solo cuando lista un docente: sus materias en el curso.
  materias?: string[];
}
