import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import type { Entrega, Escuela } from "@/types/database";
import Link from "next/link";

interface EntregasSearchParams {
  escuela_id?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
}

export default async function EntregasPage({
  searchParams,
}: {
  searchParams: EntregasSearchParams;
}) {
  await requirePermiso("entregas");
  const supabase = createClient();

  const { data: escuelas } = await supabase
    .from("escuelas")
    .select("id, nombre")
    .order("nombre")
    .returns<Pick<Escuela, "id" | "nombre">[]>();

  let query = supabase
    .from("entregas")
    .select("*, escuelas(id, nombre)")
    .order("fecha", { ascending: false })
    .limit(300);

  if (searchParams.escuela_id) {
    query = query.eq("escuela_id", searchParams.escuela_id);
  }
  if (searchParams.tipo) {
    query = query.eq("tipo", searchParams.tipo);
  }
  if (searchParams.desde) {
    query = query.gte("fecha", searchParams.desde);
  }
  if (searchParams.hasta) {
    query = query.lte("fecha", searchParams.hasta);
  }

  const { data: entregas } = await query.returns<
    (Entrega & { escuelas: { id: string; nombre: string } | null })[]
  >();

  const hayFiltros =
    searchParams.escuela_id || searchParams.tipo || searchParams.desde || searchParams.hasta;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Recompensas y material entregado</h1>
        <p className="text-sm text-neutral-500">
          Registro nacional de camisetas, entradas de cine, cheques y otros materiales
        </p>
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
          <label className="label">Tipo</label>
          <select className="input" name="tipo" defaultValue={searchParams.tipo ?? ""}>
            <option value="">Todos</option>
            <option value="CAMISETA">CAMISETA</option>
            <option value="ENTRADA_CINE">ENTRADA CINE</option>
            <option value="CHEQUE">CHEQUE</option>
            <option value="OTRO">OTRO</option>
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
        <div className="flex gap-2">
          <button type="submit" className="btn-secondary">Filtrar</button>
          {hayFiltros && (
            <Link href="/entregas" className="btn-secondary">Limpiar</Link>
          )}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-4 py-3 font-medium">Escuela</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Cantidad</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {entregas?.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium">
                  {e.escuelas ? (
                    <Link href={`/escuelas/${e.escuelas.id}`} className="hover:underline">
                      {e.escuelas.nombre}
                    </Link>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-neutral-600">{e.tipo}</td>
                <td className="px-4 py-3 text-neutral-600">{e.cantidad ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{e.detalle ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{e.fecha ?? "—"}</td>
              </tr>
            ))}
            {entregas?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No se encontraron entregas con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
