"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/shared/api/client";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { PantallaAuth } from "./PantallaAuth";
import type { Usuario } from "../services/session";

// Registro público: siempre alumno. Cuentas con un rol superior se dan
// de alta solo vía /admin/usuarios (ver AdminUsuariosView), autenticado
// y limitado por jerarquía — nunca por auto-registro acá.
interface RegistroInput {
  nombre: string;
  apellido: string;
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
    apellido: "",
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
    <PantallaAuth titulo="Creá tu cuenta de alumno">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(form);
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Campo id="nombre" label="Nombre" required autoComplete="given-name" value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Campo id="apellido" label="Apellido" required autoComplete="family-name" value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
        </div>
        <Campo id="email" label="Email" type="email" required autoComplete="email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Campo id="password" label="Contraseña (mínimo 8 caracteres)" type="password" required minLength={8}
          autoComplete="new-password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />

        {mutation.isError && (
          <MensajeEstado tipo="error">{extraerMensajeError(mutation.error)}</MensajeEstado>
        )}

        <Boton type="submit" cargando={mutation.isPending} className="w-full">
          Crear cuenta
        </Boton>
      </form>

      <p className="text-center text-sm text-carbon/70">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold text-carbon underline underline-offset-2">
          Ingresar
        </Link>
      </p>
    </PantallaAuth>
  );
}
