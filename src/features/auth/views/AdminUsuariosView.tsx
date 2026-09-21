"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { api } from "@/shared/api/client";
import { useUsuarioActual } from "../queries/useUsuarioActual";
import { clearToken } from "../services/session";
import type { Rol, Usuario } from "../services/session";
import { puedeCrearUsuarios, rolesInferioresA } from "../services/rolJerarquia";

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

  function cerrarSesion(): void {
    clearToken();
    router.replace("/login");
  }

  if (usuarioQuery.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <MensajeEstado tipo="cargando">Cargando...</MensajeEstado>
      </div>
    );
  }

  if (!usuarioQuery.data || !puedeCrearUsuarios(usuarioQuery.data.usuario.rol)) {
    return null;
  }

  const { usuario } = usuarioQuery.data;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-carbon">ENS · Administración</h1>
          <p className="text-sm text-carbon/70">
            {usuario.nombre} · {usuario.rol}
          </p>
        </div>
        <Boton variante="sutil" onClick={cerrarSesion}>
          Cerrar sesión
        </Boton>
      </header>

      <Tarjeta className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-carbon">Crear cuenta</h2>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!rol) return;
            mutation.mutate({ ...form, rol });
          }}
        >
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
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          <div className="space-y-1.5">
            <label htmlFor="rol" className="block text-sm font-medium text-carbon">
              Rol
            </label>
            <select
              id="rol"
              value={rol}
              onChange={(e) => setRol(e.target.value as Rol)}
              required
              className="min-h-11 w-full rounded-lg border border-carbon/20 bg-arena px-3.5 py-2.5 text-base text-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
            >
              <option value="" disabled>
                Elegir rol...
              </option>
              {opcionesRol.map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
            </select>
          </div>

          {mutation.isError && (
            <MensajeEstado tipo="error">{extraerMensajeError(mutation.error)}</MensajeEstado>
          )}
          {mutation.isSuccess && (
            <MensajeEstado tipo="exito">Cuenta creada correctamente.</MensajeEstado>
          )}

          <Boton type="submit" cargando={mutation.isPending} disabled={!rol} className="w-full">
            Crear cuenta
          </Boton>
        </form>
      </Tarjeta>
    </div>
  );
}
