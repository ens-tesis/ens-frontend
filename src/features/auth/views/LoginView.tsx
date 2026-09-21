"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { api } from "@/shared/api/client";
import { clearToken, setToken, type Rol, type Usuario } from "../services/session";
import { useTokenInicial } from "../services/useTokenInicial";

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

interface MeResponse {
  usuario: Usuario;
}

function rutaPorRol(rol: Rol): string {
  if (rol === "docente") return "/docente";
  if (rol === "alumno") return "/alumno";
  // admin, director, preceptor: todavía no tienen pantalla propia más
  // allá del alta de cuentas (ver AdminUsuariosView).
  return "/admin";
}

function extraerMensajeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "No se pudo iniciar sesión. Intentá de nuevo.";
}

export default function LoginView() {
  const router = useRouter();
  const [form, setForm] = useState<LoginInput>({ email: "", password: "" });
  const tokenInicial = useTokenInicial();

  // Si ya hay un token guardado y sigue siendo válido, no tiene sentido
  // mostrar el formulario: lo mandamos directo a su pantalla.
  const sesionExistente = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/auth/me").then((res) => res.data),
    enabled: Boolean(tokenInicial),
    retry: false,
  });

  useEffect(() => {
    if (sesionExistente.data) {
      router.replace(rutaPorRol(sesionExistente.data.usuario.rol));
    } else if (sesionExistente.isError) {
      clearToken();
    }
  }, [sesionExistente.data, sesionExistente.isError, router]);

  const mutation = useMutation({
    mutationFn: (input: LoginInput) => api.post<LoginResponse>("/auth/login", input),
    onSuccess: (res) => {
      setToken(res.data.token);
      router.push(rutaPorRol(res.data.usuario.rol));
    },
  });

  if (tokenInicial && sesionExistente.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <MensajeEstado tipo="cargando">Verificando tu sesión...</MensajeEstado>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Tarjeta className="w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-carbon">ENS</h1>
          <p className="text-sm text-carbon/70">Entorno de Navegación Supervisado</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <Campo
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Campo
            id="password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {mutation.isError && (
            <MensajeEstado tipo="error">{extraerMensajeError(mutation.error)}</MensajeEstado>
          )}

          <Boton type="submit" cargando={mutation.isPending} className="w-full">
            Ingresar
          </Boton>
        </form>

        <p className="text-center text-sm text-carbon/70">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-carbon underline underline-offset-2">
            Crear cuenta
          </Link>
        </p>
      </Tarjeta>
    </div>
  );
}
