import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { updateUserRole } from "./actions";
import type { Profile } from "@/types/database";

export default async function UsuariosPage() {
  const { profile: me } = await requireAdmin();
  const supabase = createClient();

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("*")
    .order("nombre")
    .returns<Profile[]>();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Usuarios</h1>
        <p className="text-sm text-neutral-500">
          Roles de acceso al sistema. Crea las cuentas desde el panel de Supabase (Authentication)
          y luego asigna aquí el rol correspondiente.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Cambiar rol</th>
            </tr>
          </thead>
          <tbody>
            {usuarios?.map((u) => (
              <tr key={u.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-medium">
                  {u.nombre} {u.id === me.id && <span className="text-xs text-neutral-400">(tú)</span>}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {u.role === "admin_udh" ? "Admin UDH" : "Analista"}
                </td>
                <td className="px-4 py-3">
                  <form action={updateUserRole.bind(null, u.id)} className="flex gap-2">
                    <select className="input" name="role" defaultValue={u.role}>
                      <option value="admin_udh">Admin UDH</option>
                      <option value="analista">Analista</option>
                    </select>
                    <button type="submit" className="btn-secondary text-xs">Guardar</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
