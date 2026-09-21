import type { ActividadPlan, CriterioDiagnostico, DatosInformeDiagnostico } from "@/lib/informeDiagnosticoDatos";

const OBJETIVO_GENERAL_BASE =
  "Capacitar en todos los procesos teórico-prácticos para la formación de nuevos prospectos para laborar en " +
  "tiendas Bogati, lo cual se debe enfatizar en el aprendizaje de la parte práctica, la cual se requiere " +
  "tecnificar, para asegurar que los postulantes sean capaces de aplicar lo aprendido en situaciones reales.";

export function textoObjetivoGeneral(fechaVisita: string | null, fechaRespaldo: string | null): string[] {
  const fecha = fechaVisita || fechaRespaldo;
  const segundaLinea = fecha
    ? `La observación y capacitación de este PDV se realizó en la fecha de visita: ${fecha}.`
    : "La observación y capacitación de este PDV se realizó según lo registrado en el proceso de seguimiento de la escuela.";
  return [OBJETIVO_GENERAL_BASE, segundaLinea];
}

export function textoCriteriosInterpretacion(): string[] {
  return [
    "Los resultados de la evaluación diagnóstica y del plan de trabajo se interpretan de acuerdo con la siguiente marcación:",
    "• X / ✓ — Cumple: el criterio evaluado se satisface conforme al estándar establecido por la Universidad del Helado.",
    "• – (guion) — No cumple: el criterio evaluado no se satisface y requiere una acción correctiva.",
    "• En blanco — No evaluado (evaluación diagnóstica) o No se realizó (plan de trabajo): el criterio no fue calificado durante la visita.",
  ];
}

export function criteriosNoCumplen(criterios: CriterioDiagnostico[]): CriterioDiagnostico[] {
  return criterios.filter((c) => c.estado === "NO_CUMPLE");
}

export function actividadesNoCumplen(actividades: ActividadPlan[]): ActividadPlan[] {
  return actividades.filter((a) => a.estado !== "CUMPLE");
}

export function textoConclusiones(datos: DatosInformeDiagnostico, nombreEscuela: string): string {
  const { criteriosDiagnostico, actividadesPlan } = datos;
  const totalCriterios = criteriosDiagnostico.length;
  const noCumplenCriterios = criteriosNoCumplen(criteriosDiagnostico).length;
  const cumplenCriterios = criteriosDiagnostico.filter((c) => c.estado === "CUMPLE").length;

  const totalActividades = actividadesPlan.length;
  const noCumplenActividades = actividadesPlan.filter((a) => a.estado === "NO_CUMPLE").length;
  const noRealizadas = actividadesPlan.filter((a) => a.estado === "NO_REALIZADO").length;

  const frases: string[] = [];

  if (totalCriterios > 0) {
    frases.push(
      `Se determina que, de los ${totalCriterios} criterios evaluados en la visita diagnóstica a ${nombreEscuela}, ${cumplenCriterios} ` +
        `se cumplen conforme al estándar de la Universidad del Helado${noCumplenCriterios > 0 ? ` y ${noCumplenCriterios} presentan incumplimiento` : ""}.`
    );
  }

  if (totalActividades > 0) {
    if (noCumplenActividades === 0 && noRealizadas === 0) {
      frases.push("Se evidencia que las actividades del plan de trabajo fueron ejecutadas y cumplidas en su totalidad.");
    } else {
      frases.push(
        `Se evidencia que, del plan de trabajo, ${noCumplenActividades} actividad(es) no cumplen el estándar esperado y ${noRealizadas} ` +
          "no fueron ejecutadas al momento de la visita."
      );
    }
  }

  if (noCumplenCriterios === 0 && noCumplenActividades === 0) {
    frases.push(
      `Se concluye que ${nombreEscuela} evidencia un desempeño satisfactorio y cumple con los parámetros requeridos ` +
        "para mantener su condición de Escuela de Formación."
    );
  } else {
    frases.push(
      `Se concluye que ${nombreEscuela} requiere atender los puntos señalados en este informe para asegurar el ` +
        "cumplimiento pleno de los estándares operativos y de equipo humano exigidos a una Escuela de Formación."
    );
  }

  return frases.join(" ");
}

export function textoRecomendaciones(datos: DatosInformeDiagnostico): string[] {
  const incumplidos = criteriosNoCumplen(datos.criteriosDiagnostico);
  const actividadesPendientes = actividadesNoCumplen(datos.actividadesPlan);

  const recomendaciones: string[] = [];

  for (const criterio of incumplidos) {
    recomendaciones.push(`Atender el criterio "${criterio.detalle}" (${criterio.categoria}) hasta alcanzar su cumplimiento.`);
  }

  for (const actividad of actividadesPendientes) {
    recomendaciones.push(`Dar seguimiento a la actividad "${actividad.actividad}" del plan de trabajo hasta completar su cumplimiento.`);
  }

  if (datos.observacionesPlan) {
    recomendaciones.push(`Atender las observaciones registradas por el evaluador durante la visita: ${datos.observacionesPlan}`);
  }

  if (recomendaciones.length === 0) {
    recomendaciones.push(
      "Mantener el monitoreo periódico de los estándares operativos y de equipo humano para conservar la condición de Escuela de Formación."
    );
  } else {
    recomendaciones.push(
      "Programar una visita de seguimiento para verificar la implementación de las acciones correctivas antes de la próxima evaluación."
    );
  }

  return recomendaciones;
}
