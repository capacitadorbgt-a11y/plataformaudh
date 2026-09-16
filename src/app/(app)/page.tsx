import { createClient } from "@/lib/supabase/server";
import { requireUser, tienePermiso } from "@/lib/auth";
import StatCard from "@/components/StatCard";
import { EstadoBadge } from "@/components/Badge";
import Link from "next/link";
import type { Escuela, Seguimiento } from "@/types/database";

function formatFechaCorta(fecha: string) {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}.${mes}.${anio}`;
}

function aFechaISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

type SeguimientoPermanencia = Pick<
  Seguimiento,
  "id" | "pdv_solicitud" | "fecha_ingreso" | "aspirante_aprobado"
> & { escuelas: { nombre: string } | null };

// Aspirantes con proceso finalizado cuya fecha de ingreso cae entre 3 y 6
// meses atras de hoy (ventana de seguimiento de permanencia en el PDV).
async function cargarSeguimientosPermanencia(
  supabase: ReturnType<typeof createClient>
): Promise<SeguimientoPermanencia[]> {
  const hoy = new Date();
  const hace3Meses = new Date(hoy);
  hace3Meses.setMonth(hoy.getMonth() - 3);
  const hace6Meses = new Date(hoy);
  hace6Meses.setMonth(hoy.getMonth() - 6);

  const { data } = await supabase
    .from("seguimientos")
    .select("id, pdv_solicitud, fecha_ingreso, aspirante_aprobado, escuelas(nombre)")
    .eq("estado_proceso", "FINALIZADO")
    .not("aspirante_aprobado", "is", null)
    .not("fecha_ingreso", "is", null)
    .gte("fecha_ingreso", aFechaISO(hace6Meses))
    .lte("fecha_ingreso", aFechaISO(hace3Meses))
    .order("fecha_ingreso", { ascending: true })
    .returns<SeguimientoPermanencia[]>();

  return data ?? [];
}

export default async function DashboardPage() {
  const { profile } = await requireUser();
  const supabase = createClient();

  const puedeVerSeguimientos = tienePermiso(profile, "seguimientos");

  const [{ data: escuelas }, { count: seguimientosCount }, { count: entregasCount }, permanencia] =
    await Promise.all([
      supabase.from("escuelas").select("*").returns<Escuela[]>(),
      supabase.from("seguimientos").select("*", { count: "exact", head: true }),
      supabase.from("entregas").select("*", { count: "exact", head: true }),
      puedeVerSeguimientos ? cargarSeguimientosPermanencia(supabase) : Promise.resolve([]),
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

      {puedeVerSeguimientos && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold">Seguimiento de permanencia (3 a 6 meses)</h2>
          </div>
          <p className="text-xs text-neutral-400 mb-3">
            Aspirantes aprobados con proceso finalizado cuya fecha de ingreso cumplió entre 3 y 6
            meses.
          </p>
          <div className="divide-y divide-neutral-100">
            {permanencia.map((s) => (
              <Link
                key={s.id}
                href={`/seguimientos/${s.id}/editar`}
                className="flex items-center justify-between py-3 hover:bg-neutral-50 -mx-2 px-2 rounded-lg"
              >
                <div>
                  <div className="text-udh-600 font-medium">{s.pdv_solicitud || "—"}</div>
                  <div className="text-xs text-neutral-400">
                    {s.aspirante_aprobado} · {s.escuelas?.nombre ?? "—"}
                  </div>
                </div>
                <div className="text-lg font-semibold text-neutral-800">
                  {s.fecha_ingreso ? formatFechaCorta(s.fecha_ingreso) : "—"}
                </div>
              </Link>
            ))}
            {permanencia.length === 0 && (
              <p className="text-sm text-neutral-400 py-3">
                No hay aspirantes en esta ventana de seguimiento por ahora.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
