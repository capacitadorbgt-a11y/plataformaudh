import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import Link from "next/link";
import { EstadoBadge } from "@/components/Badge";
import type { Escuela } from "@/types/database";

export default async function EscuelasPage({
  searchParams,
}: {
  searchParams: { q?: string; estado?: string };
}) {
  const { profile } = await requirePermiso("escuelas");
  const supabase = createClient();

  let query = supabase.from("escuelas").select("*").order("nombre");

  if (searchParams.estado) {
    query = query.eq("estado", searchParams.estado);
  }
  if (searchParams.q) {
    query = query.or(
      `nombre.ilike.%${searchParams.q}%,ciudad.ilike.%${searchParams.q}%,provincia.ilike.%${searchParams.q}%`
    );
  }

  const { data: escuelas } = await query.returns<Escuela[]>();

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
          <label className="label">Estado</label>
          <select className="input" name="estado" defaultValue={searchParams.estado ?? ""}>
            <option value="">Todos</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="REVISION">REVISION</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">Filtrar</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-4 py-3 font-medium">Escuela</th>
              <th className="px-4 py-3 font-medium">Ciudad</th>
              <th className="px-4 py-3 font-medium">Zona</th>
              <th className="px-4 py-3 font-medium">Procesos</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {escuelas?.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/escuelas/${e.id}`} className="font-medium hover:underline">
                    {e.nombre}
                  </Link>
                  <div className="text-xs text-neutral-400">{e.provincia}</div>
                </td>
                <td className="px-4 py-3 text-neutral-600">{e.ciudad}</td>
                <td className="px-4 py-3 text-neutral-600">{e.zona}</td>
                <td className="px-4 py-3 text-neutral-600">{e.procesos_completados ?? 0}</td>
                <td className="px-4 py-3"><EstadoBadge estado={e.estado} /></td>
              </tr>
            ))}
            {escuelas?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No se encontraron escuelas con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
