"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useGuardRol } from "@/features/auth";
import { FiltroPeriodo, type Periodo } from "@/features/reportes";
import { api } from "@/shared/api/client";
import { AppShell, PantallaCargando } from "@/shared/components/AppShell";
import { Badge } from "@/shared/components/Badge";
import { Boton } from "@/shared/components/Boton";
import { Campo } from "@/shared/components/Campo";
import { MensajeEstado } from "@/shared/components/MensajeEstado";
import { CLASE_FILA, Tarjeta } from "@/shared/components/Tarjeta";
import { mensajeDeError } from "@/shared/lib/errores";

interface Director {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  debeCambiarPassword: boolean;
}

interface Colegio {
  id: number;
  nombre: string;
  createdAt: string;
  directores: Director[];
  preceptores: number;
  docentes: number;
  alumnos: number;
  cursos: number;
  clases: number;
  alumnosEnClase: number;
  distracciones: number;
  ausenciasDigitales: number;
}

const PERSONA_VACIA = { nombre: "", apellido: "", email: "", password: "" };

const METRICAS: [keyof Colegio, string][] = [
  ["preceptores", "Preceptores"],
  ["docentes", "Docentes"],
  ["alumnos", "Alumnos"],
  ["cursos", "Cursos"],
  ["clases", "Clases"],
  ["alumnosEnClase", "Alumnos en clase"],
  ["distracciones", "Distracciones"],
  ["ausenciasDigitales", "Ausencias digitales"],
];

// Datos de un director: el mismo formulario sirve para el colegio nuevo y
// para agregar otro director a uno existente.
function CamposDirector({
  prefijo,
  valor,
  onChange,
}: {
  prefijo: string;
  valor: typeof PERSONA_VACIA;
  onChange: (v: typeof PERSONA_VACIA) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Campo id={`${prefijo}-nombre`} label="Nombre del director" required value={valor.nombre}
        onChange={(e) => onChange({ ...valor, nombre: e.target.value })} />
      <Campo id={`${prefijo}-apellido`} label="Apellido" value={valor.apellido}
        onChange={(e) => onChange({ ...valor, apellido: e.target.value })} />
      <Campo id={`${prefijo}-email`} label="Email" type="email" required autoComplete="off" value={valor.email}
        onChange={(e) => onChange({ ...valor, email: e.target.value })} />
      <Campo id={`${prefijo}-password`} label="Contraseña provisoria (mín. 8)" type="text" required minLength={8}
        autoComplete="off" value={valor.password} onChange={(e) => onChange({ ...valor, password: e.target.value })} />
    </div>
  );
}

function NuevoColegio() {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [director, setDirector] = useState(PERSONA_VACIA);
  const [creado, setCreado] = useState<string | null>(null);

  const crear = useMutation({
    mutationFn: () => api.post("/instituciones", { nombre, director }),
    onSuccess: () => {
      setCreado(`${nombre} creado. ${director.email} entra con la contraseña provisoria y la cambia al ingresar.`);
      setNombre("");
      setDirector(PERSONA_VACIA);
      void queryClient.invalidateQueries({ queryKey: ["colegios"] });
    },
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    setCreado(null);
    crear.mutate();
  }

  return (
    <Tarjeta>
      <form onSubmit={enviar} className="space-y-4">
        <h2 className="font-display text-xl font-bold text-carbon">Nuevo colegio</h2>
        <Campo id="colegio-nombre" label="Nombre del colegio" required value={nombre}
          onChange={(e) => setNombre(e.target.value)} />
        <CamposDirector prefijo="colegio-director" valor={director} onChange={setDirector} />
        {crear.isError && (
          <MensajeEstado tipo="error">{mensajeDeError(crear.error, "No se pudo crear el colegio.")}</MensajeEstado>
        )}
        {creado && <MensajeEstado tipo="exito">{creado}</MensajeEstado>}
        <Boton type="submit" cargando={crear.isPending}>
          Crear colegio y director
        </Boton>
      </form>
    </Tarjeta>
  );
}

function FilaDirector({ director }: { director: Director }) {
  const queryClient = useQueryClient();
  const cambiar = useMutation({
    mutationFn: () => api.patch(`/admin/usuarios/${director.id}`, { activo: !director.activo }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["colegios"] }),
  });
  return (
    <li className={`${CLASE_FILA} flex flex-wrap items-center gap-2 bg-white p-3`}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-carbon">
          {director.nombre} {director.apellido}
        </span>
        <span className="block truncate text-xs text-carbon/60">{director.email}</span>
      </span>
      {!director.activo ? (
        <Badge variante="gris">Desactivado</Badge>
      ) : director.debeCambiarPassword ? (
        <Badge variante="amarillo">Todavía no entró</Badge>
      ) : (
        <Badge variante="verde">Activo</Badge>
      )}
      <Boton variante="sutil" cargando={cambiar.isPending} onClick={() => cambiar.mutate()}>
        {director.activo ? "Desactivar" : "Activar"}
      </Boton>
      {cambiar.isError && (
        <MensajeEstado tipo="error">{mensajeDeError(cambiar.error, "No se pudo cambiar.")}</MensajeEstado>
      )}
    </li>
  );
}

function AgregarDirector({ colegioId, onListo }: { colegioId: number; onListo: () => void }) {
  const queryClient = useQueryClient();
  const [director, setDirector] = useState(PERSONA_VACIA);
  const agregar = useMutation({
    mutationFn: () => api.post("/admin/usuarios", { ...director, rol: "director", institucionId: colegioId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["colegios"] });
      onListo();
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        agregar.mutate();
      }}
      className="space-y-3 rounded-2xl bg-papel p-4"
    >
      <CamposDirector prefijo={`director-${colegioId}`} valor={director} onChange={setDirector} />
      {agregar.isError && (
        <MensajeEstado tipo="error">{mensajeDeError(agregar.error, "No se pudo agregar el director.")}</MensajeEstado>
      )}
      <div className="flex gap-2">
        <Boton type="submit" cargando={agregar.isPending}>
          Agregar director
        </Boton>
        <Boton type="button" variante="sutil" onClick={onListo}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}

// Irreversible: borra el colegio con todos sus usuarios, cursos y clases.
// Se confirma escribiendo el nombre (el backend lo vuelve a chequear).
function EliminarColegio({ colegio, onCancelar }: { colegio: Colegio; onCancelar: () => void }) {
  const queryClient = useQueryClient();
  const [confirmacion, setConfirmacion] = useState("");
  const eliminar = useMutation({
    mutationFn: () => api.delete(`/instituciones/${colegio.id}`, { data: { nombre: confirmacion } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["colegios"] }),
  });
  const total = colegio.alumnos + colegio.docentes + colegio.preceptores + colegio.directores.length;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        eliminar.mutate();
      }}
      className="space-y-3 rounded-2xl border border-error/30 bg-error/10 p-4"
    >
      <p className="text-sm text-carbon">
        Se borran para siempre {total} usuarios, {colegio.cursos} cursos y {colegio.clases} clases con toda su
        asistencia. No se puede deshacer. Escribí <span className="font-semibold">{colegio.nombre}</span> para
        confirmar.
      </p>
      <Campo id={`eliminar-${colegio.id}`} label="Nombre del colegio" autoComplete="off" value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)} />
      {eliminar.isError && (
        <MensajeEstado tipo="error">{mensajeDeError(eliminar.error, "No se pudo eliminar el colegio.")}</MensajeEstado>
      )}
      <div className="flex gap-2">
        <Boton
          type="submit"
          cargando={eliminar.isPending}
          disabled={confirmacion.trim() !== colegio.nombre}
          className="bg-error text-arena hover:bg-error/90"
        >
          Eliminar definitivamente
        </Boton>
        <Boton type="button" variante="sutil" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}

function TarjetaColegio({ colegio }: { colegio: Colegio }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [agregando, setAgregando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const entrar = useMutation({
    mutationFn: () => api.post(`/instituciones/${colegio.id}/entrar`),
    onSuccess: () => {
      // Lo cacheado (cursos, usuarios...) era de otro colegio.
      queryClient.clear();
      router.push("/director");
    },
  });
  return (
    <Tarjeta className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-carbon">{colegio.nombre}</h2>
          <p className="text-xs text-carbon/60">
            Creado el {new Date(colegio.createdAt).toLocaleDateString("es-AR")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Boton cargando={entrar.isPending} onClick={() => entrar.mutate()}>
            Entrar al colegio
          </Boton>
          <Boton variante="sutil" onClick={() => setEliminando(true)}>
            Eliminar
          </Boton>
        </div>
      </div>
      {entrar.isError && (
        <MensajeEstado tipo="error">{mensajeDeError(entrar.error, "No se pudo entrar al colegio.")}</MensajeEstado>
      )}
      {eliminando && <EliminarColegio colegio={colegio} onCancelar={() => setEliminando(false)} />}
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {METRICAS.map(([k, etiqueta]) => (
          <div key={k} className="rounded-2xl bg-papel px-3 py-2">
            <dt className="text-xs text-carbon/60">{etiqueta}</dt>
            <dd className="font-display text-2xl font-bold text-carbon tabular-nums">{String(colegio[k])}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-carbon">Dirección</p>
        {colegio.directores.length === 0 ? (
          <MensajeEstado tipo="vacio">Sin director. Agregá uno para que el colegio pueda empezar.</MensajeEstado>
        ) : (
          <ul className="space-y-2">
            {colegio.directores.map((d) => (
              <FilaDirector key={d.id} director={d} />
            ))}
          </ul>
        )}
        {agregando ? (
          <AgregarDirector colegioId={colegio.id} onListo={() => setAgregando(false)} />
        ) : (
          <Boton variante="sutil" onClick={() => setAgregando(true)}>
            Agregar otro director
          </Boton>
        )}
      </div>
    </Tarjeta>
  );
}

// Pantalla del admin de la plataforma: no pertenece a ningún colegio; los
// crea, les pone director y ve cuánto se usa el ENS en cada uno.
export default function ColegiosView() {
  const { cargando, usuario } = useGuardRol(["admin"]);
  const [periodo, setPeriodo] = useState<Periodo>({ desde: "", hasta: "" });
  const colegios = useQuery({
    queryKey: ["colegios", periodo],
    queryFn: () =>
      api
        .get<{ colegios: Colegio[] }>("/instituciones", {
          params: {
            ...(periodo.desde && { desde: periodo.desde }),
            ...(periodo.hasta && { hasta: periodo.hasta }),
          },
        })
        .then((r) => r.data.colegios),
    enabled: Boolean(usuario),
  });

  if (cargando) return <PantallaCargando />;
  if (!usuario) return null;

  return (
    <AppShell
      area="Administración"
      usuario={usuario}
      secciones={[]}
      titulo="Colegios"
      descripcion="Creá colegios con su director y mirá cuánto se usa el ENS en cada uno."
    >
      <div className="space-y-4">
        <NuevoColegio />
        <Tarjeta className="space-y-2">
          <p className="text-sm text-carbon/70">Período de las métricas de clases (vacío = desde siempre)</p>
          <FiltroPeriodo valor={periodo} onChange={setPeriodo} />
        </Tarjeta>
        {colegios.isPending ? (
          <MensajeEstado tipo="cargando">Cargando colegios...</MensajeEstado>
        ) : colegios.isError ? (
          <MensajeEstado tipo="error">No se pudieron cargar los colegios.</MensajeEstado>
        ) : (
          colegios.data.map((c) => <TarjetaColegio key={c.id} colegio={c} />)
        )}
      </div>
    </AppShell>
  );
}
