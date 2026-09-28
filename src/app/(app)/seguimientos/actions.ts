"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requirePermiso } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function toNullableStr(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
function toNullableInt(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : parseInt(s, 10);
}

export async function createSeguimiento(formData: FormData) {
  const { user } = await requirePermiso("seguimientos");
  const supabase = createClient();

  const escuelaId = toNullableStr(formData.get("escuela_id"));
  const pdvSolicitud =
    toNullableStr(formData.get("pdv_solicitud_libre")) ??
    toNullableStr(formData.get("pdv_solicitud_select"));
  const aspirantesRaw = String(formData.get("aspirantes") || "");
  const aspirantes = aspirantesRaw
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean)
    .map((nombre) => ({ nombre, aprobado: false }));

  const { error } = await supabase.from("seguimientos").insert({
    escuela_id: escuelaId,
    escuela_nombre_libre: escuelaId ? null : toNullableStr(formData.get("escuela_nombre_libre")),
    fecha_capacitacion: toNullableStr(formData.get("fecha_capacitacion")),
    num_aspirantes: aspirantes.length || toNullableInt(formData.get("num_aspirantes")),
    aspirantes,
    cargo: toNullableStr(formData.get("cargo")),
    estado_proceso: String(formData.get("estado_proceso") || "EN_PROCESO"),
    pdv_solicitud: pdvSolicitud,
    fecha_ingreso: toNullableStr(formData.get("fecha_ingreso")),
    aspirante_aprobado: toNullableStr(formData.get("aspirante_aprobado")),
    observaciones: toNullableStr(formData.get("observaciones")),
    analista: toNullableStr(formData.get("analista")),
    capacitador: toNullableStr(formData.get("capacitador")),
    pago1: toNullableStr(formData.get("pago1")),
    pago2: toNullableStr(formData.get("pago2")),
    created_by: user.id,
  });

  if (error) {
    redirect(`/seguimientos/nuevo?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit(user.id, "crear_seguimiento");

  revalidatePath("/seguimientos");
  redirect("/seguimientos");
}

export interface SeguimientoParaImportar {
  escuela_id: string | null;
  escuela_nombre_libre: string | null;
  fecha_capacitacion: string | null;
  cargo: string | null;
  aspirantes: string[];
  pdv_solicitud: string | null;
  analista: string | null;
  capacitador: string | null;
  aspirante_aprobado: string | null;
  fecha_ingreso: string | null;
  observaciones: string | null;
}

export async function importarSeguimientos(registros: SeguimientoParaImportar[]) {
  const { user } = await requirePermiso("seguimientos");
  const supabase = createClient();

  if (!registros.length) return { error: "No hay registros para importar", creados: 0 };

  const filas = registros.map((r) => ({
    escuela_id: r.escuela_id,
    escuela_nombre_libre: r.escuela_id ? null : r.escuela_nombre_libre,
    fecha_capacitacion: r.fecha_capacitacion,
    cargo: r.cargo,
    num_aspirantes: r.aspirantes.length || null,
    aspirantes: r.aspirantes.map((nombre) => ({ nombre, aprobado: false })),
    estado_proceso: "EN_PROCESO",
    pdv_solicitud: r.pdv_solicitud,
    analista: r.analista,
    capacitador: r.capacitador,
    aspirante_aprobado: r.aspirante_aprobado,
    fecha_ingreso: r.fecha_ingreso,
    observaciones: r.observaciones,
    created_by: user.id,
  }));

  const { data, error } = await supabase.from("seguimientos").insert(filas).select("id");

  if (error) return { error: error.message, creados: 0 };

  await logAudit(user.id, "crear_seguimiento", {
    detalle: `Importados ${data.length} seguimiento(s) desde imagen/tabla`,
  });

  revalidatePath("/seguimientos");
  return { error: null, creados: data.length };
}

export async function deleteInformeSeguimiento(seguimientoId: string, informeId: string, storagePath: string) {
  const { user } = await requireAdmin();
  const supabase = createClient();

  await supabase.storage.from("informes").remove([storagePath]);
  await supabase.from("informes").delete().eq("id", informeId);

  await logAudit(user.id, "eliminar_informe", { entidad: "seguimiento", entidadId: seguimientoId });
  revalidatePath("/seguimientos");
}

export async function updateSeguimiento(id: string, formData: FormData) {
  const { user } = await requirePermiso("seguimientos");
  const supabase = createClient();

  const escuelaId = toNullableStr(formData.get("escuela_id"));
  const pdvSolicitud =
    toNullableStr(formData.get("pdv_solicitud_libre")) ??
    toNullableStr(formData.get("pdv_solicitud_select"));
  const aspirantesRaw = String(formData.get("aspirantes") || "");
  const aspirantes = aspirantesRaw
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean)
    .map((nombre) => ({ nombre, aprobado: false }));

  const { error } = await supabase
    .from("seguimientos")
    .update({
      escuela_id: escuelaId,
      escuela_nombre_libre: escuelaId ? null : toNullableStr(formData.get("escuela_nombre_libre")),
      fecha_capacitacion: toNullableStr(formData.get("fecha_capacitacion")),
      num_aspirantes: aspirantes.length || toNullableInt(formData.get("num_aspirantes")),
      aspirantes,
      cargo: toNullableStr(formData.get("cargo")),
      estado_proceso: String(formData.get("estado_proceso") || "EN_PROCESO"),
      pdv_solicitud: pdvSolicitud,
      fecha_ingreso: toNullableStr(formData.get("fecha_ingreso")),
      aspirante_aprobado: toNullableStr(formData.get("aspirante_aprobado")),
      observaciones: toNullableStr(formData.get("observaciones")),
      analista: toNullableStr(formData.get("analista")),
      capacitador: toNullableStr(formData.get("capacitador")),
      pago1: toNullableStr(formData.get("pago1")),
      pago2: toNullableStr(formData.get("pago2")),
    })
    .eq("id", id);

  if (error) {
    redirect(`/seguimientos/${id}/editar?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit(user.id, "editar_seguimiento", { entidad: "seguimiento", entidadId: id });

  revalidatePath("/seguimientos");
  redirect("/seguimientos");
}
