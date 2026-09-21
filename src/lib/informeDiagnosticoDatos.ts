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
  actividad: string;
  estado: EstadoActividad;
  observaciones: string;
}

export interface FotoInforme {
  nombre: string;
  dataUrl: string;
}

export interface DatosInformeDiagnostico {
  fechaVisita: string | null;
  criteriosDiagnostico: CriterioDiagnostico[];
  actividadesPlan: ActividadPlan[];
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
  return n === "X" || n === "SI" || n === "OK";
}

function esMarcaNoCumple(valor: string) {
  const n = normalizar(valor);
  return n === "-" || n === "–" || n === "—" || n === "NO";
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
      if (texto.includes("ADMIN") || texto.includes("POLI") || texto.includes("COLABORADOR")) {
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

  const criterios: CriterioDiagnostico[] = [];
  let categoriaActual = "General";

  for (let i = filaEncabezado + 1; i < filas.length; i++) {
    const fila = filas[i];
    const colA = String(fila[0] ?? "").trim();
    const colB = String(fila[1] ?? "").trim();

    if (colA) categoriaActual = colA;
    if (!colB) continue;

    const marcas: MarcaColaborador[] = columnas.map((col) => ({
      etiqueta: col.etiqueta,
      valor: String(fila[col.indice] ?? "").trim(),
    }));

    const algunaNoCumple = marcas.some((m) => esMarcaNoCumple(m.valor));
    const algunaCumple = marcas.some((m) => esMarcaCumple(m.valor));
    const estado: EstadoCriterio = algunaNoCumple ? "NO_CUMPLE" : algunaCumple ? "CUMPLE" : "NO_EVALUADO";

    criterios.push({ categoria: categoriaActual, detalle: colB, marcas, estado });
  }

  return criterios;
}

function extraerPlan(workbook: XLSX.WorkBook): ActividadPlan[] {
  const nombreHoja = buscarHoja(workbook, /^PLAN|PLAN DE TRABAJO|PLAN\b/);
  if (!nombreHoja) return [];
  const filas = hojaComoMatriz(workbook, nombreHoja);

  let filaEncabezado = -1;
  let colObservaciones = -1;
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const textoA = normalizar(fila[0]);
    const textoB = normalizar(fila[1]);
    if (textoA.includes("ACTIVID") || textoB.includes("CUMPL")) {
      filaEncabezado = i;
      for (let c = 0; c < fila.length; c++) {
        if (normalizar(fila[c]).includes("OBSERV")) colObservaciones = c;
      }
      if (colObservaciones === -1) colObservaciones = fila.length - 1;
      break;
    }
  }
  if (filaEncabezado === -1) return [];

  const actividades: ActividadPlan[] = [];
  for (let i = filaEncabezado + 1; i < filas.length; i++) {
    const fila = filas[i];
    const actividad = String(fila[0] ?? "").trim();
    if (!actividad) continue;

    const cumplimientoRaw = String(fila[1] ?? "").trim();
    const observaciones = String(fila[colObservaciones] ?? "").trim();
    const estado: EstadoActividad = esMarcaNoCumple(cumplimientoRaw)
      ? "NO_CUMPLE"
      : esMarcaCumple(cumplimientoRaw)
        ? "CUMPLE"
        : "NO_REALIZADO";

    actividades.push({ actividad, estado, observaciones });
  }

  return actividades;
}

function buscarFechaVisita(workbook: XLSX.WorkBook): string | null {
  for (const nombreHoja of workbook.SheetNames) {
    const filas = hojaComoMatriz(workbook, nombreHoja);
    for (const fila of filas) {
      for (let c = 0; c < fila.length; c++) {
        const texto = normalizar(fila[c]);
        if (texto === "FECHA" || texto.includes("FECHA DE VISITA") || texto.includes("FECHA DE LA VISITA")) {
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

// El mapeo dibujo->celda de xlsx es complejo de reconstruir de forma confiable;
// como el Excel trae una pestaña FOTOS dedicada solo a evidencia fotográfica,
// se toman todas las imágenes incrustadas en el archivo como Anexos.
async function extraerFotos(archivo: File): Promise<FotoInforme[]> {
  const zip = await JSZip.loadAsync(await archivo.arrayBuffer());
  const entradas = Object.values(zip.files)
    .filter((f) => !f.dir && /^xl\/media\//.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const fotos: FotoInforme[] = [];
  for (const entrada of entradas) {
    const extension = entrada.name.split(".").pop()?.toLowerCase() ?? "";
    const tipoMime = EXTENSIONES_IMAGEN[extension];
    if (!tipoMime) continue;
    const base64 = await entrada.async("base64");
    fotos.push({ nombre: entrada.name.split("/").pop() ?? entrada.name, dataUrl: `data:image/${tipoMime};base64,${base64}` });
  }
  return fotos;
}

export async function parseInformeExcel(archivo: File): Promise<DatosInformeDiagnostico> {
  const buffer = await archivo.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const criteriosDiagnostico = extraerDiagnostico(workbook);
  const actividadesPlan = extraerPlan(workbook);
  const fechaVisita = buscarFechaVisita(workbook);
  const fotos = await extraerFotos(archivo);

  if (criteriosDiagnostico.length === 0 && actividadesPlan.length === 0) {
    throw new Error(
      "No se encontraron las pestañas DIAGNOSTICO y PLAN en el Excel, o están vacías. Verifica el archivo."
    );
  }

  return { fechaVisita, criteriosDiagnostico, actividadesPlan, fotos };
}
