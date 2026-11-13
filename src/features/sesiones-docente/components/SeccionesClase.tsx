"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Boton } from "@/shared/components/Boton";
import { CLASE_CONTROL, CLASE_ETIQUETA } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import type { EstadoPresencia } from "@/shared/types/sesiones";
import { useClaseDocente } from "../hooks/useClaseDocente";
import { CodigoSesion } from "./CodigoSesion";
import { LinksFijos } from "./LinksFijos";
import { ParticipantesPanel } from "./ParticipantesPanel";
import { RegistroClase } from "./RegistroClase";
import { WhitelistPanel } from "./WhitelistPanel";

// Igual que el default de la base (migración 020) para clases sin curso.
const UMBRAL_DISTRACCIONES_DEFAULT = 3;

// Resumen de la clase en el pizarrón: cuántos hay en cada situación.
const GRUPOS_RESUMEN: { etiqueta: string; estados: EstadoPresencia[]; clase: string }[] = [
  { etiqueta: "Atentos", estados: ["conectado"], clase: "bg-white text-carbon border border-carbon/[0.07]" },
  { etiqueta: "Fuera de foco", estados: ["fuera_de_foco", "ausente_digital", "actividad_reducida"], clase: "bg-violeta text-carbon" },
  { etiqueta: "Sin red", estados: ["sin_red", "pantalla_suspendida"], clase: "bg-alerta text-carbon" },
  { etiqueta: "Se fueron", estados: ["desconectado"], clase: "bg-error text-arena" },
];

function extraerMensajeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "No se pudo crear la clase. Probá de nuevo.";
}

// Alumnos, Registro y Sitios solo existen con una clase en curso: sin
// clase, a Nueva clase. El código guardado ya está en el primer render
// (PersistGate espera a restaurar el store).
export function RequiereClase({ children }: { children: ReactNode }) {
  const { codigoActivo } = useClaseDocente();
  const router = useRouter();
  useEffect(() => {
    if (!codigoActivo) router.replace("/docente/clase");
  }, [codigoActivo, router]);
  return codigoActivo ? children : null;
}

// Avisos de la conexión en vivo: arriba de todas las secciones.
export function AvisosClase() {
  const { codigoActivo, socket, sesion, finalizarSesion } = useClaseDocente();
  if (!codigoActivo) return null;
  return (
    <>
      {!finalizarSesion.isPending && socket.estado === "cerrado" && socket.cierre && (
        <Tarjeta className="flex flex-col gap-3 border-error/30 sm:flex-row sm:items-center sm:justify-between">
          <MensajeEstado tipo="error">Se cortó la conexión en vivo: {socket.cierre.reason || "sin detalle"}.</MensajeEstado>
          <Boton variante="sutil" onClick={socket.reconectar}>
            Reconectar
          </Boton>
        </Tarjeta>
      )}
      {socket.contingencia && (
        <Tarjeta className="border-alerta/40 bg-alerta/15">
          <p className="text-sm font-semibold text-carbon">Modo contingencia: se cayó la red del aula</p>
          <p className="mt-1 text-sm text-carbon/75">
            La mayoría de los alumnos perdió la conexión a la vez. Mientras dure no se generan alertas y nadie queda como
            &quot;se fue&quot;: es un problema del wifi, no de ellos. Se reanuda solo cuando vuelve la red.
          </p>
        </Tarjeta>
      )}
      {sesion.isError && <MensajeEstado tipo="error">No se pudo cargar la información de la clase.</MensajeEstado>}
    </>
  );
}

function NuevaClase() {
  const { cursos, crearSesion } = useClaseDocente();
  const [cursoId, setCursoId] = useState("");
  const [materia, setMateria] = useState("");
  return (
    <div className="space-y-4">
      <section className="pizarron max-w-xl space-y-5 rounded-[2rem] p-6 text-arena shadow-flotante sm:p-8">
        <p className="font-display text-2xl font-bold sm:text-3xl">¿Con qué curso das clase?</p>
        <label className="block space-y-1.5">
          <span className={`${CLASE_ETIQUETA} text-arena/80`}>Curso</span>
          <select value={cursoId} onChange={(e) => setCursoId(e.target.value)} className={CLASE_CONTROL}>
            <option value="" disabled>
              Elegí un curso
            </option>
            {(cursos ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.anioLectivo})
              </option>
            ))}
          </select>
        </label>
        {/* Un docente puede dar dos materias al mismo curso el mismo día:
            cada materia es su propia clase (y su propia asistencia). */}
        <label className="block space-y-1.5">
          <span className={`${CLASE_ETIQUETA} text-arena/80`}>Materia</span>
          <input
            value={materia}
            onChange={(e) => setMateria(e.target.value)}
            maxLength={80}
            placeholder="Ej.: Matemática"
            className={CLASE_CONTROL}
          />
        </label>
        {cursos?.length === 0 && (
          <p className="rounded-xl bg-arena/15 px-3 py-2 text-sm text-arena">
            Todavía no tenés cursos asignados. Pedile a preceptoría o dirección que te asignen.
          </p>
        )}
        <Boton
          cargando={crearSesion.isPending}
          disabled={!cursoId || !materia.trim()}
          onClick={() => crearSesion.mutate({ cursoId: Number(cursoId), materia: materia.trim() })}
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
  );
}

function ClaseEnVivo({ codigo }: { codigo: string }) {
  const { socket, participantes, cursoDeLaClase, sesion, finalizarSesion } = useClaseDocente();
  const [confirmarFin, setConfirmarFin] = useState(false);
  return (
    <div className="space-y-4">
      <CodigoSesion
        codigo={codigo}
        curso={[cursoDeLaClase?.nombre, sesion.data?.sesion.materia].filter(Boolean).join(" · ") || null}
        enVivo={socket.estado === "conectado"}
        estado={socket.estado === "conectado" ? "En vivo" : socket.estado === "cerrado" ? "Desconectado" : "Reconectando..."}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {GRUPOS_RESUMEN.map((g) => (
          <Link
            key={g.etiqueta}
            href="/docente/alumnos"
            className={`rounded-3xl p-4 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon sm:p-5 ${g.clase}`}
          >
            <span className="block text-xs font-semibold opacity-80">{g.etiqueta}</span>
            <span className="mt-3 block font-display text-4xl font-bold tabular-nums sm:text-5xl">
              {participantes.filter((p) => g.estados.includes(p.estadoActual)).length}
            </span>
          </Link>
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
                onClick={() => finalizarSesion.mutate(undefined, { onSuccess: () => setConfirmarFin(false) })}
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
          <MensajeEstado tipo="error">No se pudo finalizar la clase. Probá de nuevo.</MensajeEstado>
        )}
      </Tarjeta>
    </div>
  );
}

// /docente/clase: la clase en vivo, o crear una si no hay.
export function SeccionClase() {
  const { codigoActivo } = useClaseDocente();
  return codigoActivo ? <ClaseEnVivo codigo={codigoActivo} /> : <NuevaClase />;
}

export function SeccionAlumnos() {
  const { participantes, datosListos, registro, faltan, cursoDeLaClase } = useClaseDocente();
  return (
    <div className="space-y-4">
      {faltan.length > 0 && (
        <Tarjeta className="space-y-2">
          <p className="text-sm font-semibold text-carbon">Faltan conectarse ({faltan.length})</p>
          <p className="text-sm text-carbon/70">{faltan.map((a) => `${a.apellido}, ${a.nombre}`).join(" · ")}</p>
        </Tarjeta>
      )}
      <ParticipantesPanel
        participantes={participantes}
        cargando={!datosListos}
        entradas={registro.data ?? []}
        umbral={cursoDeLaClase?.umbralDistracciones ?? UMBRAL_DISTRACCIONES_DEFAULT}
      />
    </div>
  );
}

export function SeccionRegistro() {
  const { registro, participantes } = useClaseDocente();
  return (
    <RegistroClase
      entradas={registro.data ?? []}
      cargando={registro.isPending}
      error={registro.isError}
      participantes={participantes}
    />
  );
}

export function SeccionSitios() {
  const { codigoActivo, whitelist, datosListos, cursoDeLaClase } = useClaseDocente();
  return <WhitelistPanel codigo={codigoActivo!} whitelist={whitelist} cargando={!datosListos} curso={cursoDeLaClase} />;
}
