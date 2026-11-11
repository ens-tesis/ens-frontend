"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/shared/components/Boton";
import { AppShell, PantallaCargando } from "@/shared/components/AppShell";
import { CLASE_CONTROL, CLASE_ETIQUETA, Campo } from "@/shared/components/Campo";
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

// Qué va a poder hacer cada rol: ayuda a elegir sin conocer la jerarquía.
const DESCRIPCION_ROL: Partial<Record<Rol, string>> = {
  director: "Maneja todo el colegio: cursos, usuarios, métricas y asistencia.",
  preceptor: "Arma sus cursos, carga alumnos y docentes, y sigue la asistencia.",
  docente: "Da clase en los cursos que le asignen y elige qué sitios se pueden abrir.",
};

// Sin caracteres que se confunden al dictarlos (0/O, 1/l/I).
function generarPassword(): string {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint32Array(10)), (n) => letras[n % letras.length]).join("");
}

function extraerMensajeError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    return err.response.data.message as string;
  }
  return "No se pudo crear la cuenta. Probá de nuevo.";
}

// Lo que hay que pasarle a la persona para que entre por primera vez.
function CuentaCreada({ cuenta, onOtra }: { cuenta: CrearUsuarioInput; onOtra: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const texto = `ENS · ${location.origin}\nUsuario: ${cuenta.email}\nContraseña: ${cuenta.password}`;
  return (
    <Tarjeta className="entrar max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-verde text-arena">
          <Icono nombre="asistencia" className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold text-carbon">
            {cuenta.nombre} ya tiene cuenta de {cuenta.rol}
          </h2>
          <p className="text-sm text-carbon/65">Pasale estos datos para que entre:</p>
        </div>
      </div>
      <dl className="pizarron grid gap-3 rounded-2xl p-5 font-mono text-sm text-arena sm:grid-cols-[auto_1fr]">
        <dt className="text-arena/60">Usuario</dt>
        <dd className="break-all">{cuenta.email}</dd>
        <dt className="text-arena/60">Contraseña</dt>
        <dd className="break-all">{cuenta.password}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Boton
          variante="sutil"
          onClick={() => {
            void navigator.clipboard.writeText(texto).then(() => setCopiado(true));
          }}
        >
          <Icono nombre="copiar" className="size-4" />
          {copiado ? "Copiado" : "Copiar datos"}
        </Boton>
        <Boton onClick={onOtra}>Crear otra cuenta</Boton>
      </div>
    </Tarjeta>
  );
}

// Formulario de alta: lo usan esta pantalla y las secciones "Alta de
// usuarios" de dirección y preceptoría. Solo ofrece roles inferiores al
// propio (la regla real la aplica el backend); si hay uno solo, no pregunta.
export function AltaUsuario({ rolActor }: { rolActor: Rol }) {
  const opcionesRol = rolesInferioresA(rolActor);
  const [form, setForm] = useState(FORM_VACIO);
  const [rol, setRol] = useState<Rol | "">(opcionesRol.length === 1 ? opcionesRol[0]! : "");
  const [creada, setCreada] = useState<CrearUsuarioInput | null>(null);

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: CrearUsuarioInput) =>
      api.post<CrearUsuarioResponse>("/admin/usuarios", input),
    onSuccess: (_res, input) => {
      setCreada(input);
      setForm(FORM_VACIO);
      // Las listas para asignar a cursos y la de gestión de usuarios.
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });

  if (creada) {
    return (
      <CuentaCreada
        cuenta={creada}
        onOtra={() => {
          setCreada(null);
          mutation.reset();
        }}
      />
    );
  }

  return (
    <Tarjeta className="max-w-2xl">
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!rol) return;
          mutation.mutate({ ...form, rol });
        }}
      >
        {opcionesRol.length > 1 && (
          <fieldset className="space-y-2">
            <legend className={CLASE_ETIQUETA}>¿Qué cuenta vas a crear?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {opcionesRol.map((opcion) => (
                <label
                  key={opcion}
                  className={`flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-carbon ${
                    rol === opcion ? "pizarron border-transparent text-arena" : "border-carbon/15 bg-white text-carbon hover:border-carbon/30"
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
                  <span className="font-display text-lg font-bold capitalize">{opcion}</span>
                  <span className={`text-sm ${rol === opcion ? "text-arena/75" : "text-carbon/60"}`}>
                    {DESCRIPCION_ROL[opcion]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="nombre" label="Nombre" value={form.nombre} required
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Campo id="apellido" label="Apellido" value={form.apellido}
            onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
        </div>
        <Campo id="email" label="Email (con este entra)" type="email" autoComplete="off" value={form.email} required
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <div className="space-y-1.5">
          <label htmlFor="password" className={CLASE_ETIQUETA}>
            Contraseña inicial (mínimo 8)
          </label>
          <div className="flex gap-2">
            <input
              id="password"
              type="text"
              autoComplete="off"
              minLength={8}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`${CLASE_CONTROL} min-w-0 font-mono`}
            />
            <Boton type="button" variante="sutil" onClick={() => setForm({ ...form, password: generarPassword() })} className="shrink-0">
              Generar
            </Boton>
          </div>
        </div>

        {mutation.isError && <MensajeEstado tipo="error">{extraerMensajeError(mutation.error)}</MensajeEstado>}

        <Boton type="submit" cargando={mutation.isPending} disabled={!rol} className="w-full sm:w-auto sm:self-start">
          {rol ? `Crear cuenta de ${rol}` : "Elegí qué cuenta crear"}
        </Boton>
      </form>
    </Tarjeta>
  );
}
export default function AdminUsuariosView() {
  const router = useRouter();
  const usuarioQuery = useUsuarioActual();

  useEffect(() => {
    if (usuarioQuery.data && !puedeCrearUsuarios(usuarioQuery.data.usuario.rol)) {
      router.replace("/login");
    }
  }, [usuarioQuery.data, router]);

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
      <AltaUsuario rolActor={usuario.rol} />
    </AppShell>
  );
}

