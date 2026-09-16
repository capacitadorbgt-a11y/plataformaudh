import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import Link from "next/link";
import UsuarioCreateForm from "@/components/UsuarioCreateForm";
import UsuarioRow from "@/components/UsuarioRow";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Usuarios</h1>
          <p className="text-sm text-neutral-500">
            Roles, permisos por herramienta y acceso al sistema.
          </p>
        </div>
        <Link href="/auditoria" className="btn-secondary">Ver auditoría</Link>
      </div>

      <UsuarioCreateForm />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Acceso a herramientas</th>
              <th className="px-4 py-3 font-medium">Cuenta</th>
            </tr>
          </thead>
          <tbody>
            {usuarios?.map((u) => (
              <UsuarioRow key={u.id} usuario={u} esUsuarioActual={u.id === me.id} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
