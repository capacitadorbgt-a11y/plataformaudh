import type { Seguimiento } from "@/types/database";

type SeguimientoRow = Seguimiento & { escuelas: { nombre: string } | null };

const COLUMNAS = [
  "Escuela",
  "Fecha capacitación",
  "Cargo",
  "Estado del proceso",
  "Aspirantes",
  "Aprobado",
  "PDV solicitud",
  "Analista",
  "Observaciones",
] as const;

function estadoLegible(estado: string) {
  return estado === "FINALIZADO" ? "Finalizado" : "En proceso";
}

function filaComoTexto(s: SeguimientoRow): string[] {
  return [
    s.escuelas?.nombre ?? s.escuela_nombre_libre ?? "",
    s.fecha_capacitacion ?? "",
    s.cargo ?? "",
    estadoLegible(s.estado_proceso),
    String(s.num_aspirantes ?? 0),
    s.aspirante_aprobado ?? "",
    s.pdv_solicitud ?? "",
    s.analista ?? "",
    s.observaciones ?? "",
  ];
}

function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function nombreConFecha(extension: string) {
  const fecha = new Date().toISOString().slice(0, 10);
  return `seguimientos-${fecha}.${extension}`;
}

function csvEscape(valor: string) {
  if (valor.includes(",") || valor.includes('"') || valor.includes("\n")) {
    return '"' + valor.replace(/"/g, '""') + '"';
  }
  return valor;
}

export function exportarCSV(seguimientos: SeguimientoRow[]) {
  const filas = [COLUMNAS.map(csvEscape).join(",")];
  for (const s of seguimientos) {
    filas.push(filaComoTexto(s).map(csvEscape).join(","));
  }
  const contenido = "﻿" + filas.join("\r\n"); // BOM para acentos en Excel
  descargarBlob(new Blob([contenido], { type: "text/csv;charset=utf-8" }), nombreConFecha("csv"));
}

function htmlEscape(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function exportarXLS(seguimientos: SeguimientoRow[]) {
  const encabezado = COLUMNAS.map((c) => `<th>${htmlEscape(c)}</th>`).join("");
  const filas = seguimientos
    .map((s) => `<tr>${filaComoTexto(s).map((v) => `<td>${htmlEscape(v)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body><table border="1"><thead><tr>${encabezado}</tr></thead><tbody>${filas}</tbody></table></body></html>`;
  descargarBlob(new Blob([html], { type: "application/vnd.ms-excel" }), nombreConFecha("xls"));
}

export async function exportarPDF(seguimientos: SeguimientoRow[]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Seguimientos de reclutamiento y capacitación", 14, 15);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es-EC")} · ${seguimientos.length} registros`, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [Array.from(COLUMNAS)],
    body: seguimientos.map(filaComoTexto),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [234, 88, 12] },
  });

  doc.save(nombreConFecha("pdf"));
}
