import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import type { Escuela, Seguimiento } from "@/types/database";

interface SeguimientosSearchParams {
  escuela_id?: string;
  desde?: string;
  hasta?: string;
  cargo?: string;
  analista?: string;
}

export default async function SeguimientosPage({
  searchParams,
}: {
  searchParams: SeguimientosSearchParams;
}) {
  await requireUser();
  const supabase = createClient();

  const { data: escuelas } = await supabase
    .from("escuelas")
    .select("id, nombre")
    .order("nombre")
    .returns<Pick<Escuela, "id" | "nombre">[]>();

  let query = supabase
    .from("seguimientos")
    .select("*, escuelas(nombre)")
    .order("fecha_capacitacion", { ascending: false })
    .limit(200);

  if (searchParams.escuela_id) {
    query = query.eq("escuela_id", searchParams.escuela_id);
  }
  if (searchParams.desde) {
    query = query.gte("fecha_capacitacion", searchParams.desde);
  }
  if (searchParams.hasta) {
    query = query.lte("fecha_capacitacion", searchParams.hasta);
  }
  if (searchParams.cargo) {
    query = query.ilike("cargo", `%${searchParams.cargo}%`);
  }
  if (searchParams.analista) {
    query = query.ilike("analista", `%${searchParams.analista}%`);
  }

  const { data: seguimientos } = await query.returns<
    (Seguimiento & { escuelas: { nombre: string } | null })[]
  >();

  const hayFiltros =
    searchParams.escuela_id ||
    searchParams.desde ||
    searchParams.hasta ||
    searchParams.cargo ||
    searchParams.analista;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Seguimientos de reclutamiento y capacitación</h1>
          <p className="text-sm text-neutral-500">{seguimientos?.length ?? 0} registros</p>
        </div>
        <Link href="/seguimientos/nuevo" className="btn-primary">+ Nuevo seguimiento</Link>
      </div>

      <form className="card p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label className="label">Escuela</label>
          <select className="input" name="escuela_id" defaultValue={searchParams.escuela_id ?? ""}>
            <option value="">Todas</option>
            {escuelas?.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Desde</label>
          <input className="input" type="date" name="desde" defaultValue={searchParams.desde ?? ""} />
        </div>
        <div>
          <label className="label">Hasta</label>
          <input className="input" type="date" name="hasta" defaultValue={searchParams.hasta ?? ""} />
        </div>
        <div>
          <label className="label">Cargo</label>
          <input className="input" name="cargo" placeholder="ADM, PTC, POLI..." defaultValue={searchParams.cargo ?? ""} />
        </div>
        <div>
          <label className="label">Analista</label>
          <input className="input" name="analista" placeholder="Nombre del analista" defaultValue={searchParams.analista ?? ""} />
        </div>
        <div className="sm:col-span-2 lg:col-span-5 flex gap-2">
          <button type="submit" className="btn-secondary">Filtrar</button>
          {hayFiltros && (
            <Link href="/seguimientos" className="btn-secondary">Limpiar filtros</Link>
          )}
        </div>
      </form>

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
                  No se encontraron seguimientos con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
