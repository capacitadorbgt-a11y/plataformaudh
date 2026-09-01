import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import type { Seguimiento } from "@/types/database";

export default async function SeguimientosPage() {
  await requireUser();
  const supabase = createClient();

  const { data: seguimientos } = await supabase
    .from("seguimientos")
    .select("*, escuelas(nombre)")
    .order("fecha_capacitacion", { ascending: false })
    .limit(100)
    .returns<(Seguimiento & { escuelas: { nombre: string } | null })[]>();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Seguimientos de reclutamiento y capacitación</h1>
          <p className="text-sm text-neutral-500">{seguimientos?.length ?? 0} registros recientes</p>
        </div>
        <Link href="/seguimientos/nuevo" className="btn-primary">+ Nuevo seguimiento</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-4 py-3 font-medium">Escuela</th>
              <th className="px-4 py-3 font-medium">Fecha capacitación</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium">Aspirantes</th>
              <th className="px-4 py-3 font-medium">Aprobado</th>
              <th className="px-4 py-3 font-medium">PDV solicitud</th>
              <th className="px-4 py-3 font-medium">Analista</th>
            </tr>
          </thead>
          <tbody>
            {seguimientos?.map((s) => (
              <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium">
                  {s.escuelas?.nombre ?? s.escuela_nombre_libre ?? "—"}
                </td>
                <td className="px-4 py-3 text-neutral-600">{s.fecha_capacitacion ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{s.cargo ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{s.num_aspirantes ?? 0}</td>
                <td className="px-4 py-3 text-neutral-600">{s.aspirante_aprobado ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{s.pdv_solicitud ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{s.analista ?? "—"}</td>
              </tr>
            ))}
            {seguimientos?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  Aún no hay seguimientos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
