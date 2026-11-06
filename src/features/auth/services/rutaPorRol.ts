import type { Rol, Usuario } from "./session";

// A dónde va un usuario al entrar: primero a cambiar la contraseña si es
// provisoria (el backend le rechaza todo lo demás hasta entonces).
export function rutaInicial(usuario: Usuario): string {
  return usuario.debeCambiarPassword ? "/cambiar-password" : rutaPorRol(usuario.rol);
}

// Pantalla principal de cada rol. Admin comparte la del director.
export function rutaPorRol(rol: Rol): string {
  if (rol === "docente") return "/docente";
  if (rol === "alumno") return "/alumno";
  if (rol === "preceptor") return "/preceptor";
  return "/director";
}
