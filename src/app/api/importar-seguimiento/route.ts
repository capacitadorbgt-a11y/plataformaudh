import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = "openai/gpt-oss-120b";

function systemPrompt(): string {
  const hoy = new Date().toISOString().slice(0, 10);
  const anioActual = hoy.slice(0, 4);
  return `Extraes datos de seguimientos de reclutamiento/capacitación de Bogati (Universidad del Helado) a
partir de texto obtenido por OCR de una imagen (a menudo una captura de pantalla de un CORREO) o de una tabla
pegada. El OCR de tablas suele salir MAL: columnas mezcladas, celdas partidas en varias líneas, palabras cortadas,
letras confundidas (0/O, 1/l, 6/8, etc.) y el orden de lectura no siempre respeta filas/columnas. Tu trabajo es
reconstruir los datos reales a pesar de ese ruido, no solo leer literalmente.

Hoy es ${hoy} (aaaa-mm-dd). Si una fecha trae un año que no tiene sentido (muy lejano en el pasado o futuro, o que
parece un dígito mal leído, ej. "2076" cuando el resto del contexto es reciente), usa el año más cercano y
razonable a ${anioActual} en vez de copiar el dígito corrupto tal cual.

FORMATO TÍPICO DE CORREO QUE VAS A VER (reconócelo aunque el OCR lo desordene):
1. Un asunto o primera línea como "CAPACITACION PDV <nombre>" — normalmente <nombre> es la ESCUELA de formación.
2. Una frase de cuerpo como "Envío los datos de la persona que ya tiene las bases para el PDV <nombre>" o
   "solicito capacitación para el PDV <nombre>" — ese <nombre> es el PDV SOLICITUD (el punto de venta que pide la
   capacitación), NO la escuela. Aunque esta frase parezca "una nota", debes extraer el PDV que menciona en vez de
   ponerla completa en observaciones.
3. Una tabla con columnas como: PDV SOLICITUD, CARGO, ASPIRANTES, CÉDULA, FECHA CAPACITACION, PDV ESCUELA (los
   nombres exactos varían). Mapeo de columnas a campos de salida:
   - "PDV SOLICITUD" (o el PDV de la frase del punto 2) -> pdv_solicitud
   - "PDV ESCUELA" (o el nombre del asunto del punto 1) -> escuela
   - "CARGO" -> cargo
   - "ASPIRANTES" -> aspirantes (uno o más NOMBRES COMPLETOS, cada persona con nombre y apellido; si el OCR partió
     un nombre en pedazos en líneas distintas, o mezcló dos personas, reconstrúyelos como nombres completos
     plausibles en vez de dejar fragmentos sueltos como "CAROLA" y "TORRES" por separado)
   - "CÉDULA" -> IGNORAR, no se guarda en el sistema
   - "FECHA CAPACITACION" -> fecha_capacitacion
4. Una FIRMA al final (nombre de la persona que envía, cargo como "Asistente de Talento Humano", correo,
   teléfono, a veces un logo). Esa firma NUNCA es un aspirante: no la incluyas en "aspirantes". El nombre de quien
   firma sí puede usarse como "analista" si nada más en el texto indica quién es el analista.

Todo proceso de capacitación dura 4 días: si el texto muestra un rango de fechas (ej. "15 al 18 de septiembre"),
usa la fecha de INICIO como fecha_capacitacion.

Devuelve EXCLUSIVAMENTE un JSON con esta forma exacta, sin texto adicional:
{"seguimientos": [
  {
    "escuela": string | null,
    "fecha_capacitacion": string | null,  // formato aaaa-mm-dd si se puede determinar (con año plausible), si no la fecha tal cual aparece
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
confianza (mejor null que un dato inventado o claramente mal ubicado).

Extrae ÚNICAMENTE los campos listados arriba. Cualquier otro dato del texto que no corresponda a ninguno de esos
campos (encabezados, títulos, logos, números de página, ruido de OCR sin sentido, cédulas, datos administrativos
ajenos al seguimiento) se debe ignorar por completo: no lo agregues en "observaciones" ni lo fuerces en otro
campo. En "observaciones" incluye solo comentarios reales sobre el proceso de capacitación/reclutamiento que no
encajen en ningún otro campo (por ejemplo una condición o pedido especial), no la frase introductoria del correo
si ya extrajiste el PDV/escuela que menciona.`;
}

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
          { role: "system", content: systemPrompt() },
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
