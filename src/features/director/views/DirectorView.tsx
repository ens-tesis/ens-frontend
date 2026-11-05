"use client";

import { useState } from "react";
import { useGuardRol } from "@/features/auth";
import { NotificacionesCampana } from "@/features/notificaciones";
import { Historial, useCursos } from "@/features/reportes";
import { Encabezado } from "@/shared/components/Encabezado";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Pestanas } from "@/shared/components/Pestanas";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { GestionCursos } from "../components/GestionCursos";
import { GestionUsuarios } from "../components/GestionUsuarios";
import { Metricas } from "../components/Metricas";

type Pestana = "metricas" | "historial" | "cursos" | "usuarios";

// Admin entra a la misma pantalla: tiene todo lo del director y más.
export default function DirectorView() {
  const { cargando, usuario } = useGuardRol(["director", "admin"]);
  const cursos = useCursos(Boolean(usuario));
  const [pestana, setPestana] = useState<Pestana>("metricas");

  if (cargando) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <MensajeEstado tipo="cargando">Cargando...</MensajeEstado>
      </div>
    );
  }
  if (!usuario) return null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <Encabezado
        titulo={`ENS · ${usuario.rol === "admin" ? "Administración" : "Dirección"}`}
        subtitulo={`${usuario.nombre} · ${usuario.email}`}
        acciones={<NotificacionesCampana />}
      />

      <Pestanas
        opciones={[
          { id: "metricas", etiqueta: "Métricas" },
          { id: "historial", etiqueta: "Historial" },
          { id: "cursos", etiqueta: "Cursos" },
          { id: "usuarios", etiqueta: "Usuarios" },
        ]}
        activa={pestana}
        onCambiar={setPestana}
      />

      <Tarjeta>
        {pestana === "metricas" && <Metricas />}
        {pestana === "historial" && <Historial cursos={cursos.data ?? []} />}
        {pestana === "cursos" && <GestionCursos />}
        {pestana === "usuarios" && <GestionUsuarios actor={usuario} />}
      </Tarjeta>
    </div>
  );
}
