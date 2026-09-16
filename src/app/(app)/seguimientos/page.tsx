import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import Link from "next/link";
import type { Escuela, Seguimiento } from "@/types/database";
import SeguimientosTable from "@/components/SeguimientosTable";

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
  await requirePermiso("seguimientos");
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

      <SeguimientosTable seguimientos={seguimientos ?? []} />
    </div>
  );
}
