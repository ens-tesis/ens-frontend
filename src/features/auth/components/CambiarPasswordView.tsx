"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/shared/api/client";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { mensajeDeError } from "@/shared/lib/errores";
import { useUsuarioActual } from "../hooks/useUsuarioActual";
import { rutaPorRol } from "../lib/rutaPorRol";
import { setToken, type Usuario } from "../lib/session";
import { PantallaAuth } from "./PantallaAuth";

interface CambiarPasswordResponse {
  token: string;
  usuario: Usuario;
}

export default function CambiarPasswordView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const usuarioQuery = useUsuarioActual();
  const [form, setForm] = useState({ passwordActual: "", passwordNueva: "", repetir: "" });
  const noCoinciden = form.repetir !== "" && form.passwordNueva !== form.repetir;

  const mutation = useMutation({
    mutationFn: () =>
      api.post<CambiarPasswordResponse>("/auth/cambiar-password", {
        passwordActual: form.passwordActual,
        passwordNueva: form.passwordNueva,
      }),
    onSuccess: (res) => {
      // El token viejo traía la marca de "debe cambiarla": hay que reemplazarlo.
      setToken(res.data.token);
      queryClient.setQueryData(["me"], { usuario: res.data.usuario });
      router.replace(rutaPorRol(res.data.usuario.rol));
    },
  });

  const obligatorio = usuarioQuery.data?.usuario.debeCambiarPassword;

  return (
    <PantallaAuth titulo="Elegí tu contraseña">
      {obligatorio && (
        <p className="text-sm text-carbon/70">
          Es tu primer ingreso: reemplazá la contraseña que te dio la escuela por una propia.
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!noCoinciden) mutation.mutate();
        }}
      >
        <Campo
          id="password-actual"
          label="Contraseña actual"
          type="password"
          autoComplete="current-password"
          required
          value={form.passwordActual}
          onChange={(e) => setForm({ ...form, passwordActual: e.target.value })}
        />
        <Campo
          id="password-nueva"
          label="Nueva contraseña (mínimo 8 caracteres)"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.passwordNueva}
          onChange={(e) => setForm({ ...form, passwordNueva: e.target.value })}
        />
        <Campo
          id="password-repetir"
          label="Repetí la nueva contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={form.repetir}
          aria-invalid={noCoinciden}
          onChange={(e) => setForm({ ...form, repetir: e.target.value })}
        />

        {noCoinciden && <MensajeEstado tipo="error">Las contraseñas no coinciden.</MensajeEstado>}
        {mutation.isError && (
          <MensajeEstado tipo="error">
            {mensajeDeError(mutation.error, "No se pudo cambiar la contraseña. Intentá de nuevo.")}
          </MensajeEstado>
        )}

        <Boton type="submit" cargando={mutation.isPending} disabled={noCoinciden} className="w-full">
          Guardar contraseña
        </Boton>
      </form>
    </PantallaAuth>
  );
}
