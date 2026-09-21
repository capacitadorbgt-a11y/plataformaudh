import {
  actividadesPlanNoCumplidas,
  esMarcaNoCumple,
  normalizar,
  parametrosNoCumplidos,
  statsPorColaborador,
  statsPorDia,
  totalizar,
  type CriterioDiagnostico,
  type DatosInformeDiagnostico,
} from "@/lib/informeDiagnosticoDatos";

const OBJETIVO_GENERAL_BASE =
  "Capacitar en todos los procesos teóricos-prácticos para la formación de nuevos prospectos para laborar en " +
  "tiendas Bogati, lo cual se debería enfatizar en aprendizaje en la parte práctica, lo cual se requiere " +
  "tecnificar, para asegurar que los postulantes sean capaces de aplicar lo aprendido en situaciones reales.";

export function textoObjetivoGeneral(fechaDiagnostico: string | null, fechaPlan: string | null, fechaRespaldo: string | null): string[] {
  const fecha1 = fechaDiagnostico || fechaRespaldo;
  const fecha2 = fechaPlan || fechaRespaldo;
  let segunda: string;
  if (fecha1 && fecha2 && fecha1 !== fecha2) {
    segunda =
      `La observación y capacitación de este PDV se realizó en dos fechas de visita: el ${fecha1} ` +
      `(evaluación diagnóstica) y el ${fecha2} (ejecución del plan de trabajo en Escuela de Formación).`;
  } else if (fecha1 || fecha2) {
    segunda = `La observación y capacitación de este PDV se realizó en la fecha de visita: ${fecha1 || fecha2}.`;
  } else {
    segunda = "La observación y capacitación de este PDV se realizó según lo registrado en el proceso de seguimiento de la escuela.";
  }
  return [OBJETIVO_GENERAL_BASE, segunda];
}

function categoriasConMasFallos(criterios: CriterioDiagnostico[], etiqueta: string): string {
  const conteo = new Map<string, number>();
  for (const c of criterios) {
    const marca = c.marcas.find((m) => m.etiqueta === etiqueta);
    if (marca && esMarcaNoCumple(marca.valor)) {
      conteo.set(c.categoria, (conteo.get(c.categoria) ?? 0) + 1);
    }
  }
  return [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([categoria]) => categoria.toLowerCase())
    .join(" y ");
}

function criterioSinCumplimientoAlguno(criterios: CriterioDiagnostico[]) {
  return criterios.find((c) => c.marcas.length > 0 && c.marcas.every((m) => esMarcaNoCumple(m.valor)));
}

// Las etiquetas de colaborador combinan rol y nombre ("ADMIN (Henrry)") para
// las tablas; en prosa es más natural referirse solo al nombre.
function soloNombre(etiqueta: string): string {
  return etiqueta.match(/\(([^)]+)\)/)?.[1] ?? etiqueta;
}

export function textoConclusiones(datos: DatosInformeDiagnostico, nombreEscuela: string): string[] {
  const statsColab = statsPorColaborador(datos.criteriosDiagnostico);
  const totalDiag = totalizar("TOTAL Evaluación Diagnóstica", statsColab);
  const statsDia = statsPorDia(datos.filasPlan);
  const totalPlan = totalizar("TOTAL Plan de Trabajo", statsDia);

  const bullets: string[] = [];

  if (totalDiag.evaluados > 0 || totalPlan.evaluados > 0) {
    bullets.push(
      `El PDV ${nombreEscuela} obtuvo un cumplimiento de ${totalDiag.pct.toFixed(1)}% en el diagnóstico y de ` +
        `${totalPlan.pct.toFixed(1)}% en el plan de trabajo.`
    );
  }

  if (statsColab.length > 1) {
    const peor = [...statsColab].sort((a, b) => a.pct - b.pct)[0];
    const mejor = [...statsColab].sort((a, b) => b.pct - a.pct)[0];
    if (peor.pct < mejor.pct) {
      const categorias = categoriasConMasFallos(datos.criteriosDiagnostico, peor.etiqueta);
      bullets.push(
        `${soloNombre(peor.etiqueta)} presenta el menor nivel de cumplimiento (${peor.pct.toFixed(1)}%)` +
          `${categorias ? `, principalmente en ${categorias}` : ""}.`
      );
    } else if (peor.evaluados > 0) {
      bullets.push(`Todos los colaboradores evaluados alcanzaron el mismo nivel de cumplimiento (${peor.pct.toFixed(1)}%).`);
    }
  }

  if (totalPlan.evaluados > 0) {
    if (totalPlan.noCumple === 0) {
      bullets.push("El plan de trabajo se ejecutó y cumplió en su totalidad durante los días de visita programados.");
    } else {
      bullets.push(
        `Del plan de trabajo, ${totalPlan.noCumple} de ${totalPlan.evaluados} actividades no se cumplieron al momento de la visita.`
      );
    }
  }

  const criterioUnanime = criterioSinCumplimientoAlguno(datos.criteriosDiagnostico);
  if (criterioUnanime) {
    bullets.push(
      `"${criterioUnanime.detalle}" es una debilidad compartida por todos los colaboradores evaluados, ninguno de los cuales cumple este criterio.`
    );
  }

  const hallazgos = cruceObservaciones(datos).length;
  if (hallazgos > 0) {
    bullets.push(
      `Se registran ${hallazgos} observaciones adicionales del evaluador durante la visita, detalladas en la sección 3 de este informe.`
    );
  }

  if (bullets.length === 0) {
    bullets.push(`No se registraron suficientes datos de evaluación para ${nombreEscuela} en el archivo cargado.`);
  }

  return bullets.slice(0, 6);
}

export function textoRecomendaciones(datos: DatosInformeDiagnostico): string[] {
  const statsColab = statsPorColaborador(datos.criteriosDiagnostico);
  const recomendaciones: string[] = [];

  if (statsColab.length > 1) {
    const peor = [...statsColab].sort((a, b) => a.pct - b.pct)[0];
    const mejor = [...statsColab].sort((a, b) => b.pct - a.pct)[0];
    if (peor.pct < mejor.pct) {
      const categorias = categoriasConMasFallos(datos.criteriosDiagnostico, peor.etiqueta);
      recomendaciones.push(
        `Reforzar con ${soloNombre(peor.etiqueta)} los criterios de${categorias ? ` ${categorias}` : " la evaluación diagnóstica"} mediante seguimiento individual.`
      );
    }
  }

  const criterioUnanime = criterioSinCumplimientoAlguno(datos.criteriosDiagnostico);
  if (criterioUnanime) {
    recomendaciones.push(`Explicar a todo el personal el criterio "${criterioUnanime.detalle}", dado que ningún colaborador lo cumple actualmente.`);
  }

  const pendientes = actividadesPlanNoCumplidas(datos.filasPlan);
  for (const actividad of pendientes.slice(0, 3)) {
    recomendaciones.push(`Dar seguimiento a la actividad "${actividad.texto}" del plan de trabajo hasta completar su cumplimiento.`);
  }
  if (pendientes.length === 0 && datos.filasPlan.some((f) => f.tipo === "actividad")) {
    recomendaciones.push("Mantener el estándar alcanzado en el plan de trabajo mediante refuerzos periódicos.");
  }

  const parametros = parametrosNoCumplidos(datos.criteriosDiagnostico);
  const categoriasFrecuentes = [...new Set(parametros.map((p) => p.categoria))].slice(0, 2);
  for (const categoria of categoriasFrecuentes) {
    recomendaciones.push(`Dar seguimiento a los parámetros de ${categoria.toLowerCase()} en la próxima visita.`);
  }

  if (datos.observacionesGeneralesPlan) {
    recomendaciones.push(`Atender las observaciones registradas por el evaluador durante la ejecución del plan de trabajo: ${datos.observacionesGeneralesPlan}`);
  }

  recomendaciones.push("Programar una visita de seguimiento para verificar la implementación de las acciones correctivas antes de la próxima evaluación.");

  return [...new Set(recomendaciones)].slice(0, 7);
}

const PALABRAS_VACIAS = new Set([
  "PARA", "COMO", "PERO", "DESDE", "HASTA", "ENTRE", "SOBRE", "ESTE", "ESTA", "ESTOS", "ESTAS",
  "CUANDO", "DONDE", "PORQUE", "TIENE", "TIENEN", "SIDO", "FUERON", "ESTABA", "ESTAN", "CADA",
  "TODO", "TODA", "TODOS", "TODAS", "DURANTE", "DEBE", "DEBEN", "SEGUN",
  // Términos genéricos del dominio (aparecen en casi cualquier hallazgo y
  // acción por igual) que no sirven para distinguir un tema de otro.
  "FORMACION", "ESCUELA", "PROCESO", "PERSONAL", "VISITA", "TRABAJO", "REALIZO",
  "REALIZA", "REALIZAR", "PLAN", "BOGATI", "PUNTO", "VENTA", "PRODUCTO", "PRODUCTOS",
]);

function palabrasClave(texto: string): Set<string> {
  return new Set(normalizar(texto).split(/[^A-Z0-9]+/).filter((w) => w.length >= 5 && !PALABRAS_VACIAS.has(w)));
}

export interface CruceObservacion {
  hallazgo: string;
  accion: string;
}

// Sin un motor de IA en el navegador, el cruce hallazgo/acción se aproxima por
// coincidencia de palabras clave entre las observaciones del diagnóstico y las
// del plan de trabajo. Es una heurística, no una lectura semántica real.
export function cruceObservaciones(datos: DatosInformeDiagnostico): CruceObservacion[] {
  let hallazgos: string[] = [];
  if (datos.observacionesGeneralesDiagnostico) {
    // Las notas del evaluador suelen venir como párrafos separados por línea
    // en blanco (una idea completa cada uno) o, dentro de un mismo párrafo,
    // como una lista de una idea por línea. Se respeta esa estructura en vez
    // de cortar por oración, que fragmentaba ideas que debían ir juntas.
    for (const bloque of datos.observacionesGeneralesDiagnostico.split(/\n\s*\n+/)) {
      const lineas = bloque.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      if (lineas.length > 1) hallazgos.push(...lineas);
      else if (lineas.length === 1) hallazgos.push(lineas[0].replace(/\s+/g, " "));
    }
    hallazgos = hallazgos.filter((s) => s.length > 10);
  }

  if (hallazgos.length === 0) {
    const porCategoria = new Map<string, string[]>();
    for (const p of parametrosNoCumplidos(datos.criteriosDiagnostico)) {
      const lista = porCategoria.get(p.categoria) ?? [];
      lista.push(p.detalle);
      porCategoria.set(p.categoria, lista);
    }
    hallazgos = [...porCategoria.entries()].map(
      ([categoria, detalles]) => `Se identifican incumplimientos en ${categoria.toLowerCase()}: ${detalles.slice(0, 4).join(", ")}.`
    );
  }

  if (hallazgos.length === 0) return [];

  const acciones: { texto: string; palabras: Set<string> }[] = [];
  for (const f of datos.filasPlan) {
    if (f.tipo === "actividad" && f.observaciones) {
      const texto = `${f.texto}: ${f.observaciones}`;
      acciones.push({ texto, palabras: palabrasClave(texto) });
    } else if (f.tipo === "categoria" && f.observaciones) {
      const texto = `${f.texto} ${f.observaciones}`;
      acciones.push({ texto, palabras: palabrasClave(texto) });
    }
  }
  if (datos.observacionesGeneralesPlan) {
    acciones.push({ texto: datos.observacionesGeneralesPlan, palabras: palabrasClave(datos.observacionesGeneralesPlan) });
  }

  return hallazgos.map((hallazgo) => {
    const palabrasHallazgo = palabrasClave(hallazgo);
    let mejor: { texto: string; coincidencias: number } | null = null;
    for (const accion of acciones) {
      const coincidencias = [...palabrasHallazgo].filter((w) => accion.palabras.has(w)).length;
      // Se exigen al menos 2 palabras clave compartidas: con 1 sola coincidencia
      // el cruce resultaba en falsos positivos entre temas no relacionados.
      if (coincidencias >= 2 && (!mejor || coincidencias > mejor.coincidencias)) {
        mejor = { texto: accion.texto, coincidencias };
      }
    }
    return {
      hallazgo,
      accion: mejor
        ? `Se registra una acción relacionada en el plan de trabajo: "${mejor.texto}".`
        : "Sin evidencia de acción registrada en el plan de trabajo. Queda pendiente de verificación en la siguiente visita.",
    };
  });
}
