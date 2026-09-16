import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { AuditLogEntry, Profile } from "@/types/database";

interface AuditoriaSearchParams {
  user_id?: string;
  accion?: string;
  desde?: string;
  hasta?: string;
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: AuditoriaSearchParams;
}) {
  await requireAdmin();
  const supabase = createClient();

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, nombre")
    .order("nombre")
    .returns<Pick<Profile, "id" | "nombre">[]>();

  let query = supabase
    .from("audit_log")
    .select("*, profiles(nombre)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (searchParams.user_id) {
    query = query.eq("user_id", searchParams.user_id);
  }
  if (searchParams.accion) {
    query = query.eq("accion", searchParams.accion);
  }
  if (searchParams.desde) {
    query = query.gte("created_at", `${searchParams.desde}T00:00:00`);
  }
  if (searchParams.hasta) {
    query = query.lte("created_at", `${searchParams.hasta}T23:59:59`);
  }

  const { data: registros } = await query.returns<
    (AuditLogEntry & { profiles: { nombre: string } | null })[]
  >();

  const ACCIONES = [
    "iniciar_sesion",
    "cerrar_sesion",
    "crear_escuela",
    "editar_escuela",
    "crear_colaborador",
    "editar_colaborador",
    "eliminar_colaborador",
    "registrar_entrega",
    "subir_informe",
    "eliminar_informe",
    "crear_seguimiento",
    "editar_seguimiento",
    "editar_entrega",
    "crear_encuesta",
    "editar_encuesta",
    "eliminar_encuesta",
    "crear_usuario",
    "cambiar_rol",
    "cambiar_permisos",
    "activar_usuario",
    "desactivar_usuario",
  ];

  const hayFiltros =
    searchParams.user_id || searchParams.accion || searchParams.desde || searchParams.hasta;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Auditoría</h1>
        <p className="text-sm text-neutral-500">
          {registros?.length ?? 0} eventos registrados · qué hizo cada usuario y cuándo
        </p>
      </div>

      <form className="card p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label className="label">Usuario</label>
          <select className="input" name="user_id" defaultValue={searchParams.user_id ?? ""}>
            <option value="">Todos</option>
            {usuarios?.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Acción</label>
          <select className="input" name="accion" defaultValue={searchParams.accion ?? ""}>
            <option value="">Todas</option>
            {ACCIONES.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
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
        <div className="flex gap-2">
          <button type="submit" className="btn-secondary">Filtrar</button>
          {hayFiltros && <a href="/auditoria" className="btn-secondary">Limpiar</a>}
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-4 py-3 font-medium">Fecha y hora</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Acción</th>
              <th className="px-4 py-3 font-medium">Entidad</th>
              <th className="px-4 py-3 font-medium">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {registros?.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("es-EC")}
                </td>
                <td className="px-4 py-3 font-medium">{r.profiles?.nombre ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{r.accion.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-neutral-600">{r.entidad ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-600">{r.detalle ?? "—"}</td>
              </tr>
            ))}
            {registros?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No hay eventos con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
