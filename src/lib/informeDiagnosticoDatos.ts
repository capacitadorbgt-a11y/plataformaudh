import * as XLSX from "xlsx";
import JSZip from "jszip";

export interface MarcaColaborador {
  etiqueta: string;
  valor: string;
}

export interface CriterioDiagnostico {
  numero: string;
  categoria: string;
  detalle: string;
  marcas: MarcaColaborador[];
}

export type FilaPlanTipo = "dia" | "categoria" | "actividad";

export interface FilaPlan {
  tipo: FilaPlanTipo;
  texto: string;
  cumplimiento: string;
  observaciones: string;
}

export interface MetadatosVisita {
  pdv: string | null;
  fecha: string | null;
  evaluador: string | null;
}

export interface FotoInforme {
  nombre: string;
  dataUrl: string;
  descripcion: string | null;
}

export interface DatosInformeDiagnostico {
  metaDiagnostico: MetadatosVisita;
  metaPlan: MetadatosVisita;
  criteriosDiagnostico: CriterioDiagnostico[];
  filasPlan: FilaPlan[];
  observacionesGeneralesDiagnostico: string | null;
  observacionesGeneralesPlan: string | null;
  fotos: FotoInforme[];
}

export function normalizar(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

export function esMarcaCumple(valor: string) {
  const n = normalizar(valor);
  return n === "X" || n === "/" || n === "✓" || n === "SI" || n === "OK";
}

export function esMarcaNoCumple(valor: string) {
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

function extraerMetadatos(filas: unknown[][]): MetadatosVisita {
  const meta: MetadatosVisita = { pdv: null, fecha: null, evaluador: null };
  for (const fila of filas) {
    for (let c = 0; c < fila.length; c++) {
      const texto = normalizar(fila[c]);
      if (!texto) continue;
      const valor = String(fila[c + 1] ?? "").trim();
      if (!valor) continue;
      if (!meta.evaluador && texto.includes("EVALUADOR")) meta.evaluador = valor;
      else if (!meta.fecha && texto.includes("FECHA")) meta.fecha = valor;
      else if (!meta.pdv && (texto === "PDV" || texto.includes("NOMBRE PDV") || texto.includes("PDV ESCUELA"))) meta.pdv = valor;
    }
  }
  return meta;
}

// Busca un bloque de observaciones libres tipo "OBSERVACIONES:" a partir de
// `desde` y devuelve el texto unido junto con el índice donde debe detenerse
// el escaneo de filas de datos (para no confundir esas líneas con actividades).
function extraerBloqueObservaciones(filas: unknown[][], desde: number): { texto: string | null; indice: number } {
  for (let i = desde; i < filas.length; i++) {
    const colA = String(filas[i][0] ?? "").trim();
    if (!colA) continue;
    if (/OBSERVACION/i.test(normalizar(colA))) {
      const lineas: string[] = [];
      const resto = colA.replace(/^\s*OBSERVACIONES?\s*:?\s*/i, "").trim();
      if (resto) lineas.push(resto);
      for (let j = i; j < filas.length; j++) {
        const fila = filas[j];
        for (let c = j === i ? 1 : 0; c < fila.length; c++) {
          const valor = String(fila[c] ?? "").trim();
          if (valor) lineas.push(valor);
        }
      }
      return { texto: lineas.join(" ").trim() || null, indice: i };
    }
  }
  return { texto: null, indice: filas.length };
}

function extraerDiagnostico(workbook: XLSX.WorkBook): {
  criterios: CriterioDiagnostico[];
  meta: MetadatosVisita;
  observaciones: string | null;
} {
  const nombreHoja = buscarHoja(workbook, /DIAGN/);
  if (!nombreHoja) return { criterios: [], meta: { pdv: null, fecha: null, evaluador: null }, observaciones: null };
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

  const meta = extraerMetadatos(filas.slice(0, filaEncabezado === -1 ? 8 : filaEncabezado));

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
  let siguiente = 1;
  let finTabla = filas.length;

  for (let i = inicioDatos; i < filas.length; i++) {
    const fila = filas[i];
    const colA = String(fila[0] ?? "").trim();
    const colB = String(fila[1] ?? "").trim();
    if (!colA && !colB) continue;

    // Solo la columna de la izquierda (donde van los rótulos de categoría) se
    // revisa: el detalle del criterio (colB) puede mencionar la palabra
    // "observación" en una oración normal sin ser el bloque de notas finales.
    if (/OBSERVACION/i.test(normalizar(colA))) {
      finTabla = i;
      break;
    }

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

    criterios.push({ numero: colA || String(siguiente), categoria: categoriaActual, detalle: colB, marcas });
    siguiente++;
  }

  const { texto: observaciones } = extraerBloqueObservaciones(filas, finTabla);

  return { criterios, meta, observaciones };
}

function extraerPlan(workbook: XLSX.WorkBook): {
  filas: FilaPlan[];
  meta: MetadatosVisita;
  observaciones: string | null;
} {
  const nombreHoja = buscarHoja(workbook, /PLAN/);
  if (!nombreHoja) return { filas: [], meta: { pdv: null, fecha: null, evaluador: null }, observaciones: null };
  const filasHoja = hojaComoMatriz(workbook, nombreHoja);

  let inicio = -1;
  let colActividad = 0;
  let colCumple = 1;
  let colObservaciones = 2;
  for (let i = 0; i < filasHoja.length; i++) {
    const fila = filasHoja[i];
    const textoA = normalizar(fila[0]);
    // Un título de día ("DÍA 1: EVALUACIÓN Y OBSERVACIÓN DE PDV...") puede
    // contener la palabra "OBSERVACIÓN" y disparar por error la detección de
    // encabezado de columnas; por eso se revisa primero y corta el escaneo.
    if (/^D[IÍ]A\s*\d/i.test(textoA)) {
      inicio = i;
      break;
    }
    let encontroEncabezado = false;
    for (let c = 0; c < fila.length; c++) {
      const texto = normalizar(fila[c]);
      if (texto.includes("ACTIVID")) {
        colActividad = c;
        encontroEncabezado = true;
      } else if (texto.includes("CUMPL")) {
        colCumple = c;
        encontroEncabezado = true;
      } else if (texto.includes("OBSERV")) {
        colObservaciones = c;
        encontroEncabezado = true;
      }
    }
    if (encontroEncabezado) {
      inicio = i + 1;
      break;
    }
  }
  if (inicio === -1) return { filas: [], meta: { pdv: null, fecha: null, evaluador: null }, observaciones: null };

  const meta = extraerMetadatos(filasHoja.slice(0, inicio));

  const filas: FilaPlan[] = [];
  let finTabla = filasHoja.length;

  for (let i = inicio; i < filasHoja.length; i++) {
    const fila = filasHoja[i];
    const colA = String(fila[colActividad] ?? "").trim();
    if (!colA) continue;

    if (/^D[IÍ]A\s*\d/i.test(colA)) {
      filas.push({ tipo: "dia", texto: colA, cumplimiento: "", observaciones: "" });
      continue;
    }

    if (/OBSERVACION/i.test(normalizar(colA))) {
      finTabla = i;
      break;
    }

    const cumplimiento = String(fila[colCumple] ?? "").trim();
    const observacionesFila = String(fila[colObservaciones] ?? "").trim();

    if (colA.endsWith(":") && !cumplimiento) {
      filas.push({ tipo: "categoria", texto: colA, cumplimiento: "", observaciones: observacionesFila });
      continue;
    }

    filas.push({ tipo: "actividad", texto: colA, cumplimiento, observaciones: observacionesFila });
  }

  const { texto: observaciones } = extraerBloqueObservaciones(filasHoja, finTabla);

  return { filas, meta, observaciones };
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

  const diagnostico = extraerDiagnostico(workbook);
  const plan = extraerPlan(workbook);
  const fotos = await extraerFotos(archivo, workbook);

  if (diagnostico.criterios.length === 0 && plan.filas.length === 0) {
    throw new Error(
      "No se encontraron las pestañas DIAGNOSTICO y PLAN en el Excel, o están vacías. Verifica el archivo."
    );
  }

  return {
    metaDiagnostico: diagnostico.meta,
    metaPlan: plan.meta,
    criteriosDiagnostico: diagnostico.criterios,
    filasPlan: plan.filas,
    observacionesGeneralesDiagnostico: diagnostico.observaciones,
    observacionesGeneralesPlan: plan.observaciones,
    fotos,
  };
}

// ---- Estadísticas derivadas (usadas por el generador de PDF y de texto) ----

export interface EstadisticaFila {
  etiqueta: string;
  evaluados: number;
  cumple: number;
  noCumple: number;
  pct: number;
}

function calcularFila(etiqueta: string, cumple: number, noCumple: number): EstadisticaFila {
  const evaluados = cumple + noCumple;
  return { etiqueta, evaluados, cumple, noCumple, pct: evaluados ? (cumple / evaluados) * 100 : 0 };
}

export function statsPorColaborador(criterios: CriterioDiagnostico[]): EstadisticaFila[] {
  const etiquetas = criterios[0]?.marcas.map((m) => m.etiqueta) ?? [];
  return etiquetas
    .map((etiqueta, idx) => {
      let cumple = 0;
      let noCumple = 0;
      for (const c of criterios) {
        const valor = c.marcas[idx]?.valor ?? "";
        if (esMarcaCumple(valor)) cumple++;
        else if (esMarcaNoCumple(valor)) noCumple++;
      }
      return calcularFila(etiqueta, cumple, noCumple);
    })
    // Una columna de colaborador sin ninguna marca (plantilla con más
    // columnas que personas evaluadas) no debe figurar como "0% cumplimiento".
    .filter((f) => f.evaluados > 0);
}

export function totalizar(etiqueta: string, filas: EstadisticaFila[]): EstadisticaFila {
  return calcularFila(
    etiqueta,
    filas.reduce((s, f) => s + f.cumple, 0),
    filas.reduce((s, f) => s + f.noCumple, 0)
  );
}

export function statsPorDia(filasPlan: FilaPlan[]): EstadisticaFila[] {
  const orden: string[] = [];
  const acumulado = new Map<string, { cumple: number; noCumple: number }>();
  let diaActual = "";

  for (const f of filasPlan) {
    if (f.tipo === "dia") {
      diaActual = f.texto.match(/^D[IÍ]A\s*\d+/i)?.[0]?.toUpperCase() ?? f.texto;
      if (!acumulado.has(diaActual)) {
        acumulado.set(diaActual, { cumple: 0, noCumple: 0 });
        orden.push(diaActual);
      }
      continue;
    }
    if (f.tipo !== "actividad") continue;
    if (!acumulado.has(diaActual)) {
      acumulado.set(diaActual, { cumple: 0, noCumple: 0 });
      orden.push(diaActual);
    }
    const entrada = acumulado.get(diaActual)!;
    if (esMarcaCumple(f.cumplimiento)) entrada.cumple++;
    else if (esMarcaNoCumple(f.cumplimiento)) entrada.noCumple++;
  }

  return orden
    .map((dia) => calcularFila(dia, acumulado.get(dia)!.cumple, acumulado.get(dia)!.noCumple))
    .filter((f) => f.evaluados > 0);
}

export interface ParametroNoCumplido {
  numero: string;
  categoria: string;
  detalle: string;
  colaboradores: string[];
}

export function parametrosNoCumplidos(criterios: CriterioDiagnostico[]): ParametroNoCumplido[] {
  return criterios
    .map((c) => ({
      numero: c.numero,
      categoria: c.categoria,
      detalle: c.detalle,
      colaboradores: c.marcas.filter((m) => esMarcaNoCumple(m.valor)).map((m) => m.etiqueta),
    }))
    .filter((r) => r.colaboradores.length > 0);
}

export function actividadesPlanNoCumplidas(filasPlan: FilaPlan[]): FilaPlan[] {
  return filasPlan.filter((f) => f.tipo === "actividad" && !esMarcaCumple(f.cumplimiento));
}
