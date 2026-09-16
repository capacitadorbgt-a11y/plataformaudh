"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
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
    pdv_solicitud: pdvSolicitud,
    fecha_ingreso: toNullableStr(formData.get("fecha_ingreso")),
    aspirante_aprobado: toNullableStr(formData.get("aspirante_aprobado")),
    observaciones: toNullableStr(formData.get("observaciones")),
    analista: toNullableStr(formData.get("analista")),
    created_by: user.id,
  });

  if (error) {
    redirect(`/seguimientos/nuevo?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit(user.id, "crear_seguimiento");

  revalidatePath("/seguimientos");
  redirect("/seguimientos");
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
      pdv_solicitud: pdvSolicitud,
      fecha_ingreso: toNullableStr(formData.get("fecha_ingreso")),
      aspirante_aprobado: toNullableStr(formData.get("aspirante_aprobado")),
      observaciones: toNullableStr(formData.get("observaciones")),
      analista: toNullableStr(formData.get("analista")),
    })
    .eq("id", id);

  if (error) {
    redirect(`/seguimientos/${id}/editar?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit(user.id, "editar_seguimiento", { entidad: "seguimiento", entidadId: id });

  revalidatePath("/seguimientos");
  redirect("/seguimientos");
}
