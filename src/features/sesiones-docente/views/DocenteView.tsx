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
import { Asistencia, useAsistencia, useCursos } from "@/features/reportes";
import { CodigoSesion } from "../components/CodigoSesion";
import { LinksFijos } from "../components/LinksFijos";
import { ParticipantesPanel } from "../components/ParticipantesPanel";
import { RegistroClase, useRegistroClase } from "../components/RegistroClase";
import { WhitelistPanel } from "../components/WhitelistPanel";

// Igual que el JWT (ver session.ts): sessionStorage es una decisión de
// alcance para este piloto, no un mecanismo robusto. Sobrevive a un
// refresh de página pero no a cerrar la pestaña, y no está pensado para
// varias pestañas del mismo docente en simultáneo.
const CLAVE_SESION_ACTIVA = "ens_sesion_activa_codigo";

// Igual que el default de la base (migración 020) para clases sin curso.
const UMBRAL_DISTRACCIONES_DEFAULT = 3;

type Seccion = "clase" | "alumnos" | "registro" | "sitios" | "asistencia";

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
  const registro = useRegistroClase(codigoActivo, socket.participantes);
  // Matriculados del curso de la clase en vivo, para ver quién falta.
  const planillaCurso = useAsistencia(codigoActivo ? (sesionQuery.data?.sesion.cursoId ?? null) : null);

  const crearSesion = useMutation({
    mutationFn: () =>
      api.post<CrearSesionResponse>("/sesiones", { cursoId: Number(cursoId) }),
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
  const entradasRegistro = registro.data ?? [];
  const cursoDeLaClase = cursos.data?.find((c) => c.id === sesionQuery.data?.sesion.cursoId);
  const faltan = (planillaCurso.data?.alumnos ?? []).filter(
    (a) => a.matriculado && !participantes.some((p) => p.alumnoId === a.id),
  );

  // Sin clase activa no hay alumnos ni sitios que mostrar: solo la nueva
  // clase y la planilla de asistencia.
  const asistencia: ItemNav<Seccion> = { id: "asistencia", etiqueta: "Asistencia", icono: "asistencia" };
  const secciones: ItemNav<Seccion>[] = codigoActivo
    ? [
        { id: "clase", etiqueta: "Clase", icono: "clase" },
        { id: "alumnos", etiqueta: "Alumnos", icono: "alumnos", contador: participantes.length },
        { id: "registro", etiqueta: "Registro", icono: "historial", contador: entradasRegistro.length },
        { id: "sitios", etiqueta: "Sitios", icono: "sitios", contador: whitelist.length },
        asistencia,
      ]
    : [{ id: "clase", etiqueta: "Nueva clase", icono: "clase" }, asistencia];
  const vista: Seccion = codigoActivo || seccion === "asistencia" ? seccion : "clase";

  const encabezado: Record<Seccion, { titulo: string; descripcion: string }> = {
    clase: codigoActivo
      ? { titulo: "Clase en vivo", descripcion: "Cómo está tu clase en este momento." }
      : {
          titulo: "Nueva clase",
          descripcion: "Creá una clase y compartí el código con tus alumnos para que se unan.",
        },
    alumnos: {
      titulo: "Alumnos",
      descripcion: "Primero quien más se distrajo, con su tiempo fuera de foco. Se actualiza solo, en tiempo real.",
    },
    registro: {
      titulo: "Registro de la clase",
      descripcion: "Todo lo que pasó en esta clase: distracciones, cortes y salidas, con cuánto duró cada uno.",
    },
    sitios: {
      titulo: "Sitios permitidos",
      descripcion: "Lo único que tus alumnos pueden abrir durante la clase.",
    },
    asistencia: {
      titulo: "Asistencia",
      descripcion: "Tus clases por curso: quién se conectó, quién faltó y quién llegó tarde o no se quedó conectado.",
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
      {codigoActivo && socket.contingencia && (
        <Tarjeta className="border-alerta/40 bg-alerta/15">
          <p className="text-sm font-semibold text-carbon">Modo contingencia: se cayó la red del aula</p>
          <p className="mt-1 text-sm text-carbon/75">
            La mayoría de los alumnos perdió la conexión a la vez. Mientras dure no se generan alertas y nadie
            queda como &quot;se fue&quot;: es un problema del wifi, no de ellos. Se reanuda solo cuando vuelve la red.
          </p>
        </Tarjeta>
      )}
      {codigoActivo && sesionQuery.isError && (
        <MensajeEstado tipo="error">No se pudo cargar la información de la clase.</MensajeEstado>
      )}

      {vista === "asistencia" ? (
        <Asistencia cursos={cursos.data ?? []} />
      ) : !codigoActivo ? (
        <div className="space-y-4">
        <section className="pizarron max-w-xl space-y-5 rounded-[2rem] p-6 text-arena shadow-flotante sm:p-8">
          <p className="font-display text-2xl font-bold sm:text-3xl">¿Con qué curso das clase?</p>
          <label className="block space-y-1.5">
            <span className={`${CLASE_ETIQUETA} text-arena/80`}>Curso</span>
            <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={CLASE_CONTROL}>
              <option value="" disabled>
                Elegí un curso
              </option>
              {(cursos.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.anioLectivo})
                </option>
              ))}
            </select>
          </label>
          {cursos.data?.length === 0 && (
            <p className="rounded-xl bg-arena/15 px-3 py-2 text-sm text-arena">
              Todavía no tenés cursos asignados. Pedile a preceptoría o dirección que te asignen.
            </p>
          )}
          <Boton
            cargando={crearSesion.isPending}
            disabled={!cursoId}
            onClick={() => crearSesion.mutate()}
            className="w-full sm:w-auto"
          >
            Empezar clase
          </Boton>
          {crearSesion.isError && (
            <p role="alert" className="rounded-xl bg-error px-3 py-2 text-sm font-medium text-arena">
              {extraerMensajeError(crearSesion.error)}
            </p>
          )}
        </section>
        <LinksFijos />
        </div>
      ) : vista === "clase" ? (
        <div className="space-y-4">
          <CodigoSesion
            codigo={codigoActivo}
            curso={cursoDeLaClase?.nombre ?? null}
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
        <div className="space-y-4">
          {faltan.length > 0 && (
            <Tarjeta className="space-y-2">
              <p className="text-sm font-semibold text-carbon">Faltan conectarse ({faltan.length})</p>
              <p className="text-sm text-carbon/70">
                {faltan.map((a) => `${a.apellido}, ${a.nombre}`).join(" · ")}
              </p>
            </Tarjeta>
          )}
          <ParticipantesPanel
            participantes={participantes}
            cargando={!datosListos}
            entradas={entradasRegistro}
            umbral={cursoDeLaClase?.umbralDistracciones ?? UMBRAL_DISTRACCIONES_DEFAULT}
          />
        </div>
      ) : vista === "registro" ? (
        <RegistroClase
          entradas={entradasRegistro}
          cargando={registro.isPending}
          error={registro.isError}
          participantes={participantes}
        />
      ) : (
        <WhitelistPanel
          codigo={codigoActivo}
          whitelist={whitelist}
          cargando={!datosListos}
          curso={cursoDeLaClase ?? null}
        />
      )}
    </AppShell>
  );
}
