"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { esRolInferior, useUsuarioActual, type Rol, type Usuario } from "@/features/auth";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { CLASE_CONTROL } from "@/shared/components/Campo";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA } from "@/shared/components/Tarjeta";
import { mensajeDeError } from "@/shared/lib/errores";

const ROLES: Rol[] = ["admin", "director", "preceptor", "docente", "alumno"];

const ETIQUETA_ROL: Record<Rol, string> = {
  admin: "Admin",
  director: "Director",
  preceptor: "Preceptor",
  docente: "Docente",
  alumno: "Alumno",
};

const CLASE_CHIP =
  "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon";

// US-DI-02: el director gestiona roles y cuentas sin asistencia técnica.
// Solo puede tocar a usuarios de rol inferior al suyo y asignar roles
// inferiores (misma regla que aplica el backend, que es quien decide).
// altaHref: la sección de alta del mismo panel (no una pantalla aparte).
export function GestionUsuarios({ altaHref }: { altaHref: string }) {
  const actor = useUsuarioActual().data?.usuario;
  return actor ? <ListaUsuarios actor={actor} altaHref={altaHref} /> : null;
}

function ListaUsuarios({ actor, altaHref }: { actor: Usuario; altaHref: string }) {
  const queryClient = useQueryClient();
  const [filtroRol, setFiltroRol] = useState<Rol | "">("");
  const usuarios = useQuery({
    queryKey: ["usuarios", filtroRol || "todos"],
    queryFn: () =>
      api
        .get<{ usuarios: Usuario[] }>("/admin/usuarios", { params: filtroRol ? { rol: filtroRol } : {} })
        .then((r) => r.data.usuarios),
  });

  const actualizar = useMutation({
    mutationFn: (c: { id: number; rol?: Rol; activo?: boolean }) =>
      api.patch(`/admin/usuarios/${c.id}`, { rol: c.rol, activo: c.activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  // Alumno que cambió o perdió el celular: vuelve a entrar con contraseña.
  const quitarHuella = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/usuarios/${id}/passkeys`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  const rolesAsignables = ROLES.filter((r) => esRolInferior(r, actor.rol));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filtrar por rol" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {(["", ...ROLES] as const).map((r) => (
            <button
              key={r || "todos"}
              type="button"
              aria-pressed={filtroRol === r}
              onClick={() => setFiltroRol(r)}
              className={`${CLASE_CHIP} ${
                filtroRol === r ? "bg-verde text-arena" : "border border-carbon/15 bg-white text-carbon/75 hover:text-carbon"
              }`}
            >
              {r ? ETIQUETA_ROL[r] : "Todos"}
            </button>
          ))}
        </div>
        <Link
          href={altaHref}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violeta px-5 text-sm font-semibold text-carbon hover:bg-violeta-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
        >
          <Icono nombre="mas" className="size-4" />
          Dar de alta
        </Link>
      </div>

      {actualizar.isError && (
        <MensajeEstado tipo="error">{mensajeDeError(actualizar.error, "No se pudo actualizar el usuario.")}</MensajeEstado>
      )}

      {usuarios.isPending ? (
        <MensajeEstado tipo="cargando">Cargando usuarios...</MensajeEstado>
      ) : usuarios.isError ? (
        <MensajeEstado tipo="error">No se pudieron cargar los usuarios.</MensajeEstado>
      ) : usuarios.data.length === 0 ? (
        <MensajeEstado tipo="vacio">No hay usuarios con ese rol.</MensajeEstado>
      ) : (
        <ul className="space-y-2">
          {usuarios.data.map((u) => {
            const editable = esRolInferior(u.rol, actor.rol);
            const inactivo = u.activo === false;
            return (
              <li
                key={u.id}
                className={`${CLASE_FILA} flex flex-col gap-3 bg-white p-3 pr-4 shadow-tarjeta sm:flex-row sm:items-center ${
                  inactivo ? "opacity-70" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-celeste text-sm font-bold text-carbon">
                    {`${u.nombre[0] ?? ""}${u.apellido?.[0] ?? ""}`.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold text-carbon">
                      {u.apellido ? `${u.apellido}, ` : ""}
                      {u.nombre}
                      {inactivo && <Badge variante="rojo">Inactivo</Badge>}
                      {u.tienePasskey && <Badge variante="verde">Huella</Badge>}
                    </p>
                    <p className="truncate text-xs text-carbon/60">{u.email}</p>
                  </div>
                </div>
                {editable ? (
                  <div className="flex items-center gap-2">
                    {u.tienePasskey && (
                      <button
                        type="button"
                        title="Borra la huella registrada: el alumno vuelve a entrar con su contraseña"
                        disabled={quitarHuella.isPending}
                        onClick={() => quitarHuella.mutate(u.id)}
                        className="min-h-11 shrink-0 rounded-xl border border-carbon/15 px-3 text-sm font-semibold text-carbon hover:border-carbon/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
                      >
                        Quitar huella
                      </button>
                    )}
                    <select
                      aria-label={`Rol de ${u.email}`}
                      value={u.rol}
                      onChange={(e) => actualizar.mutate({ id: u.id, rol: e.target.value as Rol })}
                      className={`${CLASE_CONTROL} min-h-11 sm:w-36`}
                    >
                      {rolesAsignables.map((r) => (
                        <option key={r} value={r}>
                          {ETIQUETA_ROL[r]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => actualizar.mutate({ id: u.id, activo: inactivo })}
                      className={`min-h-11 shrink-0 rounded-xl border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon ${
                        inactivo
                          ? "border-verde bg-verde text-arena hover:bg-verde-hover"
                          : "border-carbon/15 text-carbon hover:border-error/50 hover:text-error"
                      }`}
                    >
                      {inactivo ? "Activar" : "Desactivar"}
                    </button>
                  </div>
                ) : (
                  <Badge variante="celeste">{ETIQUETA_ROL[u.rol]}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
