"use client";

interface PestanasProps<T extends string> {
  opciones: { id: T; etiqueta: string }[];
  activa: T;
  onCambiar: (id: T) => void;
}

export function Pestanas<T extends string>({ opciones, activa, onCambiar }: PestanasProps<T>) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-carbon/5 p-1">
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === activa}
          onClick={() => onCambiar(o.id)}
          className={`min-h-11 flex-1 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon ${
            o.id === activa ? "bg-violeta text-carbon" : "text-carbon/70 hover:bg-carbon/5"
          }`}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
