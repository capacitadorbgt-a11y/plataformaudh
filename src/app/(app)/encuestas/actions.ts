"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormadorRating } from "@/types/database";

function toNullableStr(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
function toNullableInt(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s === "" ? null : parseInt(s, 10);
}

function leerFormador(formData: FormData, prefijo: string): FormadorRating | null {
  const nombre = toNullableStr(formData.get(`${prefijo}_nombre`));
  if (!nombre) return null;
  return {
    nombre,
    conocimiento: String(formData.get(`${prefijo}_conocimiento`) || ""),
    claridad: String(formData.get(`${prefijo}_claridad`) || ""),
    organizacion: String(formData.get(`${prefijo}_organizacion`) || ""),
    acompanamiento: String(formData.get(`${prefijo}_acompanamiento`) || ""),
    actitud: String(formData.get(`${prefijo}_actitud`) || ""),
    resolucion: String(formData.get(`${prefijo}_resolucion`) || ""),
    fortaleza_debilidad: String(formData.get(`${prefijo}_fortaleza_debilidad`) || ""),
  } as FormadorRating;
}

function construirRegistro(formData: FormData) {
  const finalizoProceso = toNullableStr(formData.get("finalizo_proceso"));

  const formadores = [
    leerFormador(formData, "formador1"),
    leerFormador(formData, "formador2"),
    leerFormador(formData, "formador3"),
  ].filter((f): f is FormadorRating => f !== null);

  return {
    capacitador: String(formData.get("capacitador") || ""),
    nombre_encuestado: String(formData.get("nombre_encuestado") || ""),
    fecha_capacitacion: toNullableStr(formData.get("fecha_capacitacion")),
    cargo: String(formData.get("cargo") || ""),
    cargo_otro: toNullableStr(formData.get("cargo_otro")),
    pdv_capacitacion: String(formData.get("pdv_capacitacion") || ""),
    limpieza_organizacion: toNullableInt(formData.get("limpieza_organizacion")),
    temas_recordados: toNullableStr(formData.get("temas_recordados")),
    tiempo_suficiente: toNullableStr(formData.get("tiempo_suficiente")),
    tema_profundidad: toNullableStr(formData.get("tema_profundidad")),
    que_le_gusto: toNullableStr(formData.get("que_le_gusto")),
    que_no_le_gusto: toNullableStr(formData.get("que_no_le_gusto")),
    nps: toNullableInt(formData.get("nps")),
    formadores,
    finalizo_proceso: finalizoProceso,
    desempeno_funciones: finalizoProceso === "SI" ? toNullableStr(formData.get("desempeno_funciones")) : null,
    observaciones_colaborador:
      finalizoProceso === "SI" ? toNullableStr(formData.get("observaciones_colaborador")) : null,
    motivo_no_finalizo: finalizoProceso === "NO" ? toNullableStr(formData.get("motivo_no_finalizo")) : null,
    motivo_otro: finalizoProceso === "NO" ? toNullableStr(formData.get("motivo_otro")) : null,
    que_habria_facilitado:
      finalizoProceso === "NO" ? toNullableStr(formData.get("que_habria_facilitado")) : null,
    observaciones_desertor:
      finalizoProceso === "NO" ? toNullableStr(formData.get("observaciones_desertor")) : null,
  };
}

export async function createEncuesta(formData: FormData) {
  const { user } = await requirePermiso("encuestas");
  const supabase = createClient();

  const registro = construirRegistro(formData);

  if (!registro.capacitador || !registro.nombre_encuestado || !registro.fecha_capacitacion || !registro.cargo || !registro.pdv_capacitacion) {
    redirect(`/encuestas/nueva?error=${encodeURIComponent("Completa los campos obligatorios de identificación")}`);
  }

  const { data, error } = await supabase.from("encuestas").insert({ ...registro, created_by: user.id }).select("id").single();

  if (error) {
    redirect(`/encuestas/nueva?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit(user.id, "crear_encuesta", { entidad: "encuesta", entidadId: data!.id, detalle: registro.pdv_capacitacion });

  revalidatePath("/encuestas");
  redirect("/encuestas");
}

export async function updateEncuesta(id: string, formData: FormData) {
  const { user } = await requirePermiso("encuestas");
  const supabase = createClient();

  const registro = construirRegistro(formData);

  if (!registro.capacitador || !registro.nombre_encuestado || !registro.fecha_capacitacion || !registro.cargo || !registro.pdv_capacitacion) {
    redirect(`/encuestas/${id}/editar?error=${encodeURIComponent("Completa los campos obligatorios de identificación")}`);
  }

  const { error } = await supabase.from("encuestas").update(registro).eq("id", id);

  if (error) {
    redirect(`/encuestas/${id}/editar?error=${encodeURIComponent(error.message)}`);
  }

  await logAudit(user.id, "editar_encuesta", { entidad: "encuesta", entidadId: id });

  revalidatePath("/encuestas");
  redirect("/encuestas");
}

export async function deleteEncuesta(id: string) {
  const { user, profile } = await requirePermiso("encuestas");
  if (profile.role !== "admin_udh") return;
  const supabase = createClient();
  await supabase.from("encuestas").delete().eq("id", id);
  await logAudit(user.id, "eliminar_encuesta", { entidad: "encuesta", entidadId: id });
  revalidatePath("/encuestas");
}
