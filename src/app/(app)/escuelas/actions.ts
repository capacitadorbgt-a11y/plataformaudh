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

const TIPOS_INFORME_PERMITIDOS = ["application/pdf"];

// Supabase Storage rechaza ciertas claves (tildes, espacios, etc.) con
// "Invalid key". El nombre original y legible se guarda aparte en
// nombre_archivo; aqui solo se genera una clave segura para el storage.
function sanitizeStorageKey(nombre: string) {
  const sinAcentos = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const partes = sinAcentos.split(/(\.[^.]+)$/); // separa la extension
  const base = (partes[0] || "archivo")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const extension = (partes[1] || "").replace(/[^a-zA-Z0-9.]/g, "");
  return (base || "archivo") + extension;
}

export async function uploadInforme(escuelaId: string, formData: FormData) {
  const { user } = await requirePermiso("escuelas");
  const supabase = createClient();

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Selecciona un archivo para subir" };
  }

  const file = archivo as File;
  if (file.type && !TIPOS_INFORME_PERMITIDOS.includes(file.type)) {
    return { error: "Tipo de archivo no permitido. Sube un documento en formato PDF." };
  }

  const rutaStorage = `${escuelaId}/${Date.now()}-${sanitizeStorageKey(file.name)}`;
  const { error: uploadError } = await supabase.storage.from("informes").upload(rutaStorage, file);

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error } = await supabase.from("informes").insert({
    escuela_id: escuelaId,
    nombre_archivo: file.name,
    tipo_archivo: file.type || null,
    storage_path: rutaStorage,
    tamano_bytes: file.size,
    created_by: user.id,
  });

  revalidatePath(`/escuelas/${escuelaId}`);

  if (error) return { error: error.message };

  await logAudit(user.id, "subir_informe", { entidad: "escuela", entidadId: escuelaId, detalle: file.name });
  return { error: null };
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
