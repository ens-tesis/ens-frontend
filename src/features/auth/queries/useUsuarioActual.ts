"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/shared/api/client";
import { clearToken, getToken, type Usuario } from "../services/session";

interface MeResponse {
  usuario: Usuario;
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
    queryFn: () => api.get<MeResponse>("/auth/me").then((res) => res.data),
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
