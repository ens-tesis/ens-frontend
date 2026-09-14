"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { setToken, type Usuario } from "@/lib/session";

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

function extraerMensajeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "No se pudo iniciar sesión. Intentá de nuevo.";
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginInput>({ email: "", password: "" });

  const mutation = useMutation({
    mutationFn: (input: LoginInput) =>
      api.post<LoginResponse>("/auth/login", input),
    onSuccess: (res) => {
      setToken(res.data.token);
      router.push("/dashboard");
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
          Iniciar sesión
        </h1>

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
          {mutation.isPending ? "Ingresando..." : "Ingresar"}
        </button>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-zinc-950 dark:text-zinc-50">
            Crear cuenta
          </Link>
        </p>
      </form>
    </div>
  );
}
