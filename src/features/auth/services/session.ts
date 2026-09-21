export { getToken, setToken, clearToken } from "@/shared/auth/token";

// Jerarquía real (ver rolJerarquia.ts): admin > director > preceptor >
// docente > alumno. Coincide con el enum rol_usuario del backend.
export type Rol = "alumno" | "docente" | "preceptor" | "director" | "admin";

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  createdAt: string;
}
