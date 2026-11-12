"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import { paramsDePeriodo, PERIODO_VACIO, type Periodo } from "@/shared/components/FiltroPeriodo";
import type { AsistenciaDeClase, ClaseDetalle, PlanillaAsistencia } from "../types";

// GET /asistencia: el backend recorta por rol (docente → solo sus clases).
export function useAsistencia(cursoId: number | null, periodo: Periodo = PERIODO_VACIO) {
  return useQuery({
    queryKey: ["asistencia", cursoId, periodo],
    queryFn: () =>
      api
        .get<PlanillaAsistencia>("/asistencia", { params: { cursoId, ...paramsDePeriodo(periodo) } })
        .then((r) => r.data),
    enabled: cursoId !== null,
  });
}

// Una clase. Mientras está en vivo se refresca sola.
export function useAsistenciaClase(codigo: string) {
  return useQuery({
    queryKey: ["asistencia", "clase", codigo],
    queryFn: () => api.get<AsistenciaDeClase>(`/asistencia/clases/${codigo}`).then((r) => r.data),
    refetchInterval: (q) => (q.state.data?.clase.activa ? 15_000 : false),
  });
}

// Las clases que abrió hoy el docente.
export function useClasesDeHoy() {
  return useQuery({
    queryKey: ["asistencia", "hoy"],
    queryFn: () => api.get<{ clases: ClaseDetalle[] }>("/asistencia/hoy").then((r) => r.data.clases),
    refetchInterval: 60_000,
  });
}
