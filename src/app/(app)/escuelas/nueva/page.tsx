import { requireAdmin } from "@/lib/auth";
import { createEscuela } from "../actions";

export default async function NuevaEscuelaPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requireAdmin();

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Nueva escuela de formación</h1>

      <form action={createEscuela} className="card p-6 space-y-4">
        <div>
          <label className="label">Nombre de la escuela</label>
          <input className="input" name="nombre" required placeholder="Ej. PICH QUITO NORTE LA CAROLINA" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Provincia</label>
            <input className="input" name="provincia" />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input className="input" name="ciudad" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Zona</label>
            <input className="input" name="zona" placeholder="Ej. ZONA 1" />
          </div>
          <div>
            <label className="label">Capacidad</label>
            <input className="input" type="number" min={0} name="capacidad" />
          </div>
        </div>

        <div>
          <label className="label">Estado</label>
          <select className="input" name="estado" defaultValue="REVISION">
            <option value="ACTIVO">ACTIVO</option>
            <option value="REVISION">REVISION</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>

        <div>
          <label className="label">Observaciones</label>
          <textarea className="input" name="observaciones" rows={3} />
        </div>

        {searchParams?.error && (
          <p className="text-sm text-red-600">{searchParams.error}</p>
        )}

        <button type="submit" className="btn-primary w-full">Crear escuela</button>
      </form>
    </div>
  );
}
