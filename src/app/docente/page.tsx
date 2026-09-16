"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/Boton";
import { MensajeEstado } from "@/components/MensajeEstado";
import { Tarjeta } from "@/components/Tarjeta";
import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/session";
import type { Sesion, SesionCompleta } from "@/lib/sesionesTypes";
import { useSesionSocket } from "@/lib/useSesionSocket";
import { useSessionStorageInicial } from "@/lib/useSessionStorageInicial";
import { useUsuarioActual } from "@/lib/useUsuarioActual";
import { CodigoSesion } from "./_components/CodigoSesion";
import { ParticipantesPanel } from "./_components/ParticipantesPanel";
import { WhitelistPanel } from "./_components/WhitelistPanel";

// Igual que el JWT (ver session.ts): sessionStorage es una decisión de
// alcance para este piloto, no un mecanismo robusto. Sobrevive a un
// refresh de página pero no a cerrar la pestaña, y no está pensado para
// varias pestañas del mismo docente en simultáneo.
const CLAVE_SESION_ACTIVA = "ens_sesion_activa_codigo";

interface CrearSesionResponse {
  sesion: Sesion;
}

function extraerMensajeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "No se pudo crear la sesión. Intentá de nuevo.";
}

export default function DocentePage() {
  const router = useRouter();
  const usuarioQuery = useUsuarioActual();
  const codigoGuardado = useSessionStorageInicial(CLAVE_SESION_ACTIVA);
  const [codigoNuevo, setCodigoNuevo] = useState<string | null>(null);
  const codigoActivo = codigoNuevo ?? codigoGuardado;

  useEffect(() => {
    if (usuarioQuery.data && usuarioQuery.data.usuario.rol !== "docente") {
      router.replace("/login");
    }
  }, [usuarioQuery.data, router]);

  const token = getToken();
  const socket = useSesionSocket(codigoActivo, token);

  const sesionQuery = useQuery({
    queryKey: ["sesion", codigoActivo],
    queryFn: () =>
      api.get<SesionCompleta>(`/sesiones/${codigoActivo}`).then((res) => res.data),
    enabled: Boolean(codigoActivo),
  });

  const crearSesion = useMutation({
    mutationFn: () => api.post<CrearSesionResponse>("/sesiones"),
    onSuccess: (res) => {
      const { codigo } = res.data.sesion;
      window.sessionStorage.setItem(CLAVE_SESION_ACTIVA, codigo);
      setCodigoNuevo(codigo);
    },
  });

  function cerrarSesion(): void {
    clearToken();
    window.sessionStorage.removeItem(CLAVE_SESION_ACTIVA);
    router.replace("/login");
  }

  if (usuarioQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <MensajeEstado tipo="cargando">Cargando...</MensajeEstado>
      </div>
    );
  }

  if (!usuarioQuery.data || usuarioQuery.data.usuario.rol !== "docente") {
    return null;
  }

  const { usuario } = usuarioQuery.data;
  const datosListos = socket.sincronizado || Boolean(sesionQuery.data);
  const whitelist = socket.sincronizado ? socket.whitelist : (sesionQuery.data?.whitelist ?? []);
  const participantes = socket.sincronizado
    ? socket.participantes
    : (sesionQuery.data?.participantes ?? []);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-carbon">ENS · Docente</h1>
          <p className="text-sm text-carbon/70">
            {usuario.nombre} · {usuario.email}
          </p>
        </div>
        <Boton variante="sutil" onClick={cerrarSesion}>
          Cerrar sesión
        </Boton>
      </header>

      {!codigoActivo ? (
        <Tarjeta className="flex flex-col items-center gap-4 text-center">
          <p className="text-carbon/80">
            Creá una sesión para empezar la clase. Vas a recibir un código para
            compartir con tus alumnos.
          </p>
          <Boton cargando={crearSesion.isPending} onClick={() => crearSesion.mutate()}>
            Crear nueva sesión
          </Boton>
          {crearSesion.isError && (
            <MensajeEstado tipo="error">{extraerMensajeError(crearSesion.error)}</MensajeEstado>
          )}
        </Tarjeta>
      ) : (
        <div className="flex flex-col gap-6">
          <CodigoSesion codigo={codigoActivo} />

          {socket.estado === "reconectando" && (
            <Tarjeta>
              <MensajeEstado tipo="info">
                Se perdió la conexión en vivo, reconectando...
              </MensajeEstado>
            </Tarjeta>
          )}

          {socket.estado === "cerrado" && socket.cierre && (
            <Tarjeta className="flex items-center justify-between gap-4">
              <MensajeEstado tipo="error">
                Se cerró la conexión en vivo: {socket.cierre.reason || "sin detalle"}.
              </MensajeEstado>
              <Boton variante="sutil" onClick={socket.reconectar}>
                Reconectar
              </Boton>
            </Tarjeta>
          )}

          {sesionQuery.isError && (
            <MensajeEstado tipo="error">
              No se pudo cargar la información de la sesión.
            </MensajeEstado>
          )}

          <Tarjeta>
            <WhitelistPanel
              codigo={codigoActivo}
              whitelist={whitelist}
              cargando={!datosListos}
            />
          </Tarjeta>

          <Tarjeta>
            <ParticipantesPanel participantes={participantes} cargando={!datosListos} />
          </Tarjeta>
        </div>
      )}
    </div>
  );
}
