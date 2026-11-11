"use client";

import type { ReactNode } from "react";
import { PanelRol, type SeccionPanel } from "@/features/panel";
import { ClaseDocenteProvider, useClaseDocente } from "../hooks/useClaseDocente";
import { AvisosClase } from "./SeccionesClase";

const ASISTENCIA: SeccionPanel = {
  segmento: "asistencia",
  etiqueta: "Asistencia",
  icono: "asistencia",
  descripcion: "Tus clases por curso: quién se conectó, quién faltó y quién llegó tarde o no se quedó conectado.",
};

function Secciones({ children }: { children: ReactNode }) {
  const { codigoActivo, participantes, registro, whitelist } = useClaseDocente();
  // Sin clase en curso no hay alumnos ni sitios: solo la nueva clase y la
  // planilla de asistencia.
  const secciones: SeccionPanel[] = codigoActivo
    ? [
        { segmento: "clase", etiqueta: "Clase", icono: "clase", titulo: "Clase en vivo", descripcion: "Cómo está tu clase en este momento." },
        {
          segmento: "alumnos",
          etiqueta: "Alumnos",
          icono: "alumnos",
          contador: participantes.length,
          descripcion: "Primero quien más se distrajo, con su tiempo fuera de foco. Se actualiza solo, en tiempo real.",
        },
        {
          segmento: "registro",
          etiqueta: "Registro",
          icono: "historial",
          contador: registro.data?.length ?? 0,
          titulo: "Registro de la clase",
          descripcion: "Todo lo que pasó en esta clase: distracciones, cortes y salidas, con cuánto duró cada uno.",
        },
        {
          segmento: "sitios",
          etiqueta: "Sitios",
          icono: "sitios",
          contador: whitelist.length,
          titulo: "Sitios permitidos",
          descripcion: "Lo único que tus alumnos pueden abrir durante la clase.",
        },
        ASISTENCIA,
      ]
    : [
        {
          segmento: "clase",
          etiqueta: "Nueva clase",
          icono: "clase",
          descripcion: "Creá una clase y compartí el código con tus alumnos para que se unan.",
        },
        ASISTENCIA,
      ];
  return (
    <PanelRol
      roles={["docente"]}
      base="docente"
      area="Docente"
      secciones={secciones}
      ordenInferior={["sitios", "alumnos", "clase", "asistencia", "registro"]}
      aviso={<AvisosClase />}
    >
      {children}
    </PanelRol>
  );
}

// Layout de /docente: la clase en vivo sobrevive a los cambios de sección.
export function PanelDocente({ children }: { children: ReactNode }) {
  return (
    <ClaseDocenteProvider>
      <Secciones>{children}</Secciones>
    </ClaseDocenteProvider>
  );
}
