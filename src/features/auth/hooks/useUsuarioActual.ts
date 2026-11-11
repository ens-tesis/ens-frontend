"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "axios";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/shared/api/client";
import { CLAVE_ME } from "@/shared/auth/token";
import { clearToken, getToken, type Usuario } from "../lib/session";

interface MeResponse {
  usuario: Usuario;
}

// Último /auth/me bueno de esta pestaña: si se recarga sin red (wifi del
// colegio caído), la pantalla abre igual con este usuario en vez de
// tratar el corte como sesión vencida y mandar a /login.
async function traerUsuario(): Promise<MeResponse> {
  try {
    const { data } = await api.get<MeResponse>("/auth/me");
    window.sessionStorage.setItem(CLAVE_ME, JSON.stringify(data));
    return data;
  } catch (err) {
    const guardado = window.sessionStorage.getItem(CLAVE_ME);
    if (axios.isAxiosError(err) && !err.response && guardado) {
      return JSON.parse(guardado) as MeResponse;
    }
    throw err;
  }
}

/**
 * Trae el usuario autenticado vía GET /auth/me y redirige a /login si no
 * hay token o si el backend lo rechaza (expirado/inválido). Se usa como
 * guard de las pantallas protegidas (/docente, /alumno).
 */
export function useUsuarioActual(): UseQueryResult<MeResponse> {
  const router = useRouter();
  const pathname = usePathname();

  const query = useQuery({
    queryKey: ["me"],
    queryFn: traerUsuario,
    enabled: Boolean(getToken()),
    retry: false,
  });

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    if (query.isError) {
      clearToken();
      router.replace("/login");
      return;
    }
    // Contraseña provisoria: el backend rechaza todo lo demás hasta cambiarla.
    if (query.data?.usuario.debeCambiarPassword && pathname !== "/cambiar-password") {
      router.replace("/cambiar-password");
    }
  }, [query.isError, query.data, pathname, router]);

  return query;
}
