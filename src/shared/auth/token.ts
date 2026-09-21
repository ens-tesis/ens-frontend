// Vive en shared (no en features/auth) porque el cliente Axios de
// shared/api necesita leer el token para el header de todas las
// requests, y shared no debe depender de un feature. features/auth
// re-exporta estas funciones como parte de su API pública.
//
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
