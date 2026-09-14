export type Rol = "alumno" | "docente";

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  createdAt: string;
}

const TOKEN_KEY = "ens_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}
