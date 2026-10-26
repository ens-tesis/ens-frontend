import axios from "axios";
import { getToken } from "../auth/token";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  // ponytail: backend corre detrás de un túnel localtunnel mientras Railway
  // está caído (ver historial); este header evita la pantalla de aviso que
  // loca.lt le muestra a requests de navegador. Sacar cuando vuelva Railway.
  headers: { "Bypass-Tunnel-Reminder": "true" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
