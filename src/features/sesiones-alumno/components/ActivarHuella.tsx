"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fueCancelado, registrarHuella, tieneSensorPropio } from "@/features/auth";
import { api } from "@/shared/api/client";
import { Boton } from "@/shared/components/Boton";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { Tarjeta } from "@/shared/components/Tarjeta";
import { mensajeDeError } from "@/shared/lib/errores";

// Invitación a registrar la huella (Anexo B.2). Una vez activada, ese
// alumno ya no entra con contraseña: así nadie puede entrar por él con su
// clave prestada.
export function ActivarHuella() {
  const queryClient = useQueryClient();
  // Solo se invita si este dispositivo tiene sensor o bloqueo de pantalla propio.
  const sensor = useQuery({ queryKey: ["webauthn", "sensor"], queryFn: tieneSensorPropio, staleTime: Infinity });
  const soporta = sensor.data === true;
  const estado = useQuery({
    queryKey: ["webauthn", "estado"],
    queryFn: () => api.get<{ tienePasskey: boolean }>("/auth/webauthn/estado").then((r) => r.data),
    enabled: soporta,
  });
  const registrar = useMutation({
    mutationFn: registrarHuella,
    onSuccess: () => queryClient.setQueryData(["webauthn", "estado"], { tienePasskey: true }),
  });

  if (!soporta || !estado.data) return null;
  if (estado.data.tienePasskey) {
    return registrar.isSuccess ? (
      <MensajeEstado tipo="exito">
        Listo: la próxima vez entrá con &quot;Entrar con huella&quot;. Tu contraseña ya no sirve para entrar.
      </MensajeEstado>
    ) : null;
  }

  return (
    <Tarjeta className="max-w-md space-y-3">
      <p className="font-semibold text-carbon">Entrá con tu huella</p>
      <p className="text-sm text-carbon/70">
        Activalo una vez en este celular (huella, rostro o el bloqueo de pantalla) y después entrás sin
        contraseña. Queda atado a este celular: nadie más va a poder entrar como vos.
      </p>
      {registrar.isError && !fueCancelado(registrar.error) && (
        <MensajeEstado tipo="error">{mensajeDeError(registrar.error, "No se pudo activar. Probá de nuevo.")}</MensajeEstado>
      )}
      <Boton variante="sutil" cargando={registrar.isPending} onClick={() => registrar.mutate()}>
        Activar huella
      </Boton>
    </Tarjeta>
  );
}
