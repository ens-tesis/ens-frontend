"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/shared/api/client";
import { CLASE_CONTROL } from "@/shared/components/Campo";
import { mensajeDeError } from "@/shared/lib/errores";

const CLASE_BOTON =
  "min-h-11 shrink-0 rounded-xl border border-carbon/15 px-3 text-sm font-semibold text-carbon hover:border-carbon/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon disabled:opacity-50";

// Fácil de dictar en el aula: "ens" + 5 cifras.
function sugerida(): string {
  return `ens${String(Math.floor(10000 + Math.random() * 90000))}`;
}

// Alguien se olvidó la contraseña: se le pone una provisoria que se le
// dicta en el momento. Al entrar la tiene que cambiar, y si estaba
// bloqueado por intentos fallidos queda desbloqueado.
export function RestablecerPassword({ usuarioId, nombre }: { usuarioId: number; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [password, setPassword] = useState("");
  const restablecer = useMutation({
    mutationFn: () => api.post(`/admin/usuarios/${usuarioId}/password`, { password }),
  });

  if (restablecer.isSuccess) {
    return (
      <p role="status" className="text-xs text-carbon/80">
        Contraseña provisoria: <strong className="font-mono text-sm text-carbon">{password}</strong>. Al entrar la tiene
        que cambiar.
      </p>
    );
  }
  if (!abierto) {
    return (
      <button
        type="button"
        className={CLASE_BOTON}
        onClick={() => {
          setPassword(sugerida());
          setAbierto(true);
        }}
      >
        Nueva contraseña
      </button>
    );
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        restablecer.mutate();
      }}
    >
      <label className="sr-only" htmlFor={`password-${usuarioId}`}>
        Contraseña provisoria para {nombre}
      </label>
      <input
        id={`password-${usuarioId}`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
        autoComplete="off"
        className={`${CLASE_CONTROL} min-h-11 w-36 font-mono`}
      />
      <button type="submit" className={CLASE_BOTON} disabled={restablecer.isPending || password.length < 8}>
        {restablecer.isPending ? "Guardando..." : "Guardar"}
      </button>
      <button type="button" className={CLASE_BOTON} onClick={() => setAbierto(false)}>
        Cancelar
      </button>
      {restablecer.isError && (
        <p role="alert" className="w-full text-xs font-medium text-error">
          {mensajeDeError(restablecer.error, "No se pudo cambiar la contraseña.")}
        </p>
      )}
    </form>
  );
}
