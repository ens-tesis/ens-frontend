"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUsuarioActual } from "@/features/auth";
import { api } from "@/shared/api/client";
import { Boton } from "@/shared/components/Boton";
import { Tarjeta } from "@/shared/components/Tarjeta";

/**
 * Arriba del panel de dirección cuando quien lo usa es el admin: en qué
 * colegio está trabajando y cómo volver. Sin colegio elegido, a /admin.
 */
export function AvisoColegioActual() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const esAdmin = useUsuarioActual().data?.usuario.rol === "admin";
  const [saliendo, setSaliendo] = useState(false);
  const colegio = useQuery({
    queryKey: ["colegio-actual"],
    queryFn: () =>
      api.get<{ colegio: { id: number; nombre: string } | null }>("/instituciones/actual").then((r) => r.data.colegio),
    enabled: esAdmin,
  });

  useEffect(() => {
    if (esAdmin && colegio.data === null) router.replace("/admin/colegios");
  }, [esAdmin, colegio.data, router]);

  async function volver(): Promise<void> {
    setSaliendo(true);
    await api.post("/instituciones/salir");
    // Lo cacheado (cursos, usuarios...) era de ese colegio.
    queryClient.clear();
    router.push("/admin/colegios");
  }

  if (!esAdmin || !colegio.data) return null;
  return (
    <Tarjeta className="flex flex-col gap-3 border-violeta/40 bg-violeta/15 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-carbon">
        Estás operando <span className="font-semibold">{colegio.data.nombre}</span> como administrador.
      </p>
      <Boton variante="sutil" cargando={saliendo} onClick={() => void volver()} className="shrink-0">
        Volver a colegios
      </Boton>
    </Tarjeta>
  );
}
