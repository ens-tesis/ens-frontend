"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/shared/api/client";
import type { Usuario } from "../services/session";

// Registro público: siempre alumno. Cuentas con un rol superior se dan
// de alta solo vía /admin/usuarios (ver AdminUsuariosView), autenticado
// y limitado por jerarquía — nunca por auto-registro acá.
interface RegistroInput {
  nombre: string;
  email: string;
  password: string;
}

interface RegistroResponse {
  usuario: Usuario;
}

function extraerMensajeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "No se pudo completar el registro. Intentá de nuevo.";
}

export default function RegistroView() {
  const router = useRouter();
  const [form, setForm] = useState<RegistroInput>({
    nombre: "",
    email: "",
    password: "",
  });

  const mutation = useMutation({
    mutationFn: (input: RegistroInput) =>
      api.post<RegistroResponse>("/auth/registro", input),
    onSuccess: () => {
      router.push("/login");
    },
  });

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
        className="w-full max-w-sm space-y-4 rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950"
      >
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Crear cuenta
        </h1>

        <div className="space-y-1">
          <label htmlFor="nombre" className="text-sm text-zinc-600 dark:text-zinc-400">
            Nombre
          </label>
          <input
            id="nombre"
            required
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="w-full rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm text-zinc-600 dark:text-zinc-400">
            Email
          </label>
          <input
            id="email"
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm text-zinc-600 dark:text-zinc-400">
            Contraseña
          </label>
          <input
            id="password"
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {extraerMensajeError(mutation.error)}
          </p>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {mutation.isPending ? "Creando..." : "Crear cuenta"}
        </button>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-zinc-950 dark:text-zinc-50">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
