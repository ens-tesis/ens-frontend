export type Rol = "alumno" | "docente";

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  createdAt: string;
}

// Limitación conocida (aceptable para el timeline de este piloto): el JWT
// vive en localStorage, así que queda expuesto a XSS si algún día se
// carga contenido de terceros sin sanitizar, y no hay invalidación
// proactiva del lado cliente si expira mientras la pestaña sigue abierta
// (recién se nota en el próximo request/reconexión que la rechace). Para
// producción real convendría una cookie httpOnly + refresh token.
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
