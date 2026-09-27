import { normalizarCiudad } from "@/lib/geoEcuador";

// "aspirante_aprobado" es texto libre con el NOMBRE del aprobado cuando lo
// hay; "-" y "CANCELADO" son los dos valores que en la práctica significan
// "nadie fue aprobado" (verificado contra datos reales: aspirantes[].aprobado
// nunca se usa en producción, siempre queda en false, así que no sirve como
// fuente de la tasa de aprobación).
function esAprobacionReal(valor: string | null): boolean {
  if (!valor) return false;
  const v = valor.trim().toUpperCase();
  return v !== "" && v !== "-" && v !== "CANCELADO";
}

export function calcularTasaAprobacion(
  seguimientos: { estado_proceso: string; aspirante_aprobado: string | null }[]
): number | null {
  const finalizados = seguimientos.filter((s) => s.estado_proceso === "FINALIZADO");
  if (finalizados.length === 0) return null;
  const aprobados = finalizados.filter((s) => esAprobacionReal(s.aspirante_aprobado)).length;
  return aprobados / finalizados.length;
}

// "encuestas" no tiene escuela_id: se relaciona con un PDV por el texto
// libre pdv_capacitacion. El cruce es aproximado (coincidencia por texto
// normalizado, exacta o por inclusión) y puede no encontrar nada para una
// escuela — en ese caso se devuelve null y no se penaliza en el score.
export function calcularNpsPromedio(
  nombreEscuela: string,
  encuestas: { pdv_capacitacion: string; nps: number | null }[]
): number | null {
  const objetivo = normalizarCiudad(nombreEscuela);
  if (!objetivo) return null;

  const coincidentes = encuestas.filter((e) => {
    const pdv = normalizarCiudad(e.pdv_capacitacion);
    return !!pdv && (pdv === objetivo || pdv.includes(objetivo) || objetivo.includes(pdv));
  });
  const conNps = coincidentes.filter((e): e is { pdv_capacitacion: string; nps: number } => typeof e.nps === "number");
  if (conNps.length === 0) return null;
  return conNps.reduce((acc, e) => acc + e.nps, 0) / conNps.length;
}
