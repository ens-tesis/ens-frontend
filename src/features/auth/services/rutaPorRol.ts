import type { Rol } from "./session";

// Pantalla principal de cada rol. Admin comparte la del director.
export function rutaPorRol(rol: Rol): string {
  if (rol === "docente") return "/docente";
  if (rol === "alumno") return "/alumno";
  if (rol === "preceptor") return "/preceptor";
  return "/director";
}
