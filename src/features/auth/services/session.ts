export { getToken, setToken, clearToken } from "@/shared/auth/token";

export type Rol = "alumno" | "docente";

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  createdAt: string;
}
