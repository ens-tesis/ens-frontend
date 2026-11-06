"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/shared/components/Boton";
import { AppShell, PantallaCargando } from "@/shared/components/AppShell";
import { CLASE_ETIQUETA, Campo } from "@/shared/components/Campo";
import { Icono } from "@/shared/components/Icono";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { api } from "@/shared/api/client";
import { useUsuarioActual } from "../queries/useUsuarioActual";
import type { Rol, Usuario } from "../services/session";
import { puedeCrearUsuarios, rolesInferioresA } from "../services/rolJerarquia";
import { rutaPorRol } from "../services/rutaPorRol";
import Link from "next/link";

interface CrearUsuarioInput {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: Rol;
}

interface CrearUsuarioResponse {
  usuario: Usuario;
}

const AREA: Record<Rol, string> = {
  admin: "Administración",
  director: "Dirección",
  preceptor: "Preceptoría",
  docente: "Docente",
  alumno: "Alumno",
};

const FORM_VACIO: Omit<CrearUsuarioInput, "rol"> = {
  nombre: "",
  apellido: "",
  email: "",
  password: "",
};

function extraerMensajeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "No se pudo crear la cuenta. Intentá de nuevo.";
}

export default function AdminUsuariosView() {
  const router = useRouter();
  const usuarioQuery = useUsuarioActual();

  useEffect(() => {
    if (usuarioQuery.data && !puedeCrearUsuarios(usuarioQuery.data.usuario.rol)) {
      router.replace("/login");
    }
  }, [usuarioQuery.data, router]);

  const opcionesRol = usuarioQuery.data ? rolesInferioresA(usuarioQuery.data.usuario.rol) : [];
  const [form, setForm] = useState(FORM_VACIO);
  const [rol, setRol] = useState<Rol | "">("");

  const mutation = useMutation({
    mutationFn: (input: CrearUsuarioInput) =>
      api.post<CrearUsuarioResponse>("/admin/usuarios", input),
    onSuccess: () => {
      setForm(FORM_VACIO);
      setRol("");
    },
  });

  if (usuarioQuery.isPending) return <PantallaCargando />;
  if (!usuarioQuery.data || !puedeCrearUsuarios(usuarioQuery.data.usuario.rol)) return null;

  const { usuario } = usuarioQuery.data;

  return (
    <AppShell
      area={AREA[usuario.rol]}
      usuario={usuario}
      secciones={[]}
      titulo="Dar de alta una cuenta"
      descripcion="La persona va a poder ingresar con este email y contraseña."
    >
      <Link
        href={rutaPorRol(usuario.rol)}
        className="-mt-2 inline-flex min-h-11 items-center gap-1 rounded-xl text-sm font-semibold text-carbon/70 hover:text-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
      >
        <Icono nombre="volver" className="size-4" />
        Volver al panel
      </Link>

      <Tarjeta className="max-w-lg">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!rol) return;
            mutation.mutate({ ...form, rol });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="nombre"
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
            <Campo
              id="apellido"
              label="Apellido"
              value={form.apellido}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
            />
          </div>
          <Campo
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Campo
            id="password"
            label="Contraseña (mínimo 8 caracteres)"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <fieldset className="space-y-1.5">
            <legend className={CLASE_ETIQUETA}>Rol</legend>
            <div className="flex flex-wrap gap-2 pt-1">
              {opcionesRol.map((opcion) => (
                <label
                  key={opcion}
                  className={`flex min-h-11 cursor-pointer items-center rounded-xl border px-4 text-sm font-semibold capitalize transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-carbon ${
                    rol === opcion ? "border-verde bg-verde text-arena" : "border-carbon/15 bg-white text-carbon hover:border-carbon/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={opcion}
                    checked={rol === opcion}
                    onChange={() => setRol(opcion)}
                    className="sr-only"
                    required
                  />
                  {opcion}
                </label>
              ))}
            </div>
          </fieldset>

          {mutation.isError && (
            <MensajeEstado tipo="error">{extraerMensajeError(mutation.error)}</MensajeEstado>
          )}
          {mutation.isSuccess && (
            <MensajeEstado tipo="exito">Cuenta creada. Ya puede ingresar.</MensajeEstado>
          )}

          <Boton type="submit" cargando={mutation.isPending} disabled={!rol} className="w-full">
            Crear cuenta
          </Boton>
        </form>
      </Tarjeta>
    </AppShell>
  );
}
