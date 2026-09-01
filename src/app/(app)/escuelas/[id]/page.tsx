import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import { EstadoBadge, RolBadge } from "@/components/Badge";
import { updateEscuela, addColaborador, deleteColaborador, addEntrega } from "../actions";
import type { Colaborador, Entrega, Escuela, Seguimiento } from "@/types/database";

export default async function EscuelaDetailPage({ params }: { params: { id: string } }) {
  const { profile } = await requireUser();
  const supabase = createClient();

  const { data: escuela } = await supabase
    .from("escuelas")
    .select("*")
    .eq("id", params.id)
    .single<Escuela>();

  if (!escuela) notFound();

  const isAdmin = profile.role === "admin_udh";

  const [{ data: colaboradores }, { data: entregas }, { data: seguimientos }] =
    await Promise.all([
      supabase
        .from(isAdmin ? "colaboradores" : "colaboradores_view")
        .select("*")
        .eq("escuela_id", params.id)
        .returns<Colaborador[]>(),
      supabase
        .from("entregas")
        .select("*")
        .eq("escuela_id", params.id)
        .order("fecha", { ascending: false })
        .returns<Entrega[]>(),
      supabase
        .from("seguimientos")
        .select("*")
        .eq("escuela_id", params.id)
        .order("fecha_capacitacion", { ascending: false })
        .returns<Seguimiento[]>(),
    ]);

  const boundUpdate = updateEscuela.bind(null, escuela.id);
  const boundAddColaborador = addColaborador.bind(null, escuela.id);
  const boundDeleteColaborador = deleteColaborador.bind(null, escuela.id);
  const boundAddEntrega = addEntrega.bind(null, escuela.id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{escuela.nombre}</h1>
          <p className="text-sm text-neutral-500">
            {escuela.ciudad} · {escuela.provincia} · {escuela.zona}
          </p>
        </div>
        <EstadoBadge estado={escuela.estado} />
      </div>

      {/* Ficha de la escuela */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Ficha de la escuela</h2>
        <form action={boundUpdate} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Provincia</label>
            <input className="input" name="provincia" defaultValue={escuela.provincia ?? ""} />
          </div>
          <div>
            <label className="label">Ciudad</label>
            <input className="input" name="ciudad" defaultValue={escuela.ciudad ?? ""} />
          </div>
          <div>
            <label className="label">Zona</label>
            <input className="input" name="zona" defaultValue={escuela.zona ?? ""} />
          </div>
          <div>
            <label className="label">Capacidad</label>
            <input className="input" type="number" name="capacidad" defaultValue={escuela.capacidad ?? ""} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" name="estado" defaultValue={escuela.estado}>
              <option value="ACTIVO">ACTIVO</option>
              <option value="REVISION">REVISION</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </div>
          <div>
            <label className="label">Procesos completados</label>
            <input
              className="input"
              type="number"
              name="procesos_completados"
              defaultValue={escuela.procesos_completados ?? 0}
            />
          </div>
          <div>
            <label className="label">Fecha última visita</label>
            <input
              className="input"
              type="date"
              name="fecha_ultima_visita"
              defaultValue={escuela.fecha_ultima_visita ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observaciones</label>
            <textarea className="input" name="observaciones" rows={3} defaultValue={escuela.observaciones ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Guardar cambios</button>
          </div>
        </form>
      </div>

      {/* Colaboradores */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Colaboradores (Admin / Polifuncional)</h2>
          {!isAdmin && (
            <span className="text-xs text-neutral-400">
              Datos bancarios visibles solo para Admin UDH
            </span>
          )}
        </div>

        <div className="space-y-2 mb-4">
          {colaboradores?.map((c) => (
            <div key={c.id} className="flex items-center justify-between border border-neutral-100 rounded-lg px-3 py-2">
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {c.nombre} <RolBadge rol={c.rol} />
                </div>
                <div className="text-xs text-neutral-400">{c.datos_bancarios || "—"}</div>
              </div>
              {isAdmin && (
                <form action={boundDeleteColaborador.bind(null, c.id)}>
                  <button type="submit" className="text-xs text-red-500 hover:underline">
                    Eliminar
                  </button>
                </form>
              )}
            </div>
          ))}
          {(!colaboradores || colaboradores.length === 0) && (
            <p className="text-sm text-neutral-400">Sin colaboradores registrados.</p>
          )}
        </div>

        {isAdmin && (
          <form action={boundAddColaborador} className="grid sm:grid-cols-4 gap-3 items-end border-t border-neutral-100 pt-4">
            <div className="sm:col-span-2">
              <label className="label">Nombre</label>
              <input className="input" name="nombre" required />
            </div>
            <div>
              <label className="label">Rol</label>
              <select className="input" name="rol" defaultValue="ADMIN">
                <option value="ADMIN">ADMIN</option>
                <option value="POLI">POLI</option>
                <option value="OTRO">OTRO</option>
              </select>
            </div>
            <div>
              <button type="submit" className="btn-secondary w-full">Agregar</button>
            </div>
            <div className="sm:col-span-4">
              <label className="label">Datos bancarios (cédula, banco, cuenta)</label>
              <input className="input" name="datos_bancarios" />
            </div>
          </form>
        )}
      </div>

      {/* Entregas / recompensas */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Recompensas y material entregado</h2>
        <div className="space-y-2 mb-4">
          {entregas?.map((e) => (
            <div key={e.id} className="flex items-center justify-between border border-neutral-100 rounded-lg px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{e.tipo}</span>
                {e.cantidad != null && <span className="text-neutral-500"> · cantidad: {e.cantidad}</span>}
                <div className="text-xs text-neutral-400">{e.detalle}</div>
              </div>
              <span className="text-xs text-neutral-400">{e.fecha ?? ""}</span>
            </div>
          ))}
          {(!entregas || entregas.length === 0) && (
            <p className="text-sm text-neutral-400">Sin entregas registradas.</p>
          )}
        </div>

        <form action={boundAddEntrega} className="grid sm:grid-cols-4 gap-3 items-end border-t border-neutral-100 pt-4">
          <div>
            <label className="label">Tipo</label>
            <select className="input" name="tipo" defaultValue="CAMISETA">
              <option value="CAMISETA">CAMISETA</option>
              <option value="ENTRADA_CINE">ENTRADA CINE</option>
              <option value="CHEQUE">CHEQUE</option>
              <option value="OTRO">OTRO</option>
            </select>
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input className="input" type="number" name="cantidad" min={0} />
          </div>
          <div>
            <label className="label">Fecha</label>
            <input className="input" type="date" name="fecha" />
          </div>
          <div>
            <button type="submit" className="btn-secondary w-full">Registrar</button>
          </div>
          <div className="sm:col-span-4">
            <label className="label">Detalle (tallas, banco, etc.)</label>
            <input className="input" name="detalle" />
          </div>
        </form>
      </div>

      {/* Seguimientos de reclutamiento asociados */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Seguimientos de reclutamiento / capacitación</h2>
        <div className="space-y-2">
          {seguimientos?.map((s) => (
            <div key={s.id} className="border border-neutral-100 rounded-lg px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{s.cargo || "Sin cargo"}</span>
                <span className="text-xs text-neutral-400">{s.fecha_capacitacion}</span>
              </div>
              <div className="text-xs text-neutral-500">
                Aspirantes: {s.num_aspirantes ?? 0} · Aprobado: {s.aspirante_aprobado || "—"}
              </div>
              {s.observaciones && (
                <div className="text-xs text-neutral-400 mt-1">{s.observaciones}</div>
              )}
            </div>
          ))}
          {(!seguimientos || seguimientos.length === 0) && (
            <p className="text-sm text-neutral-400">Sin seguimientos registrados para esta escuela.</p>
          )}
        </div>
      </div>
    </div>
  );
}
