import type { Escuela } from "@/types/database";
import {
  esMarcaCumple,
  esMarcaNoCumple,
  parametrosNoCumplidos,
  statsPorColaborador,
  statsPorDia,
  totalizar,
  type DatosInformeDiagnostico,
  type FilaPlan,
} from "@/lib/informeDiagnosticoDatos";
import { cruceObservaciones, textoConclusiones, textoObjetivoGeneral, textoRecomendaciones } from "@/lib/informeDiagnosticoTexto";

const NAVY: [number, number, number] = [23, 43, 76];
const ORANGE: [number, number, number] = [244, 124, 1];
const PEACH: [number, number, number] = [255, 241, 228];
const BLUE_LIGHT: [number, number, number] = [233, 240, 248];
const GREEN_BG: [number, number, number] = [226, 239, 218];
const GREEN_TEXT: [number, number, number] = [46, 125, 50];
const RED_BG: [number, number, number] = [252, 228, 228];
const RED_TEXT: [number, number, number] = [192, 57, 43];
const GRAY_BG: [number, number, number] = [237, 237, 237];
const GRAY_TEXT: [number, number, number] = [127, 127, 127];
const DARK_TEXT: [number, number, number] = [45, 45, 45];

const MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_TOP = 16;
const CONTENT_BOTTOM = PAGE_HEIGHT - 16;

function slugArchivo(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Celda {
  content: string;
  styles?: Record<string, unknown>;
  colSpan?: number;
}

function celda(content: string, styles?: Record<string, unknown>, colSpan?: number): Celda {
  return { content, styles, colSpan };
}

function celdaEstado(texto: "Cumple" | "No cumple" | "No evaluado" | "No realizado"): Celda {
  if (texto === "Cumple") return celda(texto, { fillColor: GREEN_BG, textColor: GREEN_TEXT, fontStyle: "bold" });
  if (texto === "No cumple") return celda(texto, { fillColor: RED_BG, textColor: RED_TEXT, fontStyle: "bold" });
  return celda(texto, { fillColor: GRAY_BG, textColor: GRAY_TEXT });
}

function estadoDiagnostico(valor: string): "Cumple" | "No cumple" | "No evaluado" {
  if (esMarcaCumple(valor)) return "Cumple";
  if (esMarcaNoCumple(valor)) return "No cumple";
  return "No evaluado";
}

function estadoPlan(valor: string): "Cumple" | "No cumple" | "No realizado" {
  if (esMarcaCumple(valor)) return "Cumple";
  if (esMarcaNoCumple(valor)) return "No realizado";
  return "No realizado";
}

export async function generarInformePDF(params: {
  escuela: Pick<Escuela, "nombre" | "fecha_ultima_visita">;
  datos: DatosInformeDiagnostico;
}): Promise<{ blob: Blob; nombreArchivo: string }> {
  const { escuela, datos } = params;

  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { poppinsRegularBase64 } = await import("@/lib/fonts/poppinsRegular");
  const { poppinsSemiBoldBase64 } = await import("@/lib/fonts/poppinsSemiBold");
  const { poppinsBoldBase64 } = await import("@/lib/fonts/poppinsBold");

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.addFileToVFS("Poppins-Regular.ttf", poppinsRegularBase64);
  doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
  doc.addFileToVFS("Poppins-SemiBold.ttf", poppinsSemiBoldBase64);
  doc.addFont("Poppins-SemiBold.ttf", "Poppins", "bold");
  doc.addFileToVFS("Poppins-Bold.ttf", poppinsBoldBase64);
  doc.addFont("Poppins-Bold.ttf", "PoppinsBold", "normal");
  doc.setFont("Poppins", "normal");

  let y = CONTENT_TOP;

  function dibujarFooterBase() {
    const footY = PAGE_HEIGHT - 10;
    const navyWidth = PAGE_WIDTH * 0.5;
    doc.setFillColor(...NAVY);
    doc.rect(0, footY, navyWidth, 10, "F");
    doc.setFillColor(...ORANGE);
    doc.rect(navyWidth, footY, PAGE_WIDTH - navyWidth, 10, "F");
    doc.setFont("Poppins", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Universidad del Helado", MARGIN, PAGE_HEIGHT - 4);
    doc.setTextColor(...DARK_TEXT);
  }

  function nuevaPagina() {
    doc.addPage();
    dibujarFooterBase();
    y = CONTENT_TOP;
  }

  function asegurarEspacio(altura: number) {
    if (y + altura > CONTENT_BOTTOM) nuevaPagina();
  }

  function sincronizarDespuesDeTabla() {
    // @ts-expect-error -- lastAutoTable es agregado por el plugin jspdf-autotable
    y = (doc.lastAutoTable?.finalY ?? y) + 6;
  }

  function dibujarBarraSeccion(numero: string, titulo: string, subtitulo?: string) {
    const alto = subtitulo ? 13 : 8;
    asegurarEspacio(alto + 4);
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, y, CONTENT_WIDTH, alto, "F");
    doc.setFont("PoppinsBold", "normal");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`${numero} ${titulo}`, MARGIN + 3, y + 5.5);
    if (subtitulo) {
      doc.setFont("Poppins", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(215, 222, 233);
      doc.text(subtitulo, MARGIN + 3, y + 10.5);
    }
    doc.setTextColor(...DARK_TEXT);
    y += alto + 4;
  }

  function subtitulo(texto: string) {
    asegurarEspacio(8);
    doc.setFont("Poppins", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    doc.text(texto, MARGIN, y + 4);
    doc.setTextColor(...DARK_TEXT);
    y += 8;
  }

  function escribirParrafo(
    texto: string,
    opts: { negrita?: boolean; fondo?: [number, number, number]; tamano?: number; espacioDespues?: number; sangria?: number } = {}
  ) {
    const tamano = opts.tamano ?? 10;
    const sangria = opts.sangria ?? 0;
    doc.setFont("Poppins", opts.negrita ? "bold" : "normal");
    doc.setFontSize(tamano);
    const lineas = doc.splitTextToSize(texto, CONTENT_WIDTH - 6 - sangria) as string[];
    const alturaLinea = tamano * 0.42;
    const alturaBloque = lineas.length * alturaLinea + 4;

    asegurarEspacio(alturaBloque);

    if (opts.fondo) {
      doc.setFillColor(...opts.fondo);
      doc.rect(MARGIN, y, CONTENT_WIDTH, alturaBloque, "F");
    }

    doc.setTextColor(...DARK_TEXT);
    doc.text(lineas, MARGIN + 3 + sangria, y + alturaLinea);
    y += alturaBloque + (opts.espacioDespues ?? 3);
  }

  function tablaEstandar(head: string[][], body: (string | Celda)[][]) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: 12, bottom: 14 },
      head,
      body: body as never,
      styles: { font: "Poppins", fontSize: 8.5, cellPadding: 2, textColor: DARK_TEXT, overflow: "linebreak", valign: "middle" },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], font: "Poppins", fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 249, 250] },
      didDrawPage: () => dibujarFooterBase(),
    });
    sincronizarDespuesDeTabla();
  }

  function dibujarCajaFicha(titulo: string, color: [number, number, number], campos: [string, string][]) {
    const altoCaja = 11 + campos.length * 5.5;
    asegurarEspacio(altoCaja + 4);
    doc.setFillColor(...color);
    doc.rect(MARGIN, y, CONTENT_WIDTH, altoCaja, "F");
    doc.setFont("Poppins", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(titulo, MARGIN + 4, y + 7);
    let yy = y + 13;
    doc.setFontSize(9.5);
    for (const [label, valor] of campos) {
      doc.setFont("Poppins", "bold");
      doc.setTextColor(...NAVY);
      doc.text(`${label}:`, MARGIN + 4, yy);
      const anchoLabel = doc.getTextWidth(`${label}: `);
      doc.setFont("Poppins", "normal");
      doc.setTextColor(...DARK_TEXT);
      doc.text(valor, MARGIN + 4 + anchoLabel, yy);
      yy += 5.5;
    }
    doc.setTextColor(...DARK_TEXT);
    y += altoCaja + 5;
  }

  // ---------------------------------------------------------------------
  // Portada
  // ---------------------------------------------------------------------
  dibujarFooterBase();

  const { logoUdhBase64 } = await import("@/lib/assets/logoUdh");
  const logoDataUrl = `data:image/jpeg;base64,${logoUdhBase64}`;
  const logoProps = doc.getImageProperties(logoDataUrl);
  const logoAncho = 26;
  const logoAlto = (logoAncho * logoProps.height) / logoProps.width;
  doc.addImage(logoDataUrl, PAGE_WIDTH - MARGIN - logoAncho, y, logoAncho, logoAlto);
  y += logoAlto + 6;

  doc.setFont("PoppinsBold", "normal");
  doc.setFontSize(19);
  doc.setTextColor(...NAVY);
  const tituloLineas = doc.splitTextToSize(
    "INFORME DE CUMPLIMIENTO DE ACTIVIDADES Y APROBACIÓN DE ESCUELA DE FORMACIÓN",
    CONTENT_WIDTH - 10
  ) as string[];
  tituloLineas.forEach((linea) => {
    doc.text(linea, PAGE_WIDTH / 2, y + 6, { align: "center" });
    y += 8;
  });
  y += 3;

  doc.setFont("Poppins", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...ORANGE);
  doc.text(`Punto de Venta: ${escuela.nombre}`, PAGE_WIDTH / 2, y, { align: "center" });
  y += 3;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.8);
  doc.line(PAGE_WIDTH / 2 - 35, y, PAGE_WIDTH / 2 + 35, y);
  doc.setTextColor(...DARK_TEXT);
  y += 10;

  dibujarCajaFicha("DIAGNÓSTICO REALIZADO", PEACH, [
    ["PDV", datos.metaDiagnostico.pdv || escuela.nombre],
    ["Fecha de visita", datos.metaDiagnostico.fecha || escuela.fecha_ultima_visita || "—"],
    ["Evaluador", datos.metaDiagnostico.evaluador || "—"],
  ]);
  dibujarCajaFicha("PLAN DE TRABAJO EJECUTADO", BLUE_LIGHT, [
    ["PDV", datos.metaPlan.pdv || escuela.nombre],
    ["Fecha de visita", datos.metaPlan.fecha || escuela.fecha_ultima_visita || "—"],
    ["Evaluador", datos.metaPlan.evaluador || "—"],
  ]);

  // ---------------------------------------------------------------------
  // 1. Objetivo General
  // ---------------------------------------------------------------------
  dibujarBarraSeccion("1.", "OBJETIVO GENERAL", "Propósito de la capacitación y fechas de visita");
  for (const parrafo of textoObjetivoGeneral(datos.metaDiagnostico.fecha, datos.metaPlan.fecha, escuela.fecha_ultima_visita)) {
    escribirParrafo(parrafo);
  }

  // ---------------------------------------------------------------------
  // 2. Resumen de resultados
  // ---------------------------------------------------------------------
  dibujarBarraSeccion("2.", "RESUMEN DE RESULTADOS", "Cumplimiento consolidado y parámetros no conformes");

  escribirParrafo(
    "La siguiente tabla consolida el número de ítems evaluados, los cumplidos, los no cumplidos y el porcentaje de " +
      "cumplimiento, tanto para la evaluación diagnóstica por colaborador como para el plan de trabajo por día."
  );

  const statsColab = statsPorColaborador(datos.criteriosDiagnostico);
  const totalDiag = totalizar("TOTAL Evaluación Diagnóstica", statsColab);
  const statsDia = statsPorDia(datos.filasPlan);
  const totalPlan = totalizar("TOTAL Plan de Trabajo", statsDia);

  function filaConsolidada(f: { etiqueta: string; evaluados: number; cumple: number; noCumple: number; pct: number }, esTotal: boolean): Celda[] {
    const fondo = esTotal ? { fillColor: PEACH, fontStyle: "bold" } : undefined;
    return [
      celda(f.etiqueta, fondo),
      celda(String(f.evaluados), fondo),
      celda(String(f.cumple), { ...(fondo ?? {}), textColor: GREEN_TEXT }),
      celda(String(f.noCumple), { ...(fondo ?? {}), textColor: RED_TEXT }),
      celda(`${f.pct.toFixed(1)}%`, fondo),
    ];
  }

  if (statsColab.length > 0 || statsDia.length > 0) {
    tablaEstandar(
      [["EVALUACIÓN", "ÍTEMS EVALUADOS", "CUMPLE", "NO CUMPLE", "% CUMPLIMIENTO"]],
      [
        ...statsColab.map((f) => filaConsolidada({ ...f, etiqueta: `${f.etiqueta} — Diagnóstico` }, false)),
        ...(statsColab.length > 0 ? [filaConsolidada(totalDiag, true)] : []),
        ...statsDia.map((f) => filaConsolidada(f, false)),
        ...(statsDia.length > 0 ? [filaConsolidada(totalPlan, true)] : []),
      ]
    );
  }

  if (totalDiag.evaluados > 0) {
    escribirParrafo(
      `En la evaluación diagnóstica inicial, de un total de ${totalDiag.evaluados} verificaciones realizadas, se registró ` +
        `un cumplimiento global de ${totalDiag.pct.toFixed(1)}%, con ${totalDiag.noCumple} parámetros no cumplidos.`
    );
  }
  if (totalPlan.evaluados > 0) {
    escribirParrafo(
      `En el plan de trabajo, de ${totalPlan.evaluados} actividades programadas se cumplieron ${totalPlan.cumple}, ` +
        `equivalentes a un ${totalPlan.pct.toFixed(1)}% de cumplimiento.`
    );
  }

  const noCumplidos = parametrosNoCumplidos(datos.criteriosDiagnostico);
  if (noCumplidos.length > 0) {
    subtitulo("Parámetros del diagnóstico que no se están cumpliendo");
    escribirParrafo(
      "La siguiente tabla consolida, por categoría, los parámetros de la evaluación diagnóstica que no se están " +
        "cumpliendo y los colaboradores en los que se identificó el incumplimiento."
    );
    tablaEstandar(
      [["N°", "CATEGORÍA", "PARÁMETRO NO CUMPLIDO", "COLABORADOR(ES) QUE NO CUMPLEN"]],
      noCumplidos.map((p) => [
        p.numero,
        p.categoria,
        p.detalle,
        celda(p.colaboradores.join(", "), { textColor: RED_TEXT, fontStyle: "bold" }),
      ])
    );
  } else if (datos.criteriosDiagnostico.length > 0) {
    escribirParrafo("Todos los parámetros evaluados en el diagnóstico se cumplen: no se registran incumplimientos.");
  }

  if (datos.criteriosDiagnostico.length > 0) {
    subtitulo("Detalle de la Evaluación Diagnóstica de PDV");
    const etiquetas = datos.criteriosDiagnostico[0]?.marcas.map((m) => m.etiqueta) ?? [];
    const cuerpoDiagnostico: (string | Celda)[][] = [];
    let categoriaActual = "";
    for (const c of datos.criteriosDiagnostico) {
      if (c.categoria !== categoriaActual) {
        categoriaActual = c.categoria;
        cuerpoDiagnostico.push([
          celda(categoriaActual, { fillColor: BLUE_LIGHT, textColor: NAVY, fontStyle: "bold" }, 2 + etiquetas.length),
        ]);
      }
      cuerpoDiagnostico.push([
        c.numero,
        c.detalle,
        ...c.marcas.map((m) => celdaEstado(estadoDiagnostico(m.valor))),
      ]);
    }
    tablaEstandar([["N°", "DETALLE", ...etiquetas]], cuerpoDiagnostico);
  }

  if (datos.filasPlan.length > 0) {
    subtitulo("Detalle del Plan de Trabajo en Escuela de Formación");
    const grupos: { titulo: string; filas: FilaPlan[] }[] = [];
    let grupoActual: { titulo: string; filas: FilaPlan[] } = { titulo: "", filas: [] };
    for (const f of datos.filasPlan) {
      if (f.tipo === "dia") {
        if (grupoActual.filas.length > 0 || grupoActual.titulo) grupos.push(grupoActual);
        grupoActual = { titulo: f.texto, filas: [] };
      } else {
        grupoActual.filas.push(f);
      }
    }
    if (grupoActual.filas.length > 0 || grupoActual.titulo) grupos.push(grupoActual);

    for (const grupo of grupos) {
      if (grupo.titulo) escribirParrafo(grupo.titulo.toUpperCase(), { negrita: true, tamano: 9.5, espacioDespues: 1 });
      if (grupo.filas.length === 0) continue;
      tablaEstandar(
        [["ACTIVIDAD", "CUMPLE", "OBSERVACIONES"]],
        grupo.filas.map((f) => {
          if (f.tipo === "categoria") {
            const texto = f.observaciones ? `${f.texto} — ${f.observaciones}` : f.texto;
            return [celda(texto, { fillColor: BLUE_LIGHT, textColor: NAVY, fontStyle: "bold" }, 3)];
          }
          return [f.texto, celdaEstado(estadoPlan(f.cumplimiento)), f.observaciones || "—"];
        })
      );
    }
  }

  // ---------------------------------------------------------------------
  // 3. Observaciones de la visita vs. Acciones realizadas
  // ---------------------------------------------------------------------
  dibujarBarraSeccion(
    "3.",
    "OBSERVACIONES DE LA VISITA VS. ACCIONES REALIZADAS",
    "Contraste entre hallazgos del diagnóstico y acciones del plan de trabajo"
  );
  escribirParrafo(
    "A continuación, se contrastan las observaciones levantadas durante la evaluación diagnóstica con las acciones y " +
      "observaciones registradas durante la ejecución del plan de trabajo, con el fin de determinar el grado de " +
      "atención dado a cada hallazgo."
  );
  const cruce = cruceObservaciones(datos);
  if (cruce.length > 0) {
    tablaEstandar(
      [["OBSERVACIÓN DEL DIAGNÓSTICO", "ACCIÓN / SEGUIMIENTO SEGÚN PLAN"]],
      cruce.map((c) => [c.hallazgo, c.accion])
    );
  } else {
    escribirParrafo("No se registran observaciones adicionales para contrastar entre el diagnóstico y el plan de trabajo.");
  }

  // ---------------------------------------------------------------------
  // 4. Conclusiones
  // ---------------------------------------------------------------------
  dibujarBarraSeccion("4.", "CONCLUSIONES", "Principales hallazgos de la evaluación");
  for (const bullet of textoConclusiones(datos, escuela.nombre)) {
    escribirParrafo(`•  ${bullet}`, { fondo: PEACH, espacioDespues: 1.5, sangria: 1 });
  }
  y += 2;

  // ---------------------------------------------------------------------
  // 5. Recomendaciones
  // ---------------------------------------------------------------------
  dibujarBarraSeccion("5.", "RECOMENDACIONES", "Acciones sugeridas para la aprobación de la Escuela de Formación");
  for (const bullet of textoRecomendaciones(datos)) {
    escribirParrafo(`•  ${bullet}`, { fondo: BLUE_LIGHT, espacioDespues: 1.5, sangria: 1 });
  }
  y += 2;

  // ---------------------------------------------------------------------
  // 6. Anexos
  // ---------------------------------------------------------------------
  dibujarBarraSeccion("6.", "ANEXOS", "Registro fotográfico de la visita (pestaña FOTOS)");
  if (datos.fotos.length === 0) {
    escribirParrafo("No se encontraron fotografías en la pestaña FOTOS del archivo Excel.");
  } else {
    escribirParrafo("Las siguientes fotografías fueron registradas durante la visita al PDV.");

    const propiedades = datos.fotos.map((foto) => ({ foto, props: doc.getImageProperties(foto.dataUrl) }));
    const panoramicas = propiedades.filter((p) => p.props.width / p.props.height >= 1.5);
    const grilla = propiedades.filter((p) => p.props.width / p.props.height < 1.5);

    function dibujarLeyenda(x: number, ancho: number, alturaImagen: number, texto: string) {
      doc.setFont("Poppins", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const lineas = doc.splitTextToSize(texto, ancho) as string[];
      doc.text(lineas, x, y + alturaImagen + 4);
      doc.setTextColor(...DARK_TEXT);
      return lineas.length * 3.6;
    }

    let contador = 1;
    for (const { foto, props } of panoramicas) {
      const ancho = CONTENT_WIDTH;
      const alto = Math.min((ancho * props.height) / props.width, 90);
      const anchoReal = (alto * props.width) / props.height;
      asegurarEspacio(alto + 12);
      doc.addImage(foto.dataUrl, MARGIN, y, anchoReal, alto);
      const alturaLeyenda = dibujarLeyenda(MARGIN, ancho, alto, foto.descripcion || `Evidencia fotográfica ${contador}`);
      y += alto + alturaLeyenda + 6;
      contador++;
    }

    const columnas = 2;
    const gap = 4;
    const anchoImagen = (CONTENT_WIDTH - gap * (columnas - 1)) / columnas;
    const altoMaximo = 58;

    for (let i = 0; i < grilla.length; i += columnas) {
      asegurarEspacio(altoMaximo + 14);
      const filaFotos = grilla.slice(i, i + columnas);
      let filaAltoMax = 0;

      filaFotos.forEach(({ foto, props }, indice) => {
        let alto = (anchoImagen * props.height) / props.width;
        if (alto > altoMaximo) alto = altoMaximo;
        const ancho = (alto * props.width) / props.height;
        const x = MARGIN + indice * (anchoImagen + gap);
        doc.addImage(foto.dataUrl, x, y, ancho, alto);
        filaAltoMax = Math.max(filaAltoMax, alto);
      });

      let alturaLeyendaMax = 0;
      filaFotos.forEach(({ foto }, indice) => {
        const x = MARGIN + indice * (anchoImagen + gap);
        const altura = dibujarLeyenda(x, anchoImagen, filaAltoMax, foto.descripcion || `Evidencia fotográfica ${contador + indice}`);
        alturaLeyendaMax = Math.max(alturaLeyendaMax, altura);
      });
      contador += filaFotos.length;

      y += filaAltoMax + alturaLeyendaMax + 8;
    }
  }

  // ---------------------------------------------------------------------
  // Encabezado de texto y numeración final (se hace al final porque recién
  // aquí se conoce el total de páginas, incluidas las que agrega autoTable).
  // ---------------------------------------------------------------------
  const totalPaginas = doc.getNumberOfPages();
  for (let p = 1; p <= totalPaginas; p++) {
    doc.setPage(p);
    doc.setFont("Poppins", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Universidad del Helado Escuelas de Formación · Página ${p} de ${totalPaginas}`, MARGIN, 10);
    doc.setFont("Poppins", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`Escuelas de Formación · Página ${p} de ${totalPaginas}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 4, { align: "right" });
  }

  const nombreArchivo = `Informe-Visita-EDF-${slugArchivo(escuela.nombre)}-${new Date().toISOString().slice(0, 10)}.pdf`;
  const blob = doc.output("blob");
  return { blob, nombreArchivo };
}
