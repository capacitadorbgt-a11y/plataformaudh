import type { Semaforo } from "@/lib/disponibilidadEscuela";

// Pesos del puntaje compuesto (suman 1). Ajustables sin tocar el resto de
// la lógica: cada uno multiplica un componente ya normalizado a 0..1.
export const PESOS = {
  tiempo: 0.35,
  cupos: 0.25,
  sinDemoras: 0.15,
  aprobacion: 0.15,
  nps: 0.1,
} as const;

// Minutos de viaje a partir de los cuales el componente de tiempo se
// considera "0" (referencia, no un límite duro: solo aplana la curva).
const MIN_REFERENCIA = 180;
// Con 3 o más cupos libres el componente de cupos ya vale el máximo.
const CUPOS_REFERENCIA = 3;

export interface DatosParaScore {
  escuelaId: string;
  estado: string;
  km: number;
  min: number;
  cuposLibres: number | null;
  hayDemoras: boolean;
  semaforo: Semaforo;
  tasaAprobacion: number | null;
  nps: number | null;
}

export interface ResultadoScore {
  escuelaId: string;
  score: number;
  descalificada: boolean;
}

export function scoreEscuela(datos: DatosParaScore): ResultadoScore {
  const sinCupo = datos.cuposLibres != null && datos.cuposLibres <= 0;
  if (datos.estado === "INACTIVO" || sinCupo) {
    return { escuelaId: datos.escuelaId, score: 0, descalificada: true };
  }

  const scoreTiempo = Math.max(0, 1 - datos.min / MIN_REFERENCIA);
  const scoreCupos = datos.cuposLibres == null ? 0.5 : Math.min(datos.cuposLibres / CUPOS_REFERENCIA, 1);
  const scoreSinDemoras = datos.hayDemoras ? 0 : 1;
  const scoreAprobacion = datos.tasaAprobacion ?? 0.5;
  const scoreNps = datos.nps == null ? 0.5 : (datos.nps + 100) / 200;

  const score =
    PESOS.tiempo * scoreTiempo +
    PESOS.cupos * scoreCupos +
    PESOS.sinDemoras * scoreSinDemoras +
    PESOS.aprobacion * scoreAprobacion +
    PESOS.nps * scoreNps;

  // El estado (ACTIVO antes que REVISION) no se mezcla aquí: es un criterio
  // de orden aparte que aplica recomendarEscuela() antes de comparar score,
  // para que una ACTIVO nunca pierda frente a una REVISION sin importar
  // cuánto más alto salga el puntaje de esta última.
  return { escuelaId: datos.escuelaId, score, descalificada: false };
}
