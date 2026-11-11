"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Rol, Usuario } from "../lib/session";
import { useUsuarioActual } from "./useUsuarioActual";

/**
 * Guard de las pantallas de un rol: redirige a /login si no hay sesión o si
 * el rol no está entre los permitidos. Devuelve el usuario solo si puede
 * ver la pantalla (la autorización real la sigue haciendo el backend).
 */
export function useGuardRol(roles: Rol[]): { cargando: boolean; usuario: Usuario | null } {
  const router = useRouter();
  const query = useUsuarioActual();
  const usuario = query.data?.usuario ?? null;
  const permitido = usuario !== null && roles.includes(usuario.rol) && !usuario.debeCambiarPassword;

  // debeCambiarPassword ya lo redirige useUsuarioActual.
  useEffect(() => {
    if (usuario && !usuario.debeCambiarPassword && !permitido) router.replace("/login");
  }, [usuario, permitido, router]);

  return { cargando: query.isPending, usuario: permitido ? usuario : null };
}
