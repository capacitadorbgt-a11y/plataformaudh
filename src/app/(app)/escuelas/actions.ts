"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireUser } from "@/lib/auth";
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
  await requireAdmin();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("escuelas")
    .insert({
      nombre: String(formData.get("nombre")),
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

  revalidatePath("/escuelas");
  redirect(`/escuelas/${data!.id}`);
}

export async function updateEscuela(escuelaId: string, formData: FormData) {
  await requireUser();
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
  return { error: null };
}

export async function addColaborador(escuelaId: string, formData: FormData) {
  await requireAdmin();
  const supabase = createClient();

  await supabase.from("colaboradores").insert({
    escuela_id: escuelaId,
    nombre: String(formData.get("nombre")),
    rol: String(formData.get("rol") || "OTRO"),
    cedula: toNullableStr(formData.get("cedula")),
    datos_bancarios: toNullableStr(formData.get("datos_bancarios")),
    fecha_ingreso: toNullableStr(formData.get("fecha_ingreso")),
  });

  revalidatePath(`/escuelas/${escuelaId}`);
}

export async function updateColaborador(
  escuelaId: string,
  colaboradorId: string,
  formData: FormData
) {
  await requireAdmin();
  const supabase = createClient();

  await supabase
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
}

export async function deleteColaborador(escuelaId: string, colaboradorId: string) {
  await requireAdmin();
  const supabase = createClient();
  await supabase.from("colaboradores").delete().eq("id", colaboradorId);
  revalidatePath(`/escuelas/${escuelaId}`);
}

const TIPOS_INFORME_PERMITIDOS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function uploadInforme(escuelaId: string, formData: FormData) {
  const { user } = await requireUser();
  const supabase = createClient();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    redirect(`/escuelas/${escuelaId}?error=${encodeURIComponent("Selecciona un archivo para subir")}`);
  }

  const file = archivo as File;
  if (TIPOS_INFORME_PERMITIDOS.length && file.type && !TIPOS_INFORME_PERMITIDOS.includes(file.type)) {
    redirect(
      `/escuelas/${escuelaId}?error=${encodeURIComponent(
        "Tipo de archivo no permitido. Sube un PDF, Word (doc/docx) o Excel (xls/xlsx)."
      )}`
    );
  }

  const rutaStorage = `${escuelaId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("informes").upload(rutaStorage, file);

  if (uploadError) {
    redirect(`/escuelas/${escuelaId}?error=${encodeURIComponent(uploadError.message)}`);
  }

  await supabase.from("informes").insert({
    escuela_id: escuelaId,
    nombre_archivo: file.name,
    tipo_archivo: file.type || null,
    storage_path: rutaStorage,
    tamano_bytes: file.size,
    created_by: user.id,
  });

  revalidatePath(`/escuelas/${escuelaId}`);
}

export async function deleteInforme(escuelaId: string, informeId: string, storagePath: string) {
  await requireAdmin();
  const supabase = createClient();

  await supabase.storage.from("informes").remove([storagePath]);
  await supabase.from("informes").delete().eq("id", informeId);

  revalidatePath(`/escuelas/${escuelaId}`);
}

export async function addEntrega(escuelaId: string, formData: FormData) {
  await requireUser();
  const supabase = createClient();

  await supabase.from("entregas").insert({
    escuela_id: escuelaId,
    tipo: String(formData.get("tipo") || "OTRO"),
    cantidad: toNullableInt(formData.get("cantidad")),
    detalle: toNullableStr(formData.get("detalle")),
    fecha: toNullableStr(formData.get("fecha")),
  });

  revalidatePath(`/escuelas/${escuelaId}`);
  revalidatePath("/entregas");
}
