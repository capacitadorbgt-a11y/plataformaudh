import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import Link from "next/link";
import EscuelasTable from "@/components/EscuelasTable";
import type { Escuela } from "@/types/database";

export default async function EscuelasPage({
  searchParams,
}: {
  searchParams: { q?: string; estado?: string; ciudad?: string };
}) {
  const { profile } = await requirePermiso("escuelas");
  const supabase = createClient();

  const { data: todas } = await supabase
    .from("escuelas")
    .select("ciudad")
    .returns<{ ciudad: string | null }[]>();

  const ciudades = [...new Set((todas ?? []).map((e) => e.ciudad).filter((c): c is string => !!c))].sort();

  let query = supabase.from("escuelas").select("*").order("nombre");

  if (searchParams.estado) {
    query = query.eq("estado", searchParams.estado);
  }
  if (searchParams.ciudad) {
    query = query.eq("ciudad", searchParams.ciudad);
  }
  if (searchParams.q) {
    query = query.or(
      `nombre.ilike.%${searchParams.q}%,ciudad.ilike.%${searchParams.q}%,provincia.ilike.%${searchParams.q}%`
    );
  }

  const { data: escuelas } = await query.returns<Escuela[]>();

  const { data: seguimientos2026 } = await supabase
    .from("seguimientos")
    .select("escuela_id")
    .gte("fecha_capacitacion", "2026-01-01")
    .lte("fecha_capacitacion", "2026-12-31")
    .not("escuela_id", "is", null)
    .returns<{ escuela_id: string }[]>();

  const procesosPorEscuela = new Map<string, number>();
  for (const s of seguimientos2026 ?? []) {
    procesosPorEscuela.set(s.escuela_id, (procesosPorEscuela.get(s.escuela_id) ?? 0) + 1);
  }

  const escuelasConProcesos = (escuelas ?? []).map((e) => ({
    ...e,
    procesos2026: procesosPorEscuela.get(e.id) ?? 0,
  }));

  const hayFiltros = searchParams.q || searchParams.estado || searchParams.ciudad;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Escuelas de formación</h1>
          <p className="text-sm text-neutral-500">{escuelas?.length ?? 0} registradas</p>
        </div>
        {profile.role === "admin_udh" && (
          <Link href="/escuelas/nueva" className="btn-primary">
            + Nueva escuela
          </Link>
        )}
      </div>

      <form className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Buscar</label>
          <input
            className="input"
            name="q"
            placeholder="Nombre, ciudad o provincia"
            defaultValue={searchParams.q}
          />
        </div>
        <div>
          <label className="label">Ciudad</label>
          <select className="input" name="ciudad" defaultValue={searchParams.ciudad ?? ""}>
            <option value="">Todas</option>
            {ciudades.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" name="estado" defaultValue={searchParams.estado ?? ""}>
            <option value="">Todos</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="REVISION">REVISION</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-secondary">Filtrar</button>
          {hayFiltros && (
            <Link href="/escuelas" className="btn-secondary">Limpiar</Link>
          )}
        </div>
      </form>

      <EscuelasTable escuelas={escuelasConProcesos} />
    </div>
  );
}
