"use client";

import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import { createContext, useContext, useState, type ReactNode } from "react";
import { getToken, useUsuarioActual } from "@/features/auth";
import { useCursos, type Curso } from "@/features/cursos";
import { useAsistencia } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { useSesionSocket } from "@/shared/hooks/useSesionSocket";
import { useSessionStorageInicial } from "@/shared/hooks/useSessionStorageInicial";
import type { ParticipanteConectado, Sesion, SesionCompleta, WhitelistUrl } from "@/shared/types/sesiones";
import { useRegistroClase } from "../components/RegistroClase";
import type { EntradaRegistro } from "../lib/registro";

// Igual que el JWT (ver session.ts): sessionStorage es una decisión de
// alcance para este piloto, no un mecanismo robusto. Sobrevive a un
// refresh de página pero no a cerrar la pestaña, y no está pensado para
// varias pestañas del mismo docente en simultáneo.
export const CLAVE_SESION_ACTIVA = "ens_sesion_activa_codigo";

interface ClaseDocente {
  cursos: Curso[] | undefined;
  // null = no hay clase en curso.
  codigoActivo: string | null;
  sesion: UseQueryResult<SesionCompleta>;
  socket: ReturnType<typeof useSesionSocket>;
  registro: UseQueryResult<EntradaRegistro[]>;
  participantes: ParticipanteConectado[];
  whitelist: WhitelistUrl[];
  datosListos: boolean;
  cursoDeLaClase: Curso | null;
  // Matriculados del curso que todavía no entraron.
  faltan: { id: number; nombre: string; apellido: string }[];
  crearSesion: UseMutationResult<unknown, Error, number>;
  finalizarSesion: UseMutationResult<unknown, Error, void>;
}

const Contexto = createContext<ClaseDocente | null>(null);

export function useClaseDocente(): ClaseDocente {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useClaseDocente fuera de ClaseDocenteProvider");
  return valor;
}

/**
 * La clase en vivo del docente (código, conexión WebSocket, registro). Vive
 * en el layout de /docente: cambiar de sección no corta la conexión.
 */
export function ClaseDocenteProvider({ children }: { children: ReactNode }) {
  const esDocente = useUsuarioActual().data?.usuario.rol === "docente";
  const codigoGuardado = useSessionStorageInicial(CLAVE_SESION_ACTIVA);
  // undefined = todavía no se creó ni finalizó nada en esta pestaña (manda
  // lo guardado); null = el docente finalizó la clase.
  const [codigoOverride, setCodigoOverride] = useState<string | null | undefined>(undefined);
  const codigoSesion = codigoOverride !== undefined ? codigoOverride : codigoGuardado;
  const cursos = useCursos(esDocente);

  const sesion = useQuery({
    queryKey: ["sesion", codigoSesion],
    queryFn: () => api.get<SesionCompleta>(`/sesiones/${codigoSesion}`).then((res) => res.data),
    enabled: esDocente && Boolean(codigoSesion),
  });
  // Una clase guardada en la pestaña que ya terminó (p. ej. se finalizó y
  // se recargó) no se muestra como en vivo.
  const codigoActivo = sesion.data?.sesion.activa === false ? null : codigoSesion;

  const socket = useSesionSocket(esDocente ? codigoActivo : null, getToken());
  const registro = useRegistroClase(codigoActivo, socket.participantes);
  const planillaCurso = useAsistencia(codigoActivo ? (sesion.data?.sesion.cursoId ?? null) : null);

  const crearSesion = useMutation({
    mutationFn: (cursoId: number) => api.post<{ sesion: Sesion }>("/sesiones", { cursoId }),
    onSuccess: (res) => {
      const { codigo } = res.data.sesion;
      window.sessionStorage.setItem(CLAVE_SESION_ACTIVA, codigo);
      setCodigoOverride(codigo);
    },
  });

  const finalizarSesion = useMutation({
    mutationFn: () => api.post(`/sesiones/${codigoActivo}/finalizar`),
    onSuccess: () => {
      window.sessionStorage.removeItem(CLAVE_SESION_ACTIVA);
      setCodigoOverride(null);
    },
  });

  const participantes = socket.sincronizado ? socket.participantes : (sesion.data?.participantes ?? []);
  const valor: ClaseDocente = {
    cursos: cursos.data,
    codigoActivo,
    sesion,
    socket,
    registro,
    participantes,
    whitelist: socket.sincronizado ? socket.whitelist : (sesion.data?.whitelist ?? []),
    datosListos: socket.sincronizado || Boolean(sesion.data),
    cursoDeLaClase: cursos.data?.find((c) => c.id === sesion.data?.sesion.cursoId) ?? null,
    faltan: (planillaCurso.data?.alumnos ?? []).filter(
      (a) => a.matriculado && !participantes.some((p) => p.alumnoId === a.id),
    ),
    crearSesion,
    finalizarSesion,
  };
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}
