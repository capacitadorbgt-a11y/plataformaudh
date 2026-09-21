import type { Escuela } from "@/types/database";
import type { CriterioDiagnostico, DatosInformeDiagnostico, EstadoActividad, EstadoCriterio } from "@/lib/informeDiagnosticoDatos";
import {
  actividadesNoCumplen,
  criteriosNoCumplen,
  textoConclusiones,
  textoCriteriosInterpretacion,
  textoObjetivoGeneral,
  textoRecomendaciones,
} from "@/lib/informeDiagnosticoTexto";

const NAVY: [number, number, number] = [17, 39, 63];
const ORANGE: [number, number, number] = [234, 88, 12];
const PEACH: [number, number, number] = [253, 237, 224];
const BLUE_GRAY: [number, number, number] = [231, 238, 245];
const DARK_TEXT: [number, number, number] = [45, 45, 45];

const MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_TOP = 18;
const CONTENT_BOTTOM = PAGE_HEIGHT - 16;

function slugArchivo(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function estadoCriterioTexto(estado: EstadoCriterio) {
  if (estado === "CUMPLE") return "Cumple";
  if (estado === "NO_CUMPLE") return "No cumple";
  return "No evaluado";
}

function estadoActividadTexto(estado: EstadoActividad) {
  if (estado === "CUMPLE") return "Cumple";
  if (estado === "NO_CUMPLE") return "No cumple";
  return "No se realizó";
}

function estadoColor(texto: string): [number, number, number] {
  if (texto === "Cumple") return [30, 120, 65];
  if (texto === "No cumple") return [185, 35, 35];
  return [120, 120, 120];
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

  function dibujarChrome() {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE_WIDTH, 10, "F");
    doc.setFont("Poppins", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Universidad del Helado · Escuelas de Formación", MARGIN, 6.5);
    doc.setFont("Poppins", "normal");
    doc.setFontSize(8);
    doc.text("Informe de cumplimiento y aprobación", PAGE_WIDTH - MARGIN, 6.5, { align: "right" });

    const footY = PAGE_HEIGHT - 10;
    const navyWidth = PAGE_WIDTH * 0.62;
    doc.setFillColor(...NAVY);
    doc.rect(0, footY, navyWidth, 10, "F");
    doc.setFillColor(...ORANGE);
    doc.rect(navyWidth, footY, PAGE_WIDTH - navyWidth, 10, "F");
    doc.setFont("Poppins", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Universidad del Helado", MARGIN, PAGE_HEIGHT - 4);
    doc.text("Escuelas de Formación", PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 4, { align: "right" });

    doc.setTextColor(...DARK_TEXT);
  }

  function nuevaPagina() {
    doc.addPage();
    dibujarChrome();
    y = CONTENT_TOP;
  }

  function asegurarEspacio(altura: number) {
    if (y + altura > CONTENT_BOTTOM) nuevaPagina();
  }

  function sincronizarDespuesDeTabla() {
    // @ts-expect-error -- lastAutoTable es agregado por el plugin jspdf-autotable
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  function dibujarBarraSeccion(numero: string, titulo: string) {
    asegurarEspacio(14);
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 8, "F");
    doc.setFont("Poppins", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`${numero}  ${titulo}`, MARGIN + 3, y + 5.5);
    doc.setTextColor(...DARK_TEXT);
    y += 8 + 4;
  }

  function escribirParrafo(
    texto: string,
    opts: { negrita?: boolean; fondo?: [number, number, number]; tamano?: number; espacioDespues?: number } = {}
  ) {
    const tamano = opts.tamano ?? 10;
    doc.setFont("Poppins", opts.negrita ? "bold" : "normal");
    doc.setFontSize(tamano);
    const lineas = doc.splitTextToSize(texto, CONTENT_WIDTH - 6) as string[];
    const alturaLinea = tamano * 0.42;
    const alturaBloque = lineas.length * alturaLinea + 4;

    asegurarEspacio(alturaBloque);

    if (opts.fondo) {
      doc.setFillColor(...opts.fondo);
      doc.rect(MARGIN, y, CONTENT_WIDTH, alturaBloque, "F");
    }

    doc.setTextColor(...DARK_TEXT);
    doc.text(lineas, MARGIN + 3, y + alturaLinea);
    y += alturaBloque + (opts.espacioDespues ?? 3);
  }

  function tablaEstandar(config: {
    head: string[][];
    body: (string | { content: string; textColor?: [number, number, number] })[][];
  }) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, top: 14, bottom: 16 },
      head: config.head,
      body: config.body as never,
      styles: { font: "Poppins", fontSize: 8.5, cellPadding: 2, textColor: DARK_TEXT, overflow: "linebreak" },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], font: "Poppins", fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 248, 250] },
      didDrawPage: () => dibujarChrome(),
    });
    sincronizarDespuesDeTabla();
  }

  // Portada / encabezado
  dibujarChrome();
  doc.setFont("PoppinsBold", "normal");
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text("INFORME DE CUMPLIMIENTO Y APROBACIÓN", PAGE_WIDTH / 2, y + 6, { align: "center" });
  y += 12;
  doc.setFont("Poppins", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...ORANGE);
  doc.text(escuela.nombre.toUpperCase(), PAGE_WIDTH / 2, y, { align: "center" });
  y += 6;
  doc.setFont("Poppins", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado el ${new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" })}`, PAGE_WIDTH / 2, y, {
    align: "center",
  });
  doc.setTextColor(...DARK_TEXT);
  y += 10;

  // 1. Objetivo general
  dibujarBarraSeccion("1.", "Objetivo General");
  for (const parrafo of textoObjetivoGeneral(datos.fechaVisita, escuela.fecha_ultima_visita)) {
    escribirParrafo(parrafo, { fondo: PEACH });
  }

  // 2. Criterios de interpretación
  dibujarBarraSeccion("2.", "Criterios de interpretación");
  for (const linea of textoCriteriosInterpretacion()) {
    escribirParrafo(linea, { fondo: BLUE_GRAY, espacioDespues: 1.5 });
  }
  y += 2;

  // 3. Resumen de resultados
  dibujarBarraSeccion("3.", "Resumen de resultados");

  const incumplidos = criteriosNoCumplen(datos.criteriosDiagnostico);
  escribirParrafo("Parámetros que no se están cumpliendo en la evaluación diagnóstica:", { negrita: true });
  if (incumplidos.length > 0) {
    tablaEstandar({
      head: [["Categoría", "Parámetro"]],
      body: incumplidos.map((c) => [c.categoria, c.detalle]),
    });
  } else {
    escribirParrafo("Todos los parámetros evaluados en el diagnóstico se cumplen.", { fondo: PEACH });
  }

  if (datos.criteriosDiagnostico.length > 0) {
    escribirParrafo("Detalle de la evaluación diagnóstica:", { negrita: true });
    const etiquetas = datos.criteriosDiagnostico[0]?.marcas.map((m) => m.etiqueta) ?? [];
    tablaEstandar({
      head: [["Categoría", "Detalle", ...etiquetas, "Estado"]],
      body: datos.criteriosDiagnostico.map((c: CriterioDiagnostico) => {
        const estadoTexto = estadoCriterioTexto(c.estado);
        return [
          c.categoria,
          c.detalle,
          ...c.marcas.map((m) => m.valor || "—"),
          { content: estadoTexto, textColor: estadoColor(estadoTexto) },
        ];
      }),
    });
  }

  const hayDias = datos.actividadesPlan.some((a) => a.dia);
  if (datos.actividadesPlan.length > 0) {
    escribirParrafo("Detalle del plan de trabajo:", { negrita: true });
    tablaEstandar({
      head: [hayDias ? ["Día", "Actividad", "Cumplimiento"] : ["Actividad", "Cumplimiento"]],
      body: datos.actividadesPlan.map((a) => {
        const estadoTexto = estadoActividadTexto(a.estado);
        const fila = hayDias ? [a.dia || "—", a.actividad] : [a.actividad];
        return [...fila, { content: estadoTexto, textColor: estadoColor(estadoTexto) }];
      }),
    });
  }

  // 4. Observaciones de la visita vs. acciones realizadas
  // Se arma con las mismas actividades de la sección 3 (solo las pendientes o
  // no cumplidas) y aquí -y solo aquí- se incluyen las observaciones registradas.
  dibujarBarraSeccion("4.", "Observaciones de la visita vs. Acciones realizadas");
  const pendientes = actividadesNoCumplen(datos.actividadesPlan);
  if (pendientes.length > 0) {
    escribirParrafo("Actividades del plan de trabajo pendientes o no cumplidas al momento de la visita:", { negrita: true });
    tablaEstandar({
      head: [hayDias ? ["Día", "Actividad", "Estado"] : ["Actividad", "Estado"]],
      body: pendientes.map((a) => {
        const estadoTexto = estadoActividadTexto(a.estado);
        const fila = hayDias ? [a.dia || "—", a.actividad] : [a.actividad];
        return [...fila, { content: estadoTexto, textColor: estadoColor(estadoTexto) }];
      }),
    });
  } else {
    escribirParrafo("Todas las actividades del plan de trabajo se cumplieron al momento de la visita.", { fondo: PEACH });
  }
  escribirParrafo("Observaciones de la visita y acciones realizadas registradas por el evaluador:", { negrita: true });
  escribirParrafo(datos.observacionesPlan || "No se registraron observaciones adicionales en el plan de trabajo.", {
    fondo: BLUE_GRAY,
  });

  // 5. Conclusiones
  dibujarBarraSeccion("5.", "Conclusiones");
  escribirParrafo(textoConclusiones(datos, escuela.nombre), { fondo: PEACH });

  // 6. Recomendaciones
  dibujarBarraSeccion("6.", "Recomendaciones");
  for (const recomendacion of textoRecomendaciones(datos)) {
    escribirParrafo(`•  ${recomendacion}`, { fondo: BLUE_GRAY, espacioDespues: 1.5 });
  }
  y += 2;

  // 7. Anexos
  dibujarBarraSeccion("7.", "Anexos");
  if (datos.fotos.length === 0) {
    escribirParrafo("No se encontraron fotografías en la pestaña FOTOS del archivo Excel.", { fondo: PEACH });
  } else {
    const columnas = 2;
    const gap = 4;
    const anchoImagen = (CONTENT_WIDTH - gap * (columnas - 1)) / columnas;
    const altoMaximo = 60;

    for (let i = 0; i < datos.fotos.length; i += columnas) {
      asegurarEspacio(altoMaximo + 10);
      const filaFotos = datos.fotos.slice(i, i + columnas);
      let filaAltoMax = 0;

      filaFotos.forEach((foto, indice) => {
        const propiedades = doc.getImageProperties(foto.dataUrl);
        let alto = (anchoImagen * propiedades.height) / propiedades.width;
        if (alto > altoMaximo) alto = altoMaximo;
        const ancho = (alto * propiedades.width) / propiedades.height;
        const x = MARGIN + indice * (anchoImagen + gap);
        doc.addImage(foto.dataUrl, x, y, ancho, alto);
        filaAltoMax = Math.max(filaAltoMax, alto);
      });

      doc.setFont("Poppins", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      filaFotos.forEach((foto, indice) => {
        const x = MARGIN + indice * (anchoImagen + gap);
        const etiqueta = foto.descripcion || `Evidencia fotográfica ${i + indice + 1}`;
        const lineas = doc.splitTextToSize(etiqueta, anchoImagen) as string[];
        doc.text(lineas, x, y + filaAltoMax + 4);
      });
      doc.setTextColor(...DARK_TEXT);

      y += filaAltoMax + 9;
    }
  }

  const nombreArchivo = `Informe-Cumplimiento-${slugArchivo(escuela.nombre)}-${new Date().toISOString().slice(0, 10)}.pdf`;
  const blob = doc.output("blob");
  return { blob, nombreArchivo };
}
