"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/shared/api/client";
import { clearToken, getToken, type Usuario } from "@/features/auth";

interface MeResponse {
  usuario: Usuario;
}

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  const query = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/auth/me").then((res) => res.data),
    enabled: Boolean(getToken()),
    retry: false,
  });

  useEffect(() => {
    if (query.isError) {
      clearToken();
      router.replace("/login");
    }
  }, [query.isError, router]);

  if (query.isPending) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Cargando...</p>
      </div>
    );
  }

  if (!query.data) {
    return null;
  }

  const { usuario } = query.data;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
          Bienvenido, {usuario.nombre}
        </h1>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-600 dark:text-zinc-400">Email</dt>
            <dd className="text-zinc-950 dark:text-zinc-50">{usuario.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-600 dark:text-zinc-400">Rol</dt>
            <dd className="text-zinc-950 dark:text-zinc-50">{usuario.rol}</dd>
          </div>
        </dl>
        <button
          onClick={() => {
            clearToken();
            router.replace("/login");
          }}
          className="w-full rounded-full border border-black/[.08] px-5 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
