import { Icono } from "./Icono";

// "← Volver" de una vista de detalle a su lista.
export function Volver({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-carbon/70 hover:text-carbon focus-visible:outline focus-visible:outline-2 focus-visible:outline-carbon"
    >
      <Icono nombre="volver" className="size-4" />
      {children}
    </button>
  );
}
