"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { PantallaAuth } from "./PantallaAuth";
import { api } from "@/shared/api/client";
import { rutaInicial } from "../lib/rutaPorRol";
import { clearToken, setToken, type Usuario } from "../lib/session";
import { useTokenInicial } from "../hooks/useTokenInicial";
import { fueCancelado, ingresarConHuella, soportaHuella } from "../lib/webauthn";

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

const sinSuscripcion = () => () => {};

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
      router.replace(rutaInicial(sesionExistente.data.usuario));
    } else if (sesionExistente.isError) {
      clearToken();
    }
  }, [sesionExistente.data, sesionExistente.isError, router]);

  const mutation = useMutation({
    mutationFn: (input: LoginInput) => api.post<LoginResponse>("/auth/login", input),
    onSuccess: (res) => {
      setToken(res.data.token);
      router.push(rutaInicial(res.data.usuario));
    },
  });

  const conHuella = useMutation({
    mutationFn: ingresarConHuella,
    onSuccess: (data) => {
      setToken(data.token);
      router.push(rutaInicial(data.usuario));
    },
  });
  // Solo en el cliente: en el render del servidor no hay navigator.
  const huellaDisponible = useSyncExternalStore(sinSuscripcion, soportaHuella, () => false);

  if (tokenInicial && sesionExistente.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <MensajeEstado tipo="cargando">Verificando tu sesión...</MensajeEstado>
      </div>
    );
  }

  return (
    <PantallaAuth titulo="Ingresá a tu cuenta">

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

        {huellaDisponible && (
          <div className="space-y-2">
            <Boton
              variante="sutil"
              className="w-full"
              cargando={conHuella.isPending}
              onClick={() => conHuella.mutate()}
            >
              Entrar con huella (alumnos)
            </Boton>
            {conHuella.isError && !fueCancelado(conHuella.error) && (
              <MensajeEstado tipo="error">{extraerMensajeError(conHuella.error)}</MensajeEstado>
            )}
          </div>
        )}

        <p className="text-center text-sm text-carbon/70">
          ¿No tenés cuenta? Pedísela a la preceptoría o dirección de tu colegio.
        </p>
    </PantallaAuth>
  );
}
