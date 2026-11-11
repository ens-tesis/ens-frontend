"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useGuardRol, type Rol } from "@/features/auth";
import { NotificacionesCampana } from "@/features/notificaciones";
import { AppShell, PantallaCargando, type ItemNav } from "@/shared/components/AppShell";
import type { NombreIcono } from "@/shared/components/Icono";

// Una sección del panel = una subdirección: /{base}/{segmento}.
export interface SeccionPanel {
  segmento: string;
  etiqueta: string;
  etiquetaCorta?: string;
  icono: NombreIcono;
  // Título de la página si no es la etiqueta del menú.
  titulo?: string;
  descripcion: string;
  contador?: number;
}

interface PanelRolProps {
  roles: Rol[];
  base: string;
  area: string;
  secciones: SeccionPanel[];
  ordenInferior?: string[];
  conNotificaciones?: boolean;
  // Arriba del contenido de todas las secciones (avisos del panel).
  aviso?: ReactNode;
  children: ReactNode;
}

/**
 * Layout de un rol: valida que el usuario pueda estar acá y arma la
 * navegación con enlaces reales. La sección activa, el título y la
 * descripción salen de la URL, así recargar o ir "atrás" funciona.
 */
export function PanelRol({
  roles,
  base,
  area,
  secciones,
  ordenInferior,
  conNotificaciones = true,
  aviso,
  children,
}: PanelRolProps) {
  const { cargando, usuario } = useGuardRol(roles);
  const pathname = usePathname();

  if (cargando) return <PantallaCargando />;
  if (!usuario) return null;

  const segmento = pathname.split("/")[2] ?? "";
  const actual = secciones.find((s) => s.segmento === segmento);
  const items: ItemNav<string>[] = secciones.map((s) => ({
    id: s.segmento,
    etiqueta: s.etiqueta,
    ...(s.etiquetaCorta && { etiquetaCorta: s.etiquetaCorta }),
    icono: s.icono,
    ...(s.contador !== undefined && { contador: s.contador }),
    href: `/${base}/${s.segmento}`,
  }));

  return (
    <AppShell
      area={area}
      usuario={usuario}
      secciones={items}
      {...(ordenInferior && { ordenInferior })}
      {...(actual && { activa: actual.segmento })}
      titulo={actual?.titulo ?? actual?.etiqueta ?? area}
      {...(actual && { descripcion: actual.descripcion })}
      {...(conNotificaciones && { acciones: <NotificacionesCampana /> })}
    >
      {aviso}
      {children}
    </AppShell>
  );
}
