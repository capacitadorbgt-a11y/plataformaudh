import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import { createEntrega } from "../actions";
import type { Escuela } from "@/types/database";

export default async function NuevaEntregaPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requirePermiso("entregas");
  const supabase = createClient();

  const { data: escuelas } = await supabase
    .from("escuelas")
    .select("id, nombre")
    .order("nombre")
    .returns<Pick<Escuela, "id" | "nombre">[]>();

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Nueva recompensa / material</h1>

      <form action={createEntrega} className="card p-6 space-y-4">
        <div>
          <label className="label">Escuela</label>
          <select className="input" name="escuela_id" defaultValue="" required>
            <option value="">— Selecciona una escuela —</option>
            {escuelas?.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Tipo</label>
            <select className="input" name="tipo" defaultValue="CAMISETA">
              <option value="CAMISETA">CAMISETA</option>
              <option value="ENTRADA_CINE">ENTRADA CINE</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="PAGO">PAGO</option>
              <option value="OTRO">OTRO</option>
            </select>
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input className="input" type="number" name="cantidad" min={0} />
          </div>
        </div>

        <div>
          <label className="label">Fecha</label>
          <input className="input" type="date" name="fecha" />
        </div>

        <div>
          <label className="label">Detalle (tallas, banco, referencia, etc.)</label>
          <input className="input" name="detalle" />
        </div>

        {searchParams?.error && <p className="text-sm text-red-600">{searchParams.error}</p>}

        <button type="submit" className="btn-primary w-full">Guardar</button>
      </form>
    </div>
  );
}
