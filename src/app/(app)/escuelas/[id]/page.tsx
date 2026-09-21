import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EstadoBadge, RolBadge } from "@/components/Badge";
import EscuelaFichaForm from "@/components/EscuelaFichaForm";
import ColaboradorEditForm from "@/components/ColaboradorEditForm";
import ColaboradorAddForm from "@/components/ColaboradorAddForm";
import EntregaAddForm from "@/components/EntregaAddForm";
import GenerarInformeDiagnostico from "@/components/GenerarInformeDiagnostico";
import AgregarInformeButton from "@/components/AgregarInformeButton";
import { deleteInforme } from "../actions";
import type { Colaborador, Entrega, Escuela, Informe, Seguimiento } from "@/types/database";

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function EscuelaDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const { profile } = await requirePermiso("escuelas");
  const supabase = createClient();

  const { data: escuela } = await supabase
    .from("escuelas")
    .select("*")
    .eq("id", params.id)
    .single<Escuela>();

  if (!escuela) notFound();

  const isAdmin = profile.role === "admin_udh";

  const [{ data: colaboradores }, { data: entregas }, { data: seguimientos }, { data: informes }] =
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
      supabase
        .from("informes")
        .select("*")
        .eq("escuela_id", params.id)
        .order("created_at", { ascending: false })
        .returns<Informe[]>(),
    ]);

  const informesConUrl = await Promise.all(
    (informes ?? []).map(async (inf) => {
      const { data } = await supabase.storage
        .from("informes")
        .createSignedUrl(inf.storage_path, 3600);
      return { ...inf, url: data?.signedUrl ?? null };
    })
  );

  const boundDeleteInforme = deleteInforme.bind(null, escuela.id);

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

      {searchParams?.error && (
        <div className="card p-4 border-red-200 bg-red-50 text-sm text-red-600">
          {searchParams.error}
        </div>
      )}

      {/* Ficha de la escuela */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Ficha de la escuela</h2>
        <EscuelaFichaForm escuela={escuela} />
      </div>

      {/* Colaboradores */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Colaboradores (Admin / Polifuncional)</h2>
          {!isAdmin && (
            <span className="text-xs text-neutral-400">
              Cédula y datos bancarios visibles solo para Admin UDH
            </span>
          )}
        </div>

        <div className="space-y-3 mb-4">
          {colaboradores?.map((c) =>
            isAdmin ? (
              <ColaboradorEditForm key={c.id} escuelaId={escuela.id} colaborador={c} />
            ) : (
              <div key={c.id} className="border border-neutral-100 rounded-lg px-3 py-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  {c.nombre} <RolBadge rol={c.rol} />
                </div>
                <div className="text-xs text-neutral-400">
                  {c.fecha_ingreso ? `Ingreso: ${c.fecha_ingreso} · ` : ""}
                  {c.datos_bancarios || "—"}
                </div>
              </div>
            )
          )}
          {(!colaboradores || colaboradores.length === 0) && (
            <p className="text-sm text-neutral-400">Sin colaboradores registrados.</p>
          )}
        </div>

        {isAdmin && <ColaboradorAddForm escuelaId={escuela.id} />}
      </div>

      {/* Informes */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Informes</h2>
        </div>

        <GenerarInformeDiagnostico escuela={escuela} />
        <div className="mb-4">
          <AgregarInformeButton escuelaId={escuela.id} />
        </div>

        <div className="space-y-2 mb-4">
          {informesConUrl.map((inf) => (
            <div key={inf.id} className="flex items-center justify-between border border-neutral-100 rounded-lg px-3 py-2 text-sm">
              <div className="min-w-0">
                {inf.url ? (
                  <a href={inf.url} target="_blank" rel="noreferrer" className="font-medium hover:underline text-udh-700 truncate block">
                    {inf.nombre_archivo}
                  </a>
                ) : (
                  <span className="font-medium">{inf.nombre_archivo}</span>
                )}
                <div className="text-xs text-neutral-400">
                  {formatBytes(inf.tamano_bytes)} · {new Date(inf.created_at).toLocaleDateString("es-EC")}
                </div>
              </div>
              {isAdmin && (
                <form action={boundDeleteInforme.bind(null, inf.id, inf.storage_path)}>
                  <button type="submit" className="text-xs text-red-500 hover:underline shrink-0">
                    Eliminar
                  </button>
                </form>
              )}
            </div>
          ))}
          {informesConUrl.length === 0 && (
            <p className="text-sm text-neutral-400">Sin informes cargados.</p>
          )}
        </div>
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

        <EntregaAddForm escuelaId={escuela.id} />
      </div>

      {/* Seguimientos de reclutamiento asociados */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Seguimientos de reclutamiento / capacitación</h2>
        <div className="space-y-2">
          {seguimientos?.map((s) => (
            <Link
              key={s.id}
              href={`/seguimientos/${s.id}/editar`}
              className="block border border-neutral-100 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50 hover:underline underline-offset-2"
            >
              <div className="flex justify-between">
                <span className="font-medium">{s.cargo || "Sin cargo"}</span>
                <span className="text-xs text-neutral-400">{s.fecha_capacitacion}</span>
              </div>
              <div className="text-xs text-neutral-500">
                Aspirantes: {s.num_aspirantes ?? 0} · Aprobado: {s.aspirante_aprobado || "—"}
              </div>
              <div className="text-xs text-neutral-500">
                PDV que solicita: {s.pdv_solicitud || "—"}
              </div>
              {s.observaciones && (
                <div className="text-xs text-neutral-400 mt-1">{s.observaciones}</div>
              )}
            </Link>
          ))}
          {(!seguimientos || seguimientos.length === 0) && (
            <p className="text-sm text-neutral-400">Sin seguimientos registrados para esta escuela.</p>
          )}
        </div>
      </div>
    </div>
  );
}
