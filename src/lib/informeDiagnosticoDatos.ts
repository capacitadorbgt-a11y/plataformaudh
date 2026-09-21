import * as XLSX from "xlsx";
import JSZip from "jszip";

export type EstadoCriterio = "CUMPLE" | "NO_CUMPLE" | "NO_EVALUADO";
export type EstadoActividad = "CUMPLE" | "NO_CUMPLE" | "NO_REALIZADO";

export interface MarcaColaborador {
  etiqueta: string;
  valor: string;
}

export interface CriterioDiagnostico {
  categoria: string;
  detalle: string;
  marcas: MarcaColaborador[];
  estado: EstadoCriterio;
}

export interface ActividadPlan {
  dia: string;
  actividad: string;
  estado: EstadoActividad;
}

export interface FotoInforme {
  nombre: string;
  dataUrl: string;
  descripcion: string | null;
}

export interface DatosInformeDiagnostico {
  fechaVisita: string | null;
  criteriosDiagnostico: CriterioDiagnostico[];
  actividadesPlan: ActividadPlan[];
  observacionesPlan: string | null;
  fotos: FotoInforme[];
}

function normalizar(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

function esMarcaCumple(valor: string) {
  const n = normalizar(valor);
  return n === "X" || n === "/" || n === "✓" || n === "SI" || n === "OK";
}

function esMarcaNoCumple(valor: string) {
  const n = normalizar(valor);
  return n === "-" || n === "–" || n === "—" || n === "NO";
}

function esMarcaReconocida(valor: string) {
  return valor.trim() === "" || esMarcaCumple(valor) || esMarcaNoCumple(valor);
}

function hojaComoMatriz(workbook: XLSX.WorkBook, nombreHoja: string): unknown[][] {
  const hoja = workbook.Sheets[nombreHoja];
  if (!hoja) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: "", raw: false });
}

function buscarHoja(workbook: XLSX.WorkBook, patron: RegExp): string | null {
  return workbook.SheetNames.find((n) => patron.test(normalizar(n))) ?? null;
}

function extraerDiagnostico(workbook: XLSX.WorkBook): CriterioDiagnostico[] {
  const nombreHoja = buscarHoja(workbook, /DIAGN/);
  if (!nombreHoja) return [];
  const filas = hojaComoMatriz(workbook, nombreHoja);

  let filaEncabezado = -1;
  let columnas: { indice: number; etiqueta: string }[] = [];
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const candidatas: { indice: number; etiqueta: string }[] = [];
    for (let c = 2; c < fila.length; c++) {
      const texto = normalizar(fila[c]);
      if (texto.includes("ADM") || texto.includes("POLI") || texto.includes("COLABORADOR")) {
        candidatas.push({ indice: c, etiqueta: String(fila[c]).trim() });
      }
    }
    if (candidatas.length >= 2) {
      filaEncabezado = i;
      columnas = candidatas;
      break;
    }
  }
  if (filaEncabezado === -1) {
    columnas = [2, 3, 4, 5].map((indice, i) => ({ indice, etiqueta: `Colaborador ${i + 1}` }));
  }

  // Justo debajo del encabezado de roles (ADMI/POLI/POLI/POLI) suele venir una
  // fila con el nombre real de cada colaborador en esas mismas columnas.
  let inicioDatos = filaEncabezado + 1;
  const filaNombres = filas[inicioDatos];
  if (filaNombres) {
    const colA = String(filaNombres[0] ?? "").trim();
    const colB = String(filaNombres[1] ?? "").trim();
    const nombresEncontrados = columnas.map((col) => String(filaNombres[col.indice] ?? "").trim());
    const hayNombre = nombresEncontrados.some((v) => v !== "" && !esMarcaReconocida(v));
    if (!colA && !colB && hayNombre) {
      columnas = columnas.map((col, idx) => {
        const nombre = nombresEncontrados[idx];
        if (!nombre || esMarcaReconocida(nombre)) return col;
        const primerNombre = nombre.split(/\s+/)[0];
        return { ...col, etiqueta: `${col.etiqueta} (${primerNombre})` };
      });
      inicioDatos++;
    }
  }

  const criterios: CriterioDiagnostico[] = [];
  let categoriaActual = "General";

  for (let i = inicioDatos; i < filas.length; i++) {
    const fila = filas[i];
    const colA = String(fila[0] ?? "").trim();
    const colB = String(fila[1] ?? "").trim();
    if (!colA && !colB) continue;

    const marcas: MarcaColaborador[] = columnas.map((col) => ({
      etiqueta: col.etiqueta,
      valor: String(fila[col.indice] ?? "").trim(),
    }));
    const hayMarcas = marcas.some((m) => m.valor !== "");

    if (!colA && !hayMarcas && colB) {
      categoriaActual = colB;
      continue;
    }
    if (!colB) continue;

    const algunaNoCumple = marcas.some((m) => esMarcaNoCumple(m.valor));
    const algunaCumple = marcas.some((m) => esMarcaCumple(m.valor));
    const estado: EstadoCriterio = algunaNoCumple ? "NO_CUMPLE" : algunaCumple ? "CUMPLE" : "NO_EVALUADO";

    criterios.push({ categoria: categoriaActual, detalle: colB, marcas, estado });
  }

  return criterios;
}

function extraerPlan(workbook: XLSX.WorkBook): { actividades: ActividadPlan[]; observaciones: string | null } {
  const nombreHoja = buscarHoja(workbook, /PLAN/);
  if (!nombreHoja) return { actividades: [], observaciones: null };
  const filas = hojaComoMatriz(workbook, nombreHoja);

  let inicio = -1;
  for (let i = 0; i < filas.length; i++) {
    const textoA = normalizar(filas[i][0]);
    const textoB = normalizar(filas[i][1]);
    if (textoA.includes("ACTIVID") || textoB.includes("CUMPL") || /^D[IÍ]A\s*\d/.test(textoA)) {
      inicio = textoA.includes("ACTIVID") || textoB.includes("CUMPL") ? i + 1 : i;
      break;
    }
  }
  if (inicio === -1) return { actividades: [], observaciones: null };

  const actividades: ActividadPlan[] = [];
  const observacionesLineas: string[] = [];
  let diaActual = "";
  let dentroDeObservaciones = false;

  for (let i = inicio; i < filas.length; i++) {
    const fila = filas[i];
    const colA = String(fila[0] ?? "").trim();
    const colB = String(fila[1] ?? "").trim();

    if (dentroDeObservaciones) {
      if (colA) observacionesLineas.push(colA);
      if (colB && colB !== colA) observacionesLineas.push(colB);
      continue;
    }

    if (!colA) continue;

    if (/OBSERVACION/i.test(normalizar(colA))) {
      dentroDeObservaciones = true;
      const resto = colA.replace(/^\s*OBSERVACIONES?\s*:?\s*/i, "").trim();
      if (resto) observacionesLineas.push(resto);
      if (colB) observacionesLineas.push(colB);
      continue;
    }

    if (/^D[IÍ]A\s*\d/i.test(colA)) {
      diaActual = colA;
      if (!colB) continue;
    }

    const estado: EstadoActividad = esMarcaNoCumple(colB) ? "NO_CUMPLE" : esMarcaCumple(colB) ? "CUMPLE" : "NO_REALIZADO";
    actividades.push({ dia: diaActual, actividad: colA, estado });
  }

  const observaciones = observacionesLineas.join(" ").trim();
  return { actividades, observaciones: observaciones || null };
}

function buscarFechaVisita(workbook: XLSX.WorkBook): string | null {
  for (const nombreHoja of workbook.SheetNames) {
    const filas = hojaComoMatriz(workbook, nombreHoja);
    for (const fila of filas) {
      for (let c = 0; c < fila.length; c++) {
        const texto = normalizar(fila[c]);
        if (texto === "FECHA" || texto === "FECHA:" || texto.includes("FECHA DE VISITA") || texto.includes("FECHA DE LA VISITA")) {
          const valor = String(fila[c + 1] ?? "").trim();
          if (valor) return valor;
        }
      }
    }
  }
  return null;
}

const EXTENSIONES_IMAGEN: Record<string, string> = {
  png: "png",
  jpg: "jpeg",
  jpeg: "jpeg",
};

const TEXTOS_A_IGNORAR = new Set(["FOTOS", "FOTOGRAFIAS", "FOTOGRAFIA", "ANEXOS", "EVIDENCIA", "EVIDENCIAS", "EVIDENCIA FOTOGRAFICA"]);

function descripcionesHojaFotos(workbook: XLSX.WorkBook): string[] {
  const nombreHoja = buscarHoja(workbook, /FOTO/);
  if (!nombreHoja) return [];
  const filas = hojaComoMatriz(workbook, nombreHoja);
  const textos: string[] = [];
  for (const fila of filas) {
    for (const celda of fila) {
      const valor = String(celda ?? "").trim();
      if (!valor || TEXTOS_A_IGNORAR.has(normalizar(valor))) continue;
      textos.push(valor);
    }
  }
  return textos;
}

// El mapeo dibujo->celda de xlsx es complejo de reconstruir de forma confiable;
// como el Excel trae una pestaña FOTOS dedicada solo a evidencia fotográfica, se
// toman todas las imágenes incrustadas en el archivo y se emparejan en orden con
// los textos de esa pestaña (que normalmente son los pies de foto).
async function extraerFotos(archivo: File, workbook: XLSX.WorkBook): Promise<FotoInforme[]> {
  const zip = await JSZip.loadAsync(await archivo.arrayBuffer());
  const entradas = Object.values(zip.files)
    .filter((f) => !f.dir && /^xl\/media\//.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const descripciones = descripcionesHojaFotos(workbook);

  const fotos: FotoInforme[] = [];
  for (const entrada of entradas) {
    const extension = entrada.name.split(".").pop()?.toLowerCase() ?? "";
    const tipoMime = EXTENSIONES_IMAGEN[extension];
    if (!tipoMime) continue;
    const base64 = await entrada.async("base64");
    fotos.push({
      nombre: entrada.name.split("/").pop() ?? entrada.name,
      dataUrl: `data:image/${tipoMime};base64,${base64}`,
      descripcion: descripciones[fotos.length] || null,
    });
  }
  return fotos;
}

export async function parseInformeExcel(archivo: File): Promise<DatosInformeDiagnostico> {
  const buffer = await archivo.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const criteriosDiagnostico = extraerDiagnostico(workbook);
  const { actividades: actividadesPlan, observaciones: observacionesPlan } = extraerPlan(workbook);
  const fechaVisita = buscarFechaVisita(workbook);
  const fotos = await extraerFotos(archivo, workbook);

  if (criteriosDiagnostico.length === 0 && actividadesPlan.length === 0) {
    throw new Error(
      "No se encontraron las pestañas DIAGNOSTICO y PLAN en el Excel, o están vacías. Verifica el archivo."
    );
  }

  return { fechaVisita, criteriosDiagnostico, actividadesPlan, observacionesPlan, fotos };
}
