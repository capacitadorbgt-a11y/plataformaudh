import type { EscuelaConProcesos } from "@/components/EscuelasTable";

const COLUMNAS = [
  "Escuela",
  "Provincia",
  "Ciudad",
  "Zona",
  "Capacidad",
  "Procesos",
  "Estado",
  "Fecha última visita",
  "Observaciones",
] as const;

function filaComoTexto(e: EscuelaConProcesos): string[] {
  return [
    e.nombre,
    e.provincia ?? "",
    e.ciudad ?? "",
    e.zona ?? "",
    e.capacidad != null ? String(e.capacidad) : "",
    String(e.procesos),
    e.estado,
    e.fecha_ultima_visita ?? "",
    e.observaciones ?? "",
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
  return `escuelas-${fecha}.${extension}`;
}

function csvEscape(valor: string) {
  if (valor.includes(",") || valor.includes('"') || valor.includes("\n")) {
    return '"' + valor.replace(/"/g, '""') + '"';
  }
  return valor;
}

export function exportarCSV(escuelas: EscuelaConProcesos[]) {
  const filas = [COLUMNAS.map(csvEscape).join(",")];
  for (const e of escuelas) {
    filas.push(filaComoTexto(e).map(csvEscape).join(","));
  }
  const contenido = "﻿" + filas.join("\r\n");
  descargarBlob(new Blob([contenido], { type: "text/csv;charset=utf-8" }), nombreConFecha("csv"));
}

function htmlEscape(valor: string) {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportarXLS(escuelas: EscuelaConProcesos[]) {
  const encabezado = COLUMNAS.map((c) => `<th>${htmlEscape(c)}</th>`).join("");
  const filas = escuelas
    .map((e) => `<tr>${filaComoTexto(e).map((v) => `<td>${htmlEscape(v)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body><table border="1"><thead><tr>${encabezado}</tr></thead><tbody>${filas}</tbody></table></body></html>`;
  descargarBlob(new Blob([html], { type: "application/vnd.ms-excel" }), nombreConFecha("xls"));
}

export async function exportarPDF(escuelas: EscuelaConProcesos[]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Escuelas de formación", 14, 15);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es-EC")} · ${escuelas.length} registros`, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [Array.from(COLUMNAS)],
    body: escuelas.map(filaComoTexto),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [234, 88, 12] },
  });

  doc.save(nombreConFecha("pdf"));
}
