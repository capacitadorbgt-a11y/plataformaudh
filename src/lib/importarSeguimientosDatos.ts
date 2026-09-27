export interface SeguimientoImportado {
  escuelaTexto: string | null;
  fecha_capacitacion: string | null;
  cargo: string | null;
  aspirantes: string[];
  pdv_solicitud: string | null;
  analista: string | null;
  capacitador: string | null;
  aspirante_aprobado: string | null;
  fecha_ingreso: string | null;
  observaciones: string | null;
}

export function filaVacia(): SeguimientoImportado {
  return {
    escuelaTexto: null,
    fecha_capacitacion: null,
    cargo: null,
    aspirantes: [],
    pdv_solicitud: null,
    analista: null,
    capacitador: null,
    aspirante_aprobado: null,
    fecha_ingreso: null,
    observaciones: null,
  };
}

function normalizar(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

// Todo proceso de capacitación dura 4 días: si no hay fecha de ingreso
// explícita, se calcula a partir de la fecha de capacitación (inicio).
export function sumarDias(fechaISO: string, dias: number): string | null {
  const m = fechaISO.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const fecha = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

// Intenta reconocer fechas en varios formatos comunes (dd/mm/aaaa,
// aaaa-mm-dd, "15 de septiembre de 2026", rangos "15 al 18/09/2026") y
// devuelve solo la fecha de INICIO en formato ISO (aaaa-mm-dd).
const MESES: Record<string, string> = {
  ENERO: "01", FEBRERO: "02", MARZO: "03", ABRIL: "04", MAYO: "05", JUNIO: "06",
  JULIO: "07", AGOSTO: "08", SEPTIEMBRE: "09", SETIEMBRE: "09", OCTUBRE: "10",
  NOVIEMBRE: "11", DICIEMBRE: "12",
};

export function parsearFecha(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const t = texto.trim();

  // Rangos ("15 al 18 de septiembre de 2026" / "15 al 18/09/2026") se
  // revisan PRIMERO y explícitamente: si no, el regex de fecha simple de
  // abajo "encuentra" por accidente la fecha de FIN (backtracking) en vez
  // de la de inicio, ya que el "al <n>" intermedio rompe el primer intento
  // de match empezando en el primer número.
  const rangoConMes = t.match(/(\d{1,2})\s*(?:al|-)\s*\d{1,2}\s+(?:de\s+)?([a-zA-ZñÑ]+)\s+(?:de\s+)?(\d{4})/i);
  if (rangoConMes) {
    const mes = MESES[normalizar(rangoConMes[2])];
    if (mes) return `${rangoConMes[3]}-${mes}-${rangoConMes[1].padStart(2, "0")}`;
  }
  // Ej. "7 - 8 /9/2026": día inicio, día fin, mes y año separados por "/"
  // (con o sin espacios alrededor de las barras).
  const rangoSlash = t.match(/(\d{1,2})\s*(?:al|-)\s*\d{1,2}\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/i);
  if (rangoSlash) return `${rangoSlash[3]}-${rangoSlash[2].padStart(2, "0")}-${rangoSlash[1].padStart(2, "0")}`;

  const iso = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const dmy = t.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  const conMes = t.match(/(\d{1,2})\s+(?:de\s+)?([a-zA-ZñÑ]+)\s+(?:de\s+)?(\d{4})/i);
  if (conMes) {
    const mes = MESES[normalizar(conMes[2])];
    if (mes) return `${conMes[3]}-${mes}-${conMes[1].padStart(2, "0")}`;
  }

  return null;
}

function dividirNombres(texto: string | null | undefined): string[] {
  if (!texto) return [];
  return texto
    .split(/[\n,;]+/)
    .map((n) => n.trim())
    .filter(Boolean);
}

const ENCABEZADOS: Record<keyof Omit<SeguimientoImportado, "aspirantes">, string[]> = {
  escuelaTexto: ["escuela"],
  fecha_capacitacion: ["fecha capacitacion", "fecha de capacitacion", "fecha inicio", "fecha"],
  cargo: ["cargo"],
  pdv_solicitud: ["pdv solicitud", "pdv que solicita", "pdv"],
  analista: ["analista"],
  capacitador: ["capacitador"],
  aspirante_aprobado: ["aprobado", "aspirante aprobado"],
  fecha_ingreso: ["fecha ingreso", "fecha de ingreso"],
  observaciones: ["observacion", "observaciones"],
};

function encontrarColumnas(encabezados: string[]): Partial<Record<keyof SeguimientoImportado, number>> {
  const normalizados = encabezados.map(normalizar);
  const columnas: Partial<Record<keyof SeguimientoImportado, number>> = {};

  for (const [campo, alias] of Object.entries(ENCABEZADOS) as [keyof SeguimientoImportado, string[]][]) {
    for (let i = 0; i < normalizados.length; i++) {
      if (alias.some((a) => normalizados[i].includes(normalizar(a)))) {
        columnas[campo] = i;
        break;
      }
    }
  }
  const idxAspirantes = normalizados.findIndex((h) => h.includes("ASPIRANTE") && !h.includes("APROBADO"));
  if (idxAspirantes >= 0) columnas.aspirantes = idxAspirantes;

  return columnas;
}

// Convierte una matriz de filas/columnas (de un .xlsx, una tabla HTML pegada
// o texto separado por tabs) en seguimientos, detectando el encabezado.
export function parseTablaSeguimientos(aoa: unknown[][]): SeguimientoImportado[] {
  const filas = aoa.map((f) => f.map((c) => String(c ?? "").trim())).filter((f) => f.some(Boolean));
  if (filas.length === 0) return [];

  let indiceEncabezado = 0;
  let columnas = encontrarColumnas(filas[0]);
  if (Object.keys(columnas).length < 2 && filas.length > 1) {
    // no se reconocio bien la primera fila como encabezado; se prueba con la siguiente
    columnas = encontrarColumnas(filas[1]);
    if (Object.keys(columnas).length >= 2) indiceEncabezado = 1;
  }

  const resultado: SeguimientoImportado[] = [];
  for (let i = indiceEncabezado + 1; i < filas.length; i++) {
    const fila = filas[i];
    const obtener = (campo: keyof SeguimientoImportado) => {
      const idx = columnas[campo];
      return idx != null ? fila[idx] ?? "" : "";
    };

    const escuelaTexto = obtener("escuelaTexto") || null;
    const pdv = obtener("pdv_solicitud") || null;
    if (!escuelaTexto && !pdv) continue;

    resultado.push({
      escuelaTexto,
      fecha_capacitacion: parsearFecha(obtener("fecha_capacitacion")),
      cargo: obtener("cargo") || null,
      aspirantes: dividirNombres(obtener("aspirantes")),
      pdv_solicitud: pdv,
      analista: obtener("analista") || null,
      capacitador: obtener("capacitador") || null,
      aspirante_aprobado: obtener("aspirante_aprobado") || null,
      fecha_ingreso: parsearFecha(obtener("fecha_ingreso")),
      observaciones: obtener("observaciones") || null,
    });
  }
  return resultado;
}

export function textoPlanoATabla(texto: string): unknown[][] {
  return texto
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .map((linea) => linea.split("\t"));
}

export function htmlATabla(html: string): unknown[][] {
  const contenedor = document.createElement("div");
  contenedor.innerHTML = html;
  const tabla = contenedor.querySelector("table");
  if (!tabla) return [];
  return Array.from(tabla.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td, th")).map((celda) => celda.textContent?.trim() ?? "")
  );
}

export function coincidenciaMasCercana(texto: string | null, opciones: { id: string; nombre: string }[]): string | null {
  if (!texto) return null;
  const t = normalizar(texto);
  const exacto = opciones.find((o) => normalizar(o.nombre) === t);
  if (exacto) return exacto.id;
  const parcial = opciones.find((o) => normalizar(o.nombre).includes(t) || t.includes(normalizar(o.nombre)));
  return parcial?.id ?? null;
}
