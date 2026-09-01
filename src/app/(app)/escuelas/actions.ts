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

  await supabase
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
}

export async function addColaborador(escuelaId: string, formData: FormData) {
  await requireAdmin();
  const supabase = createClient();

  await supabase.from("colaboradores").insert({
    escuela_id: escuelaId,
    nombre: String(formData.get("nombre")),
    rol: String(formData.get("rol") || "OTRO"),
    datos_bancarios: toNullableStr(formData.get("datos_bancarios")),
  });

  revalidatePath(`/escuelas/${escuelaId}`);
}

export async function deleteColaborador(escuelaId: string, colaboradorId: string) {
  await requireAdmin();
  const supabase = createClient();
  await supabase.from("colaboradores").delete().eq("id", colaboradorId);
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
