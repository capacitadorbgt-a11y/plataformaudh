import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recomendarEscuela } from "@/lib/recomendacion/recomendar";

export const runtime = "nodejs";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// El plan de Groq configurado no tiene acceso a los modelos Llama de chat;
// gpt-oss-120b (open-weight de OpenAI, alojado en Groq) si esta disponible
// y soporta "tools", que es lo que necesita este asistente.
const MODELO = "openai/gpt-oss-120b";

function systemPrompt(): string {
  const hoy = new Date().toISOString().slice(0, 10);
  return `Eres UDH Bot, el asistente de la Plataforma UDH (Universidad del Helado), el sistema interno
que usa Bogati Helados con Queso para gestionar sus escuelas de formación de personal a nivel nacional en Ecuador.

Hoy es ${hoy} (aaaa-mm-dd). Cuando el usuario mencione una fecha relativa ("la próxima semana", "el lunes",
"en 3 días"), calcula tú mismo la fecha exacta en aaaa-mm-dd a partir de hoy antes de usar una herramienta que la
necesite; no le preguntes la fecha exacta si ya te dio una referencia relativa clara.

Responde siempre en español, de forma clara, breve y concreta (2-5 frases salvo que te pidan un resumen o
explicación más larga). No inventes datos: si necesitas una cifra real (conteos, listados), usa las herramientas
disponibles; si no hay herramienta para lo que preguntan, dilo con honestidad.

Si te piden ayuda para capacitar personal de un PDV (ej. "necesito capacitar 2 polifuncionales del PDV X la
próxima semana"), usa la herramienta buscar_escuela_cercana con el PDV, la fecha calculada, el cargo y el número
de aspirantes que menciones. Al responder, básate en el campo "explicacion" que te devuelve la herramienta (dilo
con tus palabras si quieres, pero no cambies los hechos: minutos, cupos, motivos), menciona si hay una oportunidad
de agrupar con otro PDV cercano (campo "agrupamiento"), y termina con un enlace a la ficha de la escuela
recomendada usando su id real: [Ver esta escuela](/escuelas/{escuelaId}). Si además tienes fecha y PDV claros,
puedes ofrecer también: [Crear seguimiento con esta escuela](/seguimientos/nuevo?escuela_id={escuelaId}&fecha_capacitacion={fecha}&pdv_solicitud={pdv}) reemplazando
{escuelaId}, {fecha} y {pdv} por los valores reales (solo puedes usar UN enlace final por respuesta, elige el más útil).

GUÍA DE USO DE LA PLATAFORMA (para preguntas de "cómo hago...", responde con esto como base):

- Panel (inicio, "/"): estadísticas generales, buscador de escuela más cercana según un punto de venta (respeta
  el estado ACTIVO/REVISION de las escuelas y prioriza la misma ciudad), gráfico de capacitaciones por escuela,
  seguimientos en proceso con demora (+3 días) y seguimiento de permanencia (3 a 6 meses tras el ingreso).
- Escuelas ("/escuelas"): lista de escuelas de formación con filtros por nombre/ciudad/estado y exportar a
  Excel/CSV/PDF. Solo Admin UDH crea escuelas nuevas ("+ Nueva escuela"). Al entrar a la ficha de una escuela se
  edita provincia/ciudad/zona/capacidad/estado/observaciones, se administran sus Colaboradores (Admin/Polifuncional;
  cédula y datos bancarios solo visibles para Admin UDH), sus Informes (botón "Generar informe" sube un Excel de
  diagnóstico con pestañas DIAGNOSTICO/PLAN/FOTOS y arma un PDF de cumplimiento que se autoguarda; botón
  "+ Agregar informe" sube un PDF ya elaborado; en ambos casos, si el informe indica que el PDV está apto o no apto
  para ser Escuela de Formación, el estado de la escuela se actualiza a Activo o Inactivo respectivamente), y sus
  Recompensas/Entregas.
- Seguimientos ("/seguimientos"): registro de reclutamiento/capacitación por PDV. "+ Nuevo seguimiento" para crear
  uno; filtros por fecha, escuela, capacitador y PDV solicitud; se puede editar cada fila y exportar la tabla.
  Estado del proceso: En proceso / Finalizado.
- Recompensas y material ("/entregas"): registro de camisetas, entradas de cine, cheques, pagos u otro material
  entregado a una escuela; se crea y se edita desde ahí o desde la ficha de la escuela.
- Encuestas ("/encuestas"): satisfacción de aspirantes/colaboradores con la capacitación recibida.
- Usuarios ("/usuarios", solo Admin UDH): crear cuentas, asignar rol (Admin UDH / Analista), activar o desactivar
  el acceso, cambiar la contraseña de un usuario, y marcar qué herramientas puede usar cada uno.
- Auditoría ("/auditoria", solo Admin UDH): quién hizo qué y cuándo (inicios de sesión, altas/ediciones/borrados),
  filtrable por usuario, acción y fecha.
- Roles: Admin UDH tiene acceso completo (ve datos sensibles de colaboradores, administra usuarios, elimina
  registros). Analista trabaja solo con las herramientas que se le habiliten, sin ver datos bancarios/cédula ni
  administrar usuarios.

Si tu respuesta se beneficia de llevar al usuario a una sección, termina con un enlace en su propia línea, en este
formato EXACTO: [Texto del enlace](/ruta). Usa solo estas rutas reales: / , /escuelas , /seguimientos , /entregas ,
/encuestas , /usuarios , /auditoria — excepto tras usar buscar_escuela_cercana, donde sí puedes enlazar a
/escuelas/{escuelaId} o a /seguimientos/nuevo?... como se explicó arriba. No inventes otras rutas ni pongas el
enlace si no aporta.`;
}

const HERRAMIENTAS = [
  {
    type: "function",
    function: {
      name: "contar_escuelas",
      description: "Cuenta cuántas escuelas de formación hay registradas, opcionalmente filtradas por estado.",
      parameters: {
        type: "object",
        properties: {
          estado: { type: "string", enum: ["ACTIVO", "REVISION", "INACTIVO"], description: "Filtrar por estado (opcional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "contar_seguimientos",
      description: "Cuenta cuántos seguimientos de reclutamiento/capacitación hay registrados, opcionalmente por estado del proceso.",
      parameters: {
        type: "object",
        properties: {
          estado_proceso: { type: "string", enum: ["EN_PROCESO", "FINALIZADO"], description: "Filtrar por estado del proceso (opcional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "contar_entregas",
      description: "Cuenta cuántas entregas/recompensas hay registradas en total.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_escuelas",
      description: "Busca escuelas por coincidencia de nombre o ciudad y devuelve hasta 5 resultados con su estado y procesos.",
      parameters: {
        type: "object",
        properties: { texto: { type: "string", description: "Texto a buscar en el nombre o la ciudad" } },
        required: ["texto"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_escuela_cercana",
      description:
        "Recomienda la mejor escuela de formación para capacitar personal de un PDV en una fecha dada: combina tiempo de viaje real, cupos disponibles y demoras en curso (no solo distancia), explica por qué, y avisa si conviene agrupar con otro PDV cercano.",
      parameters: {
        type: "object",
        properties: {
          pdv: { type: "string", description: "Nombre del punto de venta (PDV) a capacitar" },
          fecha: { type: "string", description: "Fecha tentativa de la capacitación, en formato aaaa-mm-dd (ya calculada por ti si el usuario dio una fecha relativa)" },
          cargo: { type: "string", description: "Cargo a capacitar (ADM, PTC, PMT, POLI...), opcional" },
          aspirantes: { type: "number", description: "Número de aspirantes a capacitar, opcional" },
        },
        required: ["pdv", "fecha"],
      },
    },
  },
] as const;

type Rol = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: unknown };

async function ejecutarHerramienta(
  nombre: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<unknown> {
  switch (nombre) {
    case "contar_escuelas": {
      let query = supabase.from("escuelas").select("*", { count: "exact", head: true });
      if (typeof args.estado === "string") query = query.eq("estado", args.estado);
      const { count, error } = await query;
      if (error) return { error: error.message };
      return { total: count ?? 0 };
    }
    case "contar_seguimientos": {
      let query = supabase.from("seguimientos").select("*", { count: "exact", head: true });
      if (typeof args.estado_proceso === "string") query = query.eq("estado_proceso", args.estado_proceso);
      const { count, error } = await query;
      if (error) return { error: error.message };
      return { total: count ?? 0 };
    }
    case "contar_entregas": {
      const { count, error } = await supabase.from("entregas").select("*", { count: "exact", head: true });
      if (error) return { error: error.message };
      return { total: count ?? 0 };
    }
    case "buscar_escuelas": {
      const texto = typeof args.texto === "string" ? args.texto : "";
      const { data, error } = await supabase
        .from("escuelas")
        .select("nombre, ciudad, estado, procesos_completados")
        .or(`nombre.ilike.%${texto}%,ciudad.ilike.%${texto}%`)
        .limit(5);
      if (error) return { error: error.message };
      return { resultados: data };
    }
    case "buscar_escuela_cercana": {
      const pdv = typeof args.pdv === "string" ? args.pdv : "";
      const fecha = typeof args.fecha === "string" ? args.fecha : "";
      if (!pdv || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return { error: "Se necesita 'pdv' y 'fecha' en formato aaaa-mm-dd." };
      }
      const cargo = typeof args.cargo === "string" && args.cargo.trim() ? args.cargo.trim() : null;
      const aspirantes = typeof args.aspirantes === "number" && args.aspirantes > 0 ? args.aspirantes : null;
      return recomendarEscuela({ pdv, fecha, cargo, aspirantes });
    }
    default:
      return { error: `Herramienta desconocida: ${nombre}` };
  }
}

async function llamarGroq(mensajes: Rol[], apiKey: string) {
  const respuesta = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODELO,
      messages: mensajes,
      tools: HERRAMIENTAS,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 700,
    }),
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text();
    throw new Error(`Groq respondió ${respuesta.status}: ${texto.slice(0, 300)}`);
  }

  const datos = await respuesta.json();
  return datos.choices?.[0]?.message as {
    role: string;
    content: string | null;
    tool_calls?: { id: string; function: { name: string; arguments: string } }[];
  };
}

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 501 });
  }

  await requireUser();
  const supabase = createClient();

  const body = await req.json().catch(() => null);
  const historial: Rol[] = Array.isArray(body?.mensajes) ? body.mensajes : [];
  if (historial.length === 0) {
    return NextResponse.json({ error: "Falta el mensaje" }, { status: 400 });
  }

  const mensajes: Rol[] = [{ role: "system", content: systemPrompt() }, ...historial];

  try {
    let mensaje = await llamarGroq(mensajes, apiKey);
    let vueltas = 0;

    while (mensaje.tool_calls && mensaje.tool_calls.length > 0 && vueltas < 3) {
      mensajes.push({ role: "assistant", content: mensaje.content ?? "", tool_calls: mensaje.tool_calls });
      for (const llamada of mensaje.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(llamada.function.arguments || "{}");
        } catch {
          // argumentos invalidos: se ejecuta con {} por defecto
        }
        const resultado = await ejecutarHerramienta(llamada.function.name, args, supabase);
        mensajes.push({ role: "tool", tool_call_id: llamada.id, content: JSON.stringify(resultado) });
      }
      mensaje = await llamarGroq(mensajes, apiKey);
      vueltas++;
    }

    return NextResponse.json({ texto: mensaje.content ?? "No pude generar una respuesta." });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al consultar la IA" },
      { status: 502 }
    );
  }
}
