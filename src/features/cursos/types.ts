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
  docentes: PersonaResumen[];
}
