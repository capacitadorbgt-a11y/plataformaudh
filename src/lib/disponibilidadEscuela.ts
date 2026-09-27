import { sumarDias } from "@/lib/importarSeguimientosDatos";

// Duracion fija de todo proceso de capacitacion (regla de negocio ya usada
// en la importacion de seguimientos y en el generador de informes).
const DURACION_PROCESO_DIAS = 4;
// Mismo criterio que usa el Panel para marcar un seguimiento "con demora":
// sigue EN_PROCESO 3 dias despues de su fecha de inicio.
const DIAS_DEMORA = 3;
const DIAS_MAX_BUSQUEDA_CUPO = 90;

export interface SeguimientoParaDisponibilidad {
  fecha_capacitacion: string | null;
  estado_proceso: "EN_PROCESO" | "FINALIZADO";
}

export type Semaforo = "verde" | "amarillo" | "rojo";

export interface Disponibilidad {
  cuposOcupados: number;
  cuposLibres: number | null;
  hayDemoras: boolean;
  proximaFechaLibre: string | null;
  semaforo: Semaforo;
}

function seSuperponen(inicioA: string, finA: string, inicioB: string, finB: string): boolean {
  return inicioA <= finB && inicioB <= finA;
}

function ventana(fechaInicio: string): { inicio: string; fin: string } {
  return { inicio: fechaInicio, fin: sumarDias(fechaInicio, DURACION_PROCESO_DIAS) ?? fechaInicio };
}

export function calcularDisponibilidad(
  escuela: { capacidad: number | null; estado: string },
  seguimientos: SeguimientoParaDisponibilidad[],
  fechaTentativa: string
): Disponibilidad {
  const enProceso = seguimientos.filter(
    (s): s is SeguimientoParaDisponibilidad & { fecha_capacitacion: string } =>
      s.estado_proceso === "EN_PROCESO" && !!s.fecha_capacitacion
  );

  const contarOcupacion = (fechaInicio: string) => {
    const { inicio, fin } = ventana(fechaInicio);
    return enProceso.filter((s) => {
      const v = ventana(s.fecha_capacitacion);
      return seSuperponen(inicio, fin, v.inicio, v.fin);
    }).length;
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const hayDemoras = enProceso.some((s) => {
    const limite = sumarDias(s.fecha_capacitacion, DIAS_DEMORA);
    return limite != null && limite <= hoy;
  });

  const capacidad = escuela.capacidad ?? null;
  const cuposOcupados = contarOcupacion(fechaTentativa);
  const cuposLibres = capacidad != null ? Math.max(capacidad - cuposOcupados, 0) : null;
  const llena = capacidad != null && cuposLibres === 0;

  let proximaFechaLibre: string | null = null;
  if (llena && capacidad != null) {
    let candidata = fechaTentativa;
    for (let i = 0; i < DIAS_MAX_BUSQUEDA_CUPO; i++) {
      const siguiente = sumarDias(candidata, 1);
      if (!siguiente) break;
      candidata = siguiente;
      if (contarOcupacion(candidata) < capacidad) {
        proximaFechaLibre = candidata;
        break;
      }
    }
  }

  let semaforo: Semaforo = "verde";
  if (escuela.estado === "INACTIVO" || llena) {
    semaforo = "rojo";
  } else if (escuela.estado === "REVISION" || hayDemoras || (cuposLibres != null && cuposLibres <= 1)) {
    semaforo = "amarillo";
  }

  return { cuposOcupados, cuposLibres, hayDemoras, proximaFechaLibre, semaforo };
}
