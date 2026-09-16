import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import Link from "next/link";
import EncuestasTable from "@/components/EncuestasTable";
import type { Encuesta } from "@/types/database";

interface EncuestasSearchParams {
  pdv?: string;
  capacitador?: string;
  desde?: string;
  hasta?: string;
  finalizo?: string;
}

export default async function EncuestasPage({
  searchParams,
}: {
  searchParams: EncuestasSearchParams;
}) {
  await requirePermiso("encuestas");
  const supabase = createClient();

  const { data: pdvs } = await supabase
    .from("pdvs")
    .select("id, nombre")
    .order("nombre")
    .returns<{ id: string; nombre: string }[]>();

  let query = supabase
    .from("encuestas")
    .select("*")
    .order("fecha_capacitacion", { ascending: false })
    .limit(300);

  if (searchParams.pdv) {
    query = query.eq("pdv_capacitacion", searchParams.pdv);
  }
  if (searchParams.capacitador) {
    query = query.eq("capacitador", searchParams.capacitador);
  }
  if (searchParams.desde) {
    query = query.gte("fecha_capacitacion", searchParams.desde);
  }
  if (searchParams.hasta) {
    query = query.lte("fecha_capacitacion", searchParams.hasta);
  }
  if (searchParams.finalizo) {
    query = query.eq("finalizo_proceso", searchParams.finalizo);
  }

  const { data: encuestas } = await query.returns<Encuesta[]>();

  const hayFiltros =
    searchParams.pdv || searchParams.capacitador || searchParams.desde || searchParams.hasta || searchParams.finalizo;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Encuestas de satisfacción</h1>
          <p className="text-sm text-neutral-500">{encuestas?.length ?? 0} registros</p>
        </div>
        <Link href="/encuestas/nueva" className="btn-primary">+ Nueva encuesta</Link>
      </div>

      <form className="card p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label className="label">PDV</label>
          <select className="input" name="pdv" defaultValue={searchParams.pdv ?? ""}>
            <option value="">Todos</option>
            {pdvs?.map((p) => (
              <option key={p.id} value={p.nombre}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Capacitador</label>
          <select className="input" name="capacitador" defaultValue={searchParams.capacitador ?? ""}>
            <option value="">Todos</option>
            <option value="Alli">Alli</option>
            <option value="Isra">Isra</option>
            <option value="Caro">Caro</option>
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
          <label className="label">Finalizó proceso</label>
          <select className="input" name="finalizo" defaultValue={searchParams.finalizo ?? ""}>
            <option value="">Todos</option>
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-5 flex gap-2">
          <button type="submit" className="btn-secondary">Filtrar</button>
          {hayFiltros && <Link href="/encuestas" className="btn-secondary">Limpiar filtros</Link>}
        </div>
      </form>

      <EncuestasTable encuestas={encuestas ?? []} />
    </div>
  );
}
