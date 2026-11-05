"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api/client";
import type { Curso } from "./types";

// GET /cursos: el backend ya filtra (preceptor → solo los suyos).
export function useCursos(enabled = true) {
  return useQuery({
    queryKey: ["cursos"],
    queryFn: () => api.get<{ cursos: Curso[] }>("/cursos").then((r) => r.data.cursos),
    enabled,
  });
}
