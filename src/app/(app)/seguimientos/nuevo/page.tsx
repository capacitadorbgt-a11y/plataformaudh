import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import { createSeguimiento } from "../actions";
import type { Escuela } from "@/types/database";

export default async function NuevoSeguimientoPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requirePermiso("seguimientos");
  const supabase = createClient();

  const [{ data: escuelas }, { data: pdvs }] = await Promise.all([
    supabase
      .from("escuelas")
      .select("id, nombre")
      .order("nombre")
      .returns<Pick<Escuela, "id" | "nombre">[]>(),
    supabase
      .from("pdvs")
      .select("id, nombre")
      .order("nombre")
      .returns<{ id: string; nombre: string }[]>(),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Nuevo seguimiento</h1>

      <form action={createSeguimiento} className="card p-6 space-y-4">
        <div>
          <label className="label">Escuela</label>
          <select className="input" name="escuela_id" defaultValue="">
            <option value="">— No está en la lista (escribir nombre abajo) —</option>
            {escuelas?.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Nombre de escuela (si no está en la lista)</label>
          <input className="input" name="escuela_nombre_libre" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha de capacitación</label>
            <input className="input" type="date" name="fecha_capacitacion" />
          </div>
          <div>
            <label className="label">Cargo</label>
            <input className="input" name="cargo" placeholder="ADM, PTC, PMT, POLI..." />
          </div>
        </div>

        <div>
          <label className="label">Estado del proceso</label>
          <select className="input" name="estado_proceso" defaultValue="EN_PROCESO">
            <option value="EN_PROCESO">En proceso</option>
            <option value="FINALIZADO">Finalizado</option>
          </select>
        </div>

        <div>
          <label className="label">Aspirantes (uno por línea)</label>
          <textarea className="input" name="aspirantes" rows={4} placeholder={"Nombre aspirante 1\nNombre aspirante 2"} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Analista</label>
            <input className="input" name="analista" />
          </div>
          <div>
            <label className="label">PDV solicitud</label>
            <select className="input" name="pdv_solicitud_select" defaultValue="">
              <option value="">— Selecciona un PDV —</option>
              {pdvs?.map((p) => (
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Aspirante aprobado</label>
            <input className="input" name="aspirante_aprobado" />
          </div>
          <div>
            <label className="label">Capacitador</label>
            <input className="input" name="capacitador" />
          </div>
        </div>

        <div>
          <label className="label">PDV solicitud (si no está en la lista)</label>
          <input className="input" name="pdv_solicitud_libre" placeholder="Escribe el nombre del PDV" />
        </div>

        <div>
          <label className="label">Fecha de ingreso</label>
          <input className="input" type="date" name="fecha_ingreso" />
        </div>

        <div>
          <label className="label">Observaciones</label>
          <textarea className="input" name="observaciones" rows={3} />
        </div>

        {searchParams?.error && <p className="text-sm text-red-600">{searchParams.error}</p>}

        <button type="submit" className="btn-primary w-full">Guardar seguimiento</button>
      </form>
    </div>
  );
}
