"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requirePermiso } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function toNullableInt(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : parseInt(s, 10);
}
function toNullableStr(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function createEscuela(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createClient();

  const nombre = String(formData.get("nombre"));

  const { data, error } = await supabase
    .from("escuelas")
    .insert({
      nombre,
      capacidad: toNullableInt(formData.get("capacidad")),
      provincia: toNullableStr(formData.get("provincia")),
      ciudad: toNullableStr(formData.get("ciudad")),
      zona: toNullableStr(formData.get("zona")),
      estado: String(formData.get("estado") || "REVISION"),
      observaciones: toNullableStr(formData.get("observaciones")),
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/escuelas/nueva?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit(user.id, "crear_escuela", { entidad: "escuela", entidadId: data!.id, detalle: nombre });

  revalidatePath("/escuelas");
  redirect(`/escuelas/${data!.id}`);
}

export async function updateEscuela(escuelaId: string, formData: FormData) {
  const { user } = await requirePermiso("escuelas");
  const supabase = createClient();

  const { error } = await supabase
    .from("escuelas")
    .update({
      capacidad: toNullableInt(formData.get("capacidad")),
      provincia: toNullableStr(formData.get("provincia")),
      ciudad: toNullableStr(formData.get("ciudad")),
      zona: toNullableStr(formData.get("zona")),
      estado: String(formData.get("estado") || "REVISION"),
      procesos_completados: toNullableInt(formData.get("procesos_completados")),
      observaciones: toNullableStr(formData.get("observaciones")),
      fecha_ultima_visita: toNullableStr(formData.get("fecha_ultima_visita")),
    })
    .eq("id", escuelaId);

  revalidatePath(`/escuelas/${escuelaId}`);
  revalidatePath("/escuelas");

  if (error) return { error: error.message };

  await logAudit(user.id, "editar_escuela", { entidad: "escuela", entidadId: escuelaId });
  return { error: null };
}

export async function addColaborador(escuelaId: string, formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = createClient();
  const nombre = String(formData.get("nombre"));

  const { error } = await supabase.from("colaboradores").insert({
    escuela_id: escuelaId,
    nombre,
    rol: String(formData.get("rol") || "OTRO"),
    cedula: toNullableStr(formData.get("cedula")),
    datos_bancarios: toNullableStr(formData.get("datos_bancarios")),
    fecha_ingreso: toNullableStr(formData.get("fecha_ingreso")),
  });

  revalidatePath(`/escuelas/${escuelaId}`);

  if (error) return { error: error.message };

  await logAudit(user.id, "crear_colaborador", { entidad: "escuela", entidadId: escuelaId, detalle: nombre });
  return { error: null };
}

export async function updateColaborador(
  escuelaId: string,
  colaboradorId: string,
  formData: FormData
) {
  const { user } = await requireAdmin();
  const supabase = createClient();

  const { error } = await supabase
    .from("colaboradores")
    .update({
      nombre: String(formData.get("nombre")),
      rol: String(formData.get("rol") || "OTRO"),
      cedula: toNullableStr(formData.get("cedula")),
      datos_bancarios: toNullableStr(formData.get("datos_bancarios")),
      fecha_ingreso: toNullableStr(formData.get("fecha_ingreso")),
    })
    .eq("id", colaboradorId);

  revalidatePath(`/escuelas/${escuelaId}`);

  if (error) return { error: error.message };

  await logAudit(user.id, "editar_colaborador", { entidad: "colaborador", entidadId: colaboradorId });
  return { error: null };
}

export async function deleteColaborador(escuelaId: string, colaboradorId: string) {
  const { user } = await requireAdmin();
  const supabase = createClient();
  await supabase.from("colaboradores").delete().eq("id", colaboradorId);
  await logAudit(user.id, "eliminar_colaborador", { entidad: "colaborador", entidadId: colaboradorId });
  revalidatePath(`/escuelas/${escuelaId}`);
}

export async function actualizarEstadoDesdeInforme(escuelaId: string, estado: "ACTIVO" | "INACTIVO") {
  const { user } = await requirePermiso("escuelas");
  const supabase = createClient();

  const { error } = await supabase.from("escuelas").update({ estado }).eq("id", escuelaId);

  revalidatePath(`/escuelas/${escuelaId}`);
  revalidatePath("/escuelas");

  if (error) return { error: error.message };

  await logAudit(user.id, "editar_escuela", {
    entidad: "escuela",
    entidadId: escuelaId,
    detalle: `Estado actualizado a ${estado} según el informe de cumplimiento generado`,
  });
  return { error: null };
}

export async function deleteInforme(escuelaId: string, informeId: string, storagePath: string) {
  const { user } = await requireAdmin();
  const supabase = createClient();

  await supabase.storage.from("informes").remove([storagePath]);
  await supabase.from("informes").delete().eq("id", informeId);

  await logAudit(user.id, "eliminar_informe", { entidad: "informe", entidadId: informeId });
  revalidatePath(`/escuelas/${escuelaId}`);
}

export async function addEntrega(escuelaId: string, formData: FormData) {
  const { user } = await requirePermiso("entregas");
  const supabase = createClient();

  const { error } = await supabase.from("entregas").insert({
    escuela_id: escuelaId,
    tipo: String(formData.get("tipo") || "OTRO"),
    cantidad: toNullableInt(formData.get("cantidad")),
    detalle: toNullableStr(formData.get("detalle")),
    fecha: toNullableStr(formData.get("fecha")),
  });

  revalidatePath(`/escuelas/${escuelaId}`);
  revalidatePath("/entregas");

  if (error) return { error: error.message };

  await logAudit(user.id, "registrar_entrega", { entidad: "escuela", entidadId: escuelaId });
  return { error: null };
}
