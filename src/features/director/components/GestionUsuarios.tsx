"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { esRolInferior, type Rol, type Usuario } from "@/features/auth";
import { api } from "@/shared/api/client";
import { Badge } from "@/shared/components/Badge";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { mensajeDeError } from "@/shared/lib/errores";

const ROLES: Rol[] = ["admin", "director", "preceptor", "docente", "alumno"];
const CLASE_SELECT =
  "min-h-11 rounded-lg border border-carbon/20 bg-arena px-3 py-2 text-base text-carbon";

// US-DI-02: el director gestiona roles y cuentas sin asistencia técnica.
// Solo puede tocar a usuarios de rol inferior al suyo y asignar roles
// inferiores (misma regla que aplica el backend, que es quien decide).
export function GestionUsuarios({ actor }: { actor: Usuario }) {
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

  const rolesAsignables = ROLES.filter((r) => esRolInferior(r, actor.rol));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-carbon">Usuarios</h2>
        <Link href="/admin" className="text-sm font-medium text-carbon underline underline-offset-2">
          + Dar de alta una cuenta
        </Link>
      </div>
      <select
        aria-label="Filtrar por rol"
        value={filtroRol}
        onChange={(e) => setFiltroRol(e.target.value as Rol | "")}
        className={`${CLASE_SELECT} w-full`}
      >
        <option value="">Todos los roles</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      {actualizar.isError && (
        <MensajeEstado tipo="error">{mensajeDeError(actualizar.error, "No se pudo actualizar el usuario.")}</MensajeEstado>
      )}

      {usuarios.isPending ? (
        <MensajeEstado tipo="cargando">Cargando usuarios...</MensajeEstado>
      ) : usuarios.isError ? (
        <MensajeEstado tipo="error">No se pudieron cargar los usuarios.</MensajeEstado>
      ) : (
        <ul className="space-y-2">
          {usuarios.data.map((u) => {
            const editable = esRolInferior(u.rol, actor.rol);
            return (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-carbon/10 bg-arena px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-carbon">
                    {u.apellido ? `${u.apellido}, ` : ""}
                    {u.nombre} {u.activo === false && <Badge variante="rojo">inactivo</Badge>}
                  </p>
                  <p className="truncate text-xs text-carbon/60">{u.email}</p>
                </div>
                {editable ? (
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Rol de ${u.email}`}
                      value={u.rol}
                      onChange={(e) => actualizar.mutate({ id: u.id, rol: e.target.value as Rol })}
                      className={CLASE_SELECT}
                    >
                      {rolesAsignables.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => actualizar.mutate({ id: u.id, activo: u.activo === false })}
                      className="min-h-11 rounded-lg border border-carbon/20 px-3 text-sm font-medium text-carbon hover:bg-carbon/5"
                    >
                      {u.activo === false ? "Activar" : "Desactivar"}
                    </button>
                  </div>
                ) : (
                  <Badge variante="celeste">{u.rol}</Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
