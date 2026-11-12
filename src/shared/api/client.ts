import axios, { type InternalAxiosRequestConfig } from "axios";
import { clearToken, getRefreshToken, getToken, renovarTokens } from "../auth/token";
import { olvidarUrlBackend, urlBackend } from "./backendUrl";

export const api = axios.create();

// La URL del backend se resuelve en tiempo de ejecución (backendUrl.ts).
api.interceptors.request.use(async (config) => {
  config.baseURL = await urlBackend();
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Una sola renovación a la vez, también entre pestañas (Web Locks): el
// backend rota el refresh token en cada uso y usar uno ya rotado lo toma
// como robo y cierra todas las sesiones del usuario.
let renovando: Promise<string | null> | undefined;

async function renovar(tokenVencido: string | null): Promise<string | null> {
  // Otra pestaña ya lo renovó mientras se esperaba el lock.
  const actual = getToken();
  if (actual && actual !== tokenVencido) return actual;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post<{ token: string; refreshToken: string }>(
      `${await urlBackend()}/auth/refresh`,
      { refreshToken },
    );
    renovarTokens(data.token, data.refreshToken);
    return data.token;
  } catch (err) {
    // Rechazado (vencido, revocado, cuenta desactivada): no hay sesión.
    // Sin red: se deja todo como está para reintentar después.
    const estado = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (estado === 401 || estado === 403) clearToken();
    return null;
  }
}

export function renovarToken(tokenVencido: string | null): Promise<string | null> {
  if (!renovando) {
    const conLock: Promise<string | null> =
      typeof navigator !== "undefined" && navigator.locks
        ? // Los tipos de lib.dom anidan la promesa; en ejecución ya viene aplanada.
          navigator.locks.request("ens-renovar-token", () => renovar(tokenVencido)).then((t) => t)
        : renovar(tokenVencido);
    renovando = conLock.finally(() => {
      renovando = undefined;
    });
  }
  return renovando;
}

const SIN_RENOVACION = ["/auth/login", "/auth/refresh", "/auth/logout"];

api.interceptors.response.use(undefined, async (err: unknown) => {
  if (!axios.isAxiosError(err)) throw err;
  if (!err.response) olvidarUrlBackend();
  const config = err.config as (InternalAxiosRequestConfig & { _renovado?: boolean }) | undefined;
  if (err.response?.status !== 401 || !config || config._renovado || SIN_RENOVACION.includes(config.url ?? "")) {
    throw err;
  }
  const enviado = String(config.headers.Authorization ?? "").replace(/^Bearer /, "") || null;
  const nuevo = await renovarToken(enviado);
  if (!nuevo) throw err;
  config._renovado = true;
  config.headers.Authorization = `Bearer ${nuevo}`;
  return api(config);
});
