import axios from "axios";
import { api } from "../api/client";

// Pase de un solo uso para abrir un WebSocket: el navegador no deja mandar
// el token en un header al abrirlo, y en la URL quedaría en logs. Se pide
// uno por cada intento de conexión (vence a los 60 s y se usa una vez; ver
// paseConexion.ts en el backend).
// null = el token ya no sirve (401/403): reintentar no cambia nada. Un
// error de red se propaga, para que el caller reintente con su backoff.
export async function pedirPaseConexion(): Promise<string | null> {
  try {
    const { data } = await api.post<{ pase: string }>("/sesiones/pase-conexion");
    return data.pase;
  } catch (err) {
    const estado = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (estado === 401 || estado === 403) return null;
    throw err;
  }
}
