"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useGuardRol } from "@/features/auth";
import { NotificacionesCampana } from "@/features/notificaciones";
import { Historial, HistorialAlumno, useCursos, type Curso, type PersonaResumen } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { Encabezado } from "@/shared/components/Encabezado";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Pestanas } from "@/shared/components/Pestanas";
import { Tarjeta } from "@/shared/components/Tarjeta";

type Pestana = "historial" | "cursos";

function AlumnosDelCurso({
  curso,
  onAlumno,
}: {
  curso: Curso;
  onAlumno: (a: PersonaResumen) => void;
}) {
  const alumnos = useQuery({
    queryKey: ["cursos", curso.id, "alumnos"],
    queryFn: () =>
      api.get<{ alumnos: PersonaResumen[] }>(`/cursos/${curso.id}/alumnos`).then((r) => r.data.alumnos),
  });
  if (alumnos.isPending) return <MensajeEstado tipo="cargando">Cargando alumnos...</MensajeEstado>;
  if (alumnos.isError) return <MensajeEstado tipo="error">No se pudieron cargar los alumnos.</MensajeEstado>;
  if (alumnos.data.length === 0) return <MensajeEstado tipo="vacio">Sin alumnos matriculados.</MensajeEstado>;
  return (
    <ul className="divide-y divide-carbon/10">
      {alumnos.data.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => onAlumno(a)}
            className="flex min-h-11 w-full items-center justify-between gap-2 px-1 text-left text-sm text-carbon hover:bg-carbon/5"
          >
            <span>
              {a.apellido}, {a.nombre}
            </span>
            <span className="text-xs text-carbon/60">Ver asistencia digital →</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function PreceptorView() {
  const { cargando, usuario } = useGuardRol(["preceptor"]);
  const cursos = useCursos(Boolean(usuario));
  const [pestana, setPestana] = useState<Pestana>("historial");
  const [cursoAbierto, setCursoAbierto] = useState<number | null>(null);
  const [alumno, setAlumno] = useState<PersonaResumen | null>(null);

  if (cargando) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <MensajeEstado tipo="cargando">Cargando...</MensajeEstado>
      </div>
    );
  }
  if (!usuario) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Encabezado
        titulo="ENS · Preceptor"
        subtitulo={`${usuario.nombre} · ${usuario.email}`}
        acciones={<NotificacionesCampana />}
      />

      <Pestanas
        opciones={[
          { id: "historial", etiqueta: "Historial de sesiones" },
          { id: "cursos", etiqueta: "Mis cursos" },
        ]}
        activa={pestana}
        onCambiar={(p) => {
          setPestana(p);
          setAlumno(null);
        }}
      />

      <Tarjeta>
        {cursos.isPending ? (
          <MensajeEstado tipo="cargando">Cargando cursos...</MensajeEstado>
        ) : cursos.isError ? (
          <MensajeEstado tipo="error">No se pudieron cargar tus cursos.</MensajeEstado>
        ) : cursos.data.length === 0 ? (
          <MensajeEstado tipo="vacio">
            Todavía no tenés cursos asignados. Pedile a la dirección que te asigne.
          </MensajeEstado>
        ) : pestana === "historial" ? (
          <Historial cursos={cursos.data} />
        ) : alumno ? (
          <HistorialAlumno
            alumnoId={alumno.id}
            nombre={`${alumno.nombre} ${alumno.apellido}`}
            onVolver={() => setAlumno(null)}
          />
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-carbon">Mis cursos</h2>
            {cursos.data.map((c) => (
              <div key={c.id} className="rounded-lg border border-carbon/10 bg-arena">
                <button
                  type="button"
                  aria-expanded={cursoAbierto === c.id}
                  onClick={() => setCursoAbierto(cursoAbierto === c.id ? null : c.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 px-4 py-3 text-left"
                >
                  <span className="font-medium text-carbon">
                    {c.nombre} · {c.anioLectivo}
                    {c.turno ? ` · ${c.turno}` : ""}
                  </span>
                  <span className="text-sm text-carbon/70">{c.cantidadAlumnos} alumnos</span>
                </button>
                {cursoAbierto === c.id && (
                  <div className="border-t border-carbon/10 px-3 py-2">
                    <AlumnosDelCurso curso={c} onAlumno={setAlumno} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      <p className="text-center text-sm text-carbon/70">
        <Link href="/admin" className="font-medium text-carbon underline underline-offset-2">
          Dar de alta un docente
        </Link>
      </p>
    </div>
  );
}
