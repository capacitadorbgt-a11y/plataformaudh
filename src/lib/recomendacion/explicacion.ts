import "server-only";
import type { Semaforo } from "@/lib/disponibilidadEscuela";

export interface CandidatoExplicacion {
  escuelaId: string;
  nombre: string;
  km: number;
  min: number;
  cuposLibres: number | null;
  hayDemoras: boolean;
  semaforo: Semaforo;
  estado: string;
  proximaFechaLibre: string | null;
}

export function formatoCorto(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
}

function cuposTexto(c: CandidatoExplicacion): string {
  if (c.cuposLibres == null) return "sin dato de cupo";
  if (c.cuposLibres === 0) return "sin cupo libre";
  return `${c.cuposLibres} cupo${c.cuposLibres === 1 ? "" : "s"} libre${c.cuposLibres === 1 ? "" : "s"}`;
}

function motivoDescarte(c: CandidatoExplicacion): string {
  if (c.estado === "INACTIVO") return `${c.nombre} está inactiva`;
  if (c.cuposLibres === 0) {
    return `${c.nombre} no tiene cupo en esa fecha${c.proximaFechaLibre ? ` (se libera el ${formatoCorto(c.proximaFechaLibre)})` : ""}`;
  }
  if (c.hayDemoras) return `${c.nombre} tiene un proceso con demora en curso`;
  if (c.estado === "REVISION") return `${c.nombre} está en revisión`;
  return `${c.nombre} no es la mejor opción disponible ahora`;
}

// Explicación en una sola frase, sin depender de ninguna IA: siempre
// disponible, es la que se usa si no hay ANTHROPIC_API_KEY o si la llamada
// a Claude falla.
export function explicacionPlantilla(mejor: CandidatoExplicacion, masCercanaDescartada: CandidatoExplicacion | null): string {
  if (!masCercanaDescartada || masCercanaDescartada.escuelaId === mejor.escuelaId) {
    return `Te sugiero ${mejor.nombre}: es la opción más conveniente (~${Math.round(mejor.min)} min, ${cuposTexto(mejor)}).`;
  }

  const diferenciaMin = Math.round(mejor.min - masCercanaDescartada.min);
  const comparacion = diferenciaMin > 0 ? `aunque queda ${diferenciaMin} minutos más lejos que ${masCercanaDescartada.nombre}, ` : "";

  return `Te sugiero ${mejor.nombre} y no ${masCercanaDescartada.nombre}, ${comparacion}porque ${motivoDescarte(masCercanaDescartada)}.`;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Si hay ANTHROPIC_API_KEY, se le pide a Claude que redacte la misma
// explicación de forma más natural, a partir ÚNICAMENTE de los hechos ya
// calculados (nunca se le pide que invente datos). Si no hay key o la
// llamada falla, se devuelve la plantilla tal cual.
export async function generarExplicacion(
  mejor: CandidatoExplicacion,
  masCercanaDescartada: CandidatoExplicacion | null,
  notaAgrupamiento: string | null
): Promise<string> {
  const plantilla = explicacionPlantilla(mejor, masCercanaDescartada);
  const base = notaAgrupamiento ? `${plantilla} ${notaAgrupamiento}` : plantilla;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return base;

  const modelo = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const hechos = {
    recomendada: { nombre: mejor.nombre, minutos: Math.round(mejor.min), cupos: cuposTexto(mejor), semaforo: mejor.semaforo },
    alternativaMasCercanaDescartada: masCercanaDescartada
      ? {
          nombre: masCercanaDescartada.nombre,
          minutos: Math.round(masCercanaDescartada.min),
          motivo: motivoDescarte(masCercanaDescartada),
        }
      : null,
    notaAgrupamiento,
  };

  try {
    const respuesta = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content:
              "Redacta en español, en UNA sola frase corta (máximo 35 palabras), la recomendación de escuela de formación para un capacitador de Bogati, usando EXCLUSIVAMENTE estos hechos (no inventes datos que no estén aquí):\n" +
              JSON.stringify(hechos) +
              '\n\nEstilo: directo, como "Te sugiero X y no Y, aunque queda N minutos más lejos, porque...". Devuelve solo la frase, sin comillas ni explicación adicional.',
          },
        ],
      }),
    });

    if (!respuesta.ok) return base;
    const datos = await respuesta.json();
    const texto = datos?.content?.[0]?.text?.trim();
    if (!texto || texto.length > 400) return base;
    return texto;
  } catch {
    return base;
  }
}
