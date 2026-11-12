"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { clearToken } from "../auth/token";
import { BotonInstalar } from "../pwa/BotonInstalar";
import { Icono, type NombreIcono } from "./Icono";
import { LogoMarca, LogoPalabra } from "./Logo";

export interface ItemNav<T extends string> {
  id: T;
  etiqueta: string;
  // Para la barra inferior, donde el espacio es poco ("Alta" en vez de "Alta de usuarios").
  etiquetaCorta?: string;
  icono: NombreIcono;
  // Número chico al lado (p. ej. alumnos conectados).
  contador?: number;
  // Si viene, el ítem navega a otra pantalla en vez de cambiar de sección.
  href?: string;
}

interface AppShellProps<T extends string> {
  // Área del usuario: "Dirección", "Preceptoría", "Docente"...
  area: string;
  usuario: { nombre: string; apellido?: string; email: string };
  secciones: ItemNav<T>[];
  // Orden de la barra inferior (mobile) si no es el mismo del sidebar,
  // p. ej. para dejar la sección principal en el medio, al alcance del pulgar.
  ordenInferior?: T[];
  activa?: T;
  onCambiar?: (id: T) => void;
  titulo: string;
  descripcion?: string;
  // A la derecha de la barra superior (la campana de alertas).
  acciones?: ReactNode;
  // Debajo de la barra, pegado a ella al scrollear (alerta urgente).
  banner?: ReactNode;
  children: ReactNode;
}

function iniciales(u: { nombre: string; apellido?: string }): string {
  return `${u.nombre[0] ?? ""}${u.apellido?.[0] ?? ""}`.toUpperCase();
}

function useCerrarSesion() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return () => {
    clearToken();
    window.sessionStorage.clear();
    queryClient.clear();
    router.replace("/login");
  };
}

// Compacta (barra de arriba en mobile): solo el medio ojo y la E.
function Marca({ compacta = false }: { compacta?: boolean }) {
  if (compacta) return <LogoMarca className="h-8 w-auto text-verde" />;
  return (
    <span className="block space-y-1.5">
      <LogoPalabra className="h-9 w-auto" />
      <span className="block text-[11px] font-medium tracking-wide opacity-70">Navegación supervisada</span>
    </span>
  );
}

const FOCO_SOBRE_VERDE =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arena";

function ItemLateral<T extends string>({
  item,
  activo,
  onClick,
}: {
  item: ItemNav<T>;
  activo: boolean;
  onClick: () => void;
}) {
  const clases = `group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${FOCO_SOBRE_VERDE} ${
    activo ? "bg-violeta text-carbon" : "text-arena/75 hover:bg-arena/10 hover:text-arena"
  }`;
  const contenido = (
    <>
      <Icono nombre={item.icono} />
      <span className="flex-1 text-left">{item.etiqueta}</span>
      {item.contador !== undefined && (
        <span
          className={`min-w-6 rounded-full px-1.5 text-center text-xs leading-6 tabular-nums ${
            activo ? "bg-carbon/15" : "bg-arena/15"
          }`}
        >
          {item.contador}
        </span>
      )}
    </>
  );
  return item.href ? (
    <Link href={item.href} aria-current={activo ? "page" : undefined} className={clases}>
      {contenido}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-current={activo ? "page" : undefined} className={clases}>
      {contenido}
    </button>
  );
}

function ItemInferior<T extends string>({
  item,
  activo,
  onClick,
}: {
  item: ItemNav<T>;
  activo: boolean;
  onClick: () => void;
}) {
  // min-w-0 + pastilla con ancho máximo (no fijo): con muchas secciones los
  // ítems se achican en vez de empujar los últimos fuera de la pantalla.
  const clases = `flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition-colors ${FOCO_SOBRE_VERDE} ${
    activo ? "text-arena" : "text-arena/60"
  }`;
  const contenido = (
    <>
      <span
        className={`relative grid h-8 w-full max-w-14 place-items-center rounded-full transition-colors ${
          activo ? "bg-violeta text-carbon" : ""
        }`}
      >
        <Icono nombre={item.icono} />
        {item.contador !== undefined && item.contador > 0 && (
          <span className="absolute -top-1 right-1 min-w-4 rounded-full bg-celeste px-1 text-[10px] leading-4 text-carbon tabular-nums">
            {item.contador}
          </span>
        )}
      </span>
      <span className="max-w-full truncate">{item.etiquetaCorta ?? item.etiqueta}</span>
    </>
  );
  return item.href ? (
    <Link href={item.href} aria-current={activo ? "page" : undefined} className={clases}>
      {contenido}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-current={activo ? "page" : undefined} className={clases}>
      {contenido}
    </button>
  );
}

// Avatar con menú de cuenta: en mobile es el único lugar para salir.
function MenuCuenta({ usuario, onSalir }: { usuario: AppShellProps<string>["usuario"]; onSalir: () => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="relative" onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}>
      <button
        type="button"
        aria-label="Tu cuenta"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
        className="grid size-11 place-items-center rounded-full bg-celeste text-sm font-bold text-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
      >
        {iniciales(usuario)}
      </button>
      {abierto && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setAbierto(false)}
          />
          <div className="entrar absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-carbon/10 bg-white p-2 shadow-flotante">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-carbon">
                {usuario.nombre} {usuario.apellido}
              </p>
              <p className="truncate text-xs text-carbon/60">{usuario.email}</p>
            </div>
            <BotonInstalar className="w-full" />
            <button
              type="button"
              onClick={onSalir}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-error hover:bg-error/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
            >
              <Icono nombre="salir" />
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Estructura común de todas las pantallas con sesión: sidebar pizarrón en
 * desktop (lg+), barra superior + barra de navegación inferior flotante en
 * mobile. Cada sección es una pantalla propia con su título; con menos de
 * dos secciones no se muestra navegación.
 */
export function AppShell<T extends string>({
  area,
  usuario,
  secciones,
  ordenInferior,
  activa,
  onCambiar,
  titulo,
  descripcion,
  acciones,
  banner,
  children,
}: AppShellProps<T>) {
  const salir = useCerrarSesion();
  const conNav = secciones.length > 1;
  const inferiores = ordenInferior
    ? ordenInferior.flatMap((id) => secciones.filter((s) => s.id === id))
    : secciones;

  function cambiar(id: T): void {
    onCambiar?.(id);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="pizarron fixed inset-y-0 left-0 z-30 hidden w-68 flex-col gap-8 p-4 text-arena lg:flex">
        <div className="px-2 pt-2">
          <Marca />
        </div>

        {conNav && (
          <nav aria-label="Secciones" className="flex flex-col gap-1">
            <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.14em] text-arena/50 uppercase">
              {area}
            </p>
            {secciones.map((s) => (
              <ItemLateral key={s.id} item={s} activo={s.id === activa} onClick={() => cambiar(s.id)} />
            ))}
          </nav>
        )}

        <div className="mt-auto space-y-2">
        <BotonInstalar sobreVerde className="w-full" />
        <div className="flex items-center gap-3 rounded-2xl bg-arena/[0.07] p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-celeste text-sm font-bold text-carbon">
            {iniciales(usuario)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              {usuario.nombre} {usuario.apellido}
            </span>
            <span className="block truncate text-xs text-arena/60">{usuario.email}</span>
          </span>
          <button
            type="button"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            onClick={salir}
            className={`grid size-10 shrink-0 place-items-center rounded-xl text-arena/70 hover:bg-arena/10 hover:text-arena ${FOCO_SOBRE_VERDE}`}
          >
            <Icono nombre="salir" />
          </button>
        </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-68">
        <header className="sticky top-0 z-20 border-b border-carbon/[0.06] pt-[env(safe-area-inset-top)]">
          {/* El blur va en una capa aparte: backdrop-filter en el header
              mismo lo vuelve contenedor de los position:fixed de adentro
              (overlays de la campana y del menú) y quedarían recortados. */}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-papel/85 backdrop-blur-xl" />
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
            <span className="flex items-center gap-2.5 text-carbon lg:hidden">
              <Marca compacta />
              <span className="font-display text-lg font-bold">{area}</span>
            </span>
            <span className="hidden text-sm font-medium text-carbon/60 lg:block">
              {area} <span className="px-1.5 text-carbon/30">/</span>
              <span className="text-carbon">{titulo}</span>
            </span>
            <div className="flex items-center gap-2">
              {acciones}
              <div className="lg:hidden">
                <MenuCuenta usuario={usuario} onSalir={salir} />
              </div>
            </div>
          </div>
          {banner}
        </header>

        <main
          className={`mx-auto w-full max-w-5xl flex-1 px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16 ${
            conNav ? "pb-[calc(env(safe-area-inset-bottom)+7rem)]" : "pb-12"
          }`}
        >
          <div key={String(activa)} className="entrar space-y-6">
            <div className="space-y-1.5">
              <h1 className="font-display text-3xl font-bold text-carbon sm:text-4xl">{titulo}</h1>
              {descripcion && <p className="max-w-2xl text-sm text-carbon/65 sm:text-base">{descripcion}</p>}
            </div>
            {children}
          </div>
        </main>
      </div>

      {conNav && (
        <nav
          aria-label="Secciones"
          className="pizarron fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex gap-1 rounded-[1.75rem] p-1.5 shadow-flotante lg:hidden"
        >
          {inferiores.map((s) => (
            <ItemInferior key={s.id} item={s} activo={s.id === activa} onClick={() => cambiar(s.id)} />
          ))}
        </nav>
      )}
    </div>
  );
}

// Estado de carga de pantalla completa mientras se valida la sesión.
export function PantallaCargando() {
  return (
    <div className="flex flex-1 items-center justify-center px-4" role="status">
      <span className="flex items-center gap-3 text-sm font-medium text-carbon/60">
        <span className="size-2.5 rounded-full bg-verde text-verde latido" aria-hidden="true" />
        Cargando...
      </span>
    </div>
  );
}
