import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { Entrega } from "@/types/database";
import Link from "next/link";

export default async function EntregasPage() {
  await requireUser();
  const supabase = createClient();

  const { data: entregas } = await supabase
    .from("entregas")
    .select("*, escuelas(id, nombre)")
    .order("fecha", { ascending: false })
    .limit(200)
    .returns<(Entrega & { escuelas: { id: string; nombre: string } | null })[]>();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Recompensas y material entregado</h1>
        <p className="text-sm text-neutral-500">
          Registro nacional de camisetas, entradas de cine, cheques y otros materiales
        </p>
      </div>

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
                  Aún no hay entregas registradas. Regístralas desde la ficha de cada escuela.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
