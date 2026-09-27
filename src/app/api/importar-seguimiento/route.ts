import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `Extraes datos de seguimientos de reclutamiento/capacitación de Bogati (Universidad del Helado) a
partir de texto obtenido por OCR de una imagen o de una tabla pegada, que puede venir con errores de reconocimiento,
desordenado o con columnas mezcladas.

Todo proceso de capacitación dura 4 días: si el texto muestra un rango de fechas (ej. "15 al 18 de septiembre"),
usa la fecha de INICIO como fecha_capacitacion.

Devuelve EXCLUSIVAMENTE un JSON con esta forma exacta, sin texto adicional:
{"seguimientos": [
  {
    "escuela": string | null,
    "fecha_capacitacion": string | null,  // formato aaaa-mm-dd si se puede determinar, si no la fecha tal cual aparece
    "cargo": string | null,
    "aspirantes": string[],
    "pdv_solicitud": string | null,
    "analista": string | null,
    "capacitador": string | null,
    "aspirante_aprobado": string | null,
    "fecha_ingreso": string | null,
    "observaciones": string | null
  }
]}

Si el texto describe un solo proceso, devuelve un solo elemento en el arreglo. Si describe varias filas de una
tabla (una por proceso), devuelve un elemento por fila. Usa null en cualquier campo que no puedas determinar con
confianza; no inventes datos.`;

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 501 });
  }

  await requirePermiso("seguimientos");

  const body = await req.json().catch(() => null);
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (!texto) {
    return NextResponse.json({ error: "Falta el texto a interpretar" }, { status: 400 });
  }

  try {
    const respuesta = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODELO,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: texto },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      return NextResponse.json({ error: `Groq respondió ${respuesta.status}: ${detalle.slice(0, 300)}` }, { status: 502 });
    }

    const datos = await respuesta.json();
    const contenido = datos.choices?.[0]?.message?.content ?? "{}";
    let parseado: unknown;
    try {
      parseado = JSON.parse(contenido);
    } catch {
      return NextResponse.json({ error: "La IA no devolvió un JSON válido" }, { status: 502 });
    }

    const seguimientos = (parseado as { seguimientos?: unknown[] })?.seguimientos;
    return NextResponse.json({ seguimientos: Array.isArray(seguimientos) ? seguimientos : [] });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error al consultar la IA" }, { status: 502 });
  }
}
