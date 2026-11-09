"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/shared/components/Boton";
import { CLASE_CONTROL, CLASE_ETIQUETA } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { AppShell, PantallaCargando, type ItemNav } from "@/shared/components/AppShell";
import { api } from "@/shared/api/client";
import { getToken, useUsuarioActual } from "@/features/auth";
import type { EstadoPresencia, Sesion, SesionCompleta } from "@/shared/types/sesiones";
import { useSesionSocket } from "@/shared/hooks/useSesionSocket";
import { useSessionStorageInicial } from "@/shared/hooks/useSessionStorageInicial";
import { NotificacionesCampana } from "@/features/notificaciones";
import { useCursos } from "@/features/reportes";
import { CodigoSesion } from "../components/CodigoSesion";
import { ParticipantesPanel } from "../components/ParticipantesPanel";
import { WhitelistPanel } from "../components/WhitelistPanel";

// Igual que el JWT (ver session.ts): sessionStorage es una decisión de
// alcance para este piloto, no un mecanismo robusto. Sobrevive a un
// refresh de página pero no a cerrar la pestaña, y no está pensado para
// varias pestañas del mismo docente en simultáneo.
const CLAVE_SESION_ACTIVA = "ens_sesion_activa_codigo";

type Seccion = "clase" | "alumnos" | "sitios";

interface CrearSesionResponse {
  sesion: Sesion;
}

function extraerMensajeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "No se pudo crear la sesión. Intentá de nuevo.";
}

// Resumen de la clase en el pizarrón: cuántos hay en cada situación.
const GRUPOS_RESUMEN: { etiqueta: string; estados: EstadoPresencia[]; clase: string }[] = [
  { etiqueta: "Atentos", estados: ["conectado"], clase: "bg-white text-carbon border border-carbon/[0.07]" },
  { etiqueta: "Fuera de foco", estados: ["fuera_de_foco", "ausente_digital", "actividad_reducida"], clase: "bg-violeta text-carbon" },
  { etiqueta: "Sin red", estados: ["sin_red", "pantalla_suspendida"], clase: "bg-alerta text-carbon" },
  { etiqueta: "Se fueron", estados: ["desconectado"], clase: "bg-error text-arena" },
];

export default function DocenteView() {
  const router = useRouter();
  const usuarioQuery = useUsuarioActual();
  const codigoGuardado = useSessionStorageInicial(CLAVE_SESION_ACTIVA);
  // undefined = todavía no se creó ni finalizó nada en esta pestaña (manda
  // lo guardado); null = el docente finalizó la clase.
  const [codigoOverride, setCodigoOverride] = useState<string | null | undefined>(undefined);
  const [cursoId, setCursoId] = useState("");
  const [seccion, setSeccion] = useState<Seccion>("clase");
  const [confirmarFin, setConfirmarFin] = useState(false);
  const cursos = useCursos(usuarioQuery.data?.usuario.rol === "docente");
  const codigoSesion = codigoOverride !== undefined ? codigoOverride : codigoGuardado;

  useEffect(() => {
    if (usuarioQuery.data && usuarioQuery.data.usuario.rol !== "docente") {
      router.replace("/login");
    }
  }, [usuarioQuery.data, router]);

  const sesionQuery = useQuery({
    queryKey: ["sesion", codigoSesion],
    queryFn: () =>
      api.get<SesionCompleta>(`/sesiones/${codigoSesion}`).then((res) => res.data),
    enabled: Boolean(codigoSesion),
  });
  // Una clase guardada en la pestaña que ya terminó (p. ej. se finalizó y
  // se recargó) no se muestra como en vivo.
  const codigoActivo = sesionQuery.data?.sesion.activa === false ? null : codigoSesion;

  const token = getToken();
  const socket = useSesionSocket(codigoActivo, token);

  const crearSesion = useMutation({
    mutationFn: () =>
      api.post<CrearSesionResponse>("/sesiones", { cursoId: cursoId ? Number(cursoId) : null }),
    onSuccess: (res) => {
      const { codigo } = res.data.sesion;
      window.sessionStorage.setItem(CLAVE_SESION_ACTIVA, codigo);
      setCodigoOverride(codigo);
      setSeccion("clase");
    },
  });

  const finalizarSesion = useMutation({
    mutationFn: () => api.post(`/sesiones/${codigoActivo}/finalizar`),
    onSuccess: () => {
      window.sessionStorage.removeItem(CLAVE_SESION_ACTIVA);
      setCodigoOverride(null);
      setConfirmarFin(false);
    },
  });

  if (usuarioQuery.isPending) return <PantallaCargando />;
  if (!usuarioQuery.data || usuarioQuery.data.usuario.rol !== "docente") return null;

  const { usuario } = usuarioQuery.data;
  const datosListos = socket.sincronizado || Boolean(sesionQuery.data);
  const whitelist = socket.sincronizado ? socket.whitelist : (sesionQuery.data?.whitelist ?? []);
  const participantes = socket.sincronizado
    ? socket.participantes
    : (sesionQuery.data?.participantes ?? []);

  // Sin clase activa no hay alumnos ni sitios que mostrar: una sola pantalla.
  const secciones: ItemNav<Seccion>[] = codigoActivo
    ? [
        { id: "clase", etiqueta: "Clase", icono: "clase" },
        { id: "alumnos", etiqueta: "Alumnos", icono: "alumnos", contador: participantes.length },
        { id: "sitios", etiqueta: "Sitios", icono: "sitios", contador: whitelist.length },
      ]
    : [];
  const vista: Seccion = codigoActivo ? seccion : "clase";

  const encabezado: Record<Seccion, { titulo: string; descripcion: string }> = {
    clase: codigoActivo
      ? { titulo: "Clase en vivo", descripcion: "Cómo está tu clase en este momento." }
      : {
          titulo: "Nueva clase",
          descripcion: "Creá una clase y compartí el código con tus alumnos para que se unan.",
        },
    alumnos: {
      titulo: "Alumnos",
      descripcion: "Primero aparece quien necesita atención. Se actualiza solo, en tiempo real.",
    },
    sitios: {
      titulo: "Sitios permitidos",
      descripcion: "Lo único que tus alumnos pueden abrir durante la clase.",
    },
  };

  return (
    <AppShell
      area="Docente"
      usuario={usuario}
      secciones={secciones}
      activa={vista}
      onCambiar={setSeccion}
      titulo={encabezado[vista].titulo}
      descripcion={encabezado[vista].descripcion}
      acciones={<NotificacionesCampana />}
    >
      {codigoActivo && !finalizarSesion.isPending && socket.estado === "cerrado" && socket.cierre && (
        <Tarjeta className="flex flex-col gap-3 border-error/30 sm:flex-row sm:items-center sm:justify-between">
          <MensajeEstado tipo="error">
            Se cortó la conexión en vivo: {socket.cierre.reason || "sin detalle"}.
          </MensajeEstado>
          <Boton variante="sutil" onClick={socket.reconectar}>
            Reconectar
          </Boton>
        </Tarjeta>
      )}
      {codigoActivo && sesionQuery.isError && (
        <MensajeEstado tipo="error">No se pudo cargar la información de la clase.</MensajeEstado>
      )}

      {!codigoActivo ? (
        <section className="pizarron max-w-xl space-y-5 rounded-[2rem] p-6 text-arena shadow-flotante sm:p-8">
          <p className="font-display text-2xl font-bold sm:text-3xl">¿Con qué curso das clase?</p>
          <label className="block space-y-1.5">
            <span className={`${CLASE_ETIQUETA} text-arena/80`}>Curso</span>
            <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={CLASE_CONTROL}>
              <option value="">Sin curso</option>
              {(cursos.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.anioLectivo})
                </option>
              ))}
            </select>
          </label>
          <Boton cargando={crearSesion.isPending} onClick={() => crearSesion.mutate()} className="w-full sm:w-auto">
            Empezar clase
          </Boton>
          {crearSesion.isError && (
            <p role="alert" className="rounded-xl bg-error px-3 py-2 text-sm font-medium text-arena">
              {extraerMensajeError(crearSesion.error)}
            </p>
          )}
        </section>
      ) : vista === "clase" ? (
        <div className="space-y-4">
          <CodigoSesion
            codigo={codigoActivo}
            curso={cursos.data?.find((c) => c.id === sesionQuery.data?.sesion.cursoId)?.nombre ?? null}
            enVivo={socket.estado === "conectado"}
            estado={
              socket.estado === "conectado"
                ? "En vivo"
                : socket.estado === "cerrado"
                  ? "Desconectado"
                  : "Reconectando..."
            }
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {GRUPOS_RESUMEN.map((g) => (
              <button
                key={g.etiqueta}
                type="button"
                onClick={() => setSeccion("alumnos")}
                className={`rounded-3xl p-4 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon sm:p-5 ${g.clase}`}
              >
                <span className="block text-xs font-semibold opacity-80">{g.etiqueta}</span>
                <span className="mt-3 block font-display text-4xl font-bold tabular-nums sm:text-5xl">
                  {participantes.filter((p) => g.estados.includes(p.estadoActual)).length}
                </span>
              </button>
            ))}
          </div>
          <Tarjeta className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {confirmarFin ? (
              <>
                <p className="text-sm text-carbon">
                  ¿Finalizar la clase? Los alumnos se desconectan y ya nadie puede unirse con este código.
                </p>
                <div className="flex shrink-0 gap-2">
                  <Boton variante="sutil" onClick={() => setConfirmarFin(false)} disabled={finalizarSesion.isPending}>
                    Cancelar
                  </Boton>
                  <Boton
                    cargando={finalizarSesion.isPending}
                    onClick={() => finalizarSesion.mutate()}
                    className="bg-error text-arena hover:bg-error/90"
                  >
                    Sí, finalizar
                  </Boton>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-carbon/70">¿Terminó la hora? Cerrá la clase para que quede en el historial.</p>
                <Boton variante="sutil" onClick={() => setConfirmarFin(true)} className="shrink-0">
                  Finalizar clase
                </Boton>
              </>
            )}
            {finalizarSesion.isError && (
              <MensajeEstado tipo="error">No se pudo finalizar la clase. Intentá de nuevo.</MensajeEstado>
            )}
          </Tarjeta>
        </div>
      ) : vista === "alumnos" ? (
        <ParticipantesPanel participantes={participantes} cargando={!datosListos} />
      ) : (
        <WhitelistPanel codigo={codigoActivo} whitelist={whitelist} cargando={!datosListos} />
      )}
    </AppShell>
  );
}
