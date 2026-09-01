import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/StatCard";
import { EstadoBadge } from "@/components/Badge";
import Link from "next/link";
import type { Escuela } from "@/types/database";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: escuelas }, { count: seguimientosCount }, { count: entregasCount }] =
    await Promise.all([
      supabase.from("escuelas").select("*").returns<Escuela[]>(),
      supabase.from("seguimientos").select("*", { count: "exact", head: true }),
      supabase.from("entregas").select("*", { count: "exact", head: true }),
    ]);

  const total = escuelas?.length ?? 0;
  const activas = escuelas?.filter((e) => e.estado === "ACTIVO").length ?? 0;
  const inactivas = escuelas?.filter((e) => e.estado === "INACTIVO").length ?? 0;
  const revision = escuelas?.filter((e) => e.estado === "REVISION").length ?? 0;

  const zonas = new Map<string, number>();
  for (const e of escuelas ?? []) {
    if (!e.zona) continue;
    zonas.set(e.zona, (zonas.get(e.zona) ?? 0) + 1);
  }

  const recientes = [...(escuelas ?? [])]
    .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Panel general</h1>
        <p className="text-sm text-neutral-500">
          Estado nacional de las escuelas de formación
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Escuelas totales" value={total} />
        <StatCard label="Activas" value={activas} />
        <StatCard label="En revisión" value={revision} />
        <StatCard label="Inactivas" value={inactivas} />
        <StatCard label="Seguimientos registrados" value={seguimientosCount ?? 0} />
        <StatCard label="Entregas registradas" value={entregasCount ?? 0} />
        <StatCard label="Zonas cubiertas" value={zonas.size} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Escuelas por zona</h2>
          <div className="space-y-2">
            {[...zonas.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([zona, n]) => (
                <div key={zona} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-600">{zona}</span>
                  <span className="font-medium">{n}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Actualizadas recientemente</h2>
            <Link href="/escuelas" className="text-xs text-udh-600 hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="space-y-3">
            {recientes.map((e) => (
              <Link
                key={e.id}
                href={`/escuelas/${e.id}`}
                className="flex items-center justify-between text-sm hover:bg-neutral-50 -mx-2 px-2 py-1 rounded-lg"
              >
                <div>
                  <div className="font-medium">{e.nombre}</div>
                  <div className="text-xs text-neutral-400">{e.ciudad}</div>
                </div>
                <EstadoBadge estado={e.estado} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
