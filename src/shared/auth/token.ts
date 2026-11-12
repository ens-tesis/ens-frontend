// Vive en shared (no en features/auth) porque el cliente Axios de
// shared/api necesita leer el token para el header de todas las
// requests, y shared no debe depender de un feature. features/auth
// re-exporta estas funciones como parte de su API pública.
//
// El JWT dura poco (90 min alumnos, 6 h el resto); al vencer, el cliente
// Axios lo renueva solo con el refresh token (ver renovarToken en
// shared/api/client.ts), que el backend rota en cada uso. Los dos viven en
// localStorage: el backend está en otro dominio (túnel) y una cookie
// httpOnly de terceros la bloquean Safari y los navegadores con
// protección de rastreo. ponytail: expuestos a XSS como cualquier dato de
// la página; la rotación con detección de reuso limita el daño de uno
// robado.
const TOKEN_KEY = "ens_token";
const REFRESH_KEY = "ens_refresh";
// Copia del último /auth/me (ver useUsuarioActual): se descarta con
// cualquier cambio de usuario para no mostrar el anterior sin red.
export const CLAVE_ME = "ens_me";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

// Login o cambio de contraseña: sesión nueva (otro usuario, quizás).
export function setToken(token: string, refreshToken?: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) window.localStorage.setItem(REFRESH_KEY, refreshToken);
  window.sessionStorage.removeItem(CLAVE_ME);
}

// Renovación: mismo usuario, se conserva la copia de /auth/me.
export function renovarTokens(token: string, refreshToken: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.sessionStorage.removeItem(CLAVE_ME);
}
