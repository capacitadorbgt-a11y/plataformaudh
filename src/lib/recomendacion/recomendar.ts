import "server-only";
import { createClient } from "@/lib/supabase/server";
import { coincidenciaMasCercana } from "@/lib/importarSeguimientosDatos";
import { coordenadasDeCiudad, distanciaKm, normalizarCiudad } from "@/lib/geoEcuador";
import { resolverRutasParaDestinos } from "@/lib/routing/resolver";
import { calcularDisponibilidad, type Semaforo } from "@/lib/disponibilidadEscuela";
import { calcularNpsPromedio, calcularTasaAprobacion } from "@/lib/recomendacion/datosEscuela";
import { scoreEscuela } from "@/lib/recomendacion/scoreEscuela";
import { formatoCorto, generarExplicacion, type CandidatoExplicacion } from "@/lib/recomendacion/explicacion";

// Ventana en días alrededor de la fecha pedida dentro de la cual un proceso
// EN_PROCESO ya agendado en la escuela recomendada, desde OTRO PDV, se
// considera "cercano" para sugerir agrupar la visita del capacitador.
const DIAS_VENTANA_AGRUPAMIENTO = 5;

export interface SolicitudRecomendacion {
  pdv: string;
  fecha: string;
  cargo: string | null;
  aspirantes: number | null;
}

export interface CandidatoRecomendado {
  escuelaId: string;
  nombre: string;
  ciudad: string | null;
  estado: string;
  km: number;
  min: number;
  aproximado: boolean;
  cuposLibres: number | null;
  hayDemoras: boolean;
  semaforo: Semaforo;
  proximaFechaLibre: string | null;
  score: number;
  descalificada: boolean;
}

export interface Agrupamiento {
  escuelaNombre: string;
  pdvCercano: string;
  fecha: string;
}

export interface ResultadoRecomendacion {
  pdvResuelto: { nombre: string; ciudad: string | null } | null;
  recomendada: CandidatoRecomendado | null;
  alternativas: CandidatoRecomendado[];
  explicacion: string;
  agrupamiento: Agrupamiento | null;
  sinCoordenadas: string[];
  error?: "pdv_no_encontrado" | "sin_coordenadas_pdv" | "sin_escuelas_candidatas";
}

function diferenciaDias(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00Z`).getTime();
  const b = new Date(`${bISO}T00:00:00Z`).getTime();
  return Math.abs(Math.round((a - b) / 86400000));
}

function aCandidatoExplicacion(c: CandidatoRecomendado): CandidatoExplicacion {
  return {
    escuelaId: c.escuelaId,
    nombre: c.nombre,
    km: c.km,
    min: c.min,
    cuposLibres: c.cuposLibres,
    hayDemoras: c.hayDemoras,
    semaforo: c.semaforo,
    estado: c.estado,
    proximaFechaLibre: c.proximaFechaLibre,
  };
}

export async function recomendarEscuela(solicitud: SolicitudRecomendacion): Promise<ResultadoRecomendacion> {
  const supabase = createClient();

  const [{ data: pdvs }, { data: escuelas }] = await Promise.all([
    supabase
      .from("pdvs")
      .select("id, nombre, ciudad, provincia")
      .returns<{ id: string; nombre: string; ciudad: string | null; provincia: string | null }[]>(),
    supabase
      .from("escuelas")
      .select("id, nombre, ciudad, provincia, estado, capacidad")
      .returns<{ id: string; nombre: string; ciudad: string | null; provincia: string | null; estado: string; capacidad: number | null }[]>(),
  ]);

  const pdvId = coincidenciaMasCercana(solicitud.pdv, (pdvs ?? []).map((p) => ({ id: p.id, nombre: p.nombre })));
  const pdvEncontrado = pdvId ? pdvs?.find((p) => p.id === pdvId) ?? null : null;

  if (!pdvEncontrado) {
    return {
      pdvResuelto: null,
      recomendada: null,
      alternativas: [],
      explicacion: `No encontré ningún punto de venta que coincida con "${solicitud.pdv}".`,
      agrupamiento: null,
      sinCoordenadas: [],
      error: "pdv_no_encontrado",
    };
  }

  const pdvResuelto = { nombre: pdvEncontrado.nombre, ciudad: pdvEncontrado.ciudad };
  const coordsPdv = coordenadasDeCiudad(pdvEncontrado.ciudad);

  if (!coordsPdv) {
    return {
      pdvResuelto,
      recomendada: null,
      alternativas: [],
      explicacion: `No tengo coordenadas para "${pdvEncontrado.ciudad ?? "la ciudad de ese PDV"}", así que no puedo calcular distancias reales.`,
      agrupamiento: null,
      sinCoordenadas: [],
      error: "sin_coordenadas_pdv",
    };
  }

  const habilitadas = (estado: string) => estado === "ACTIVO" || estado === "REVISION";
  const conCoords = (escuelas ?? [])
    .filter((e) => habilitadas(e.estado))
    .map((e) => ({ escuela: e, coords: coordenadasDeCiudad(e.ciudad) }))
    .filter((e): e is { escuela: NonNullable<typeof escuelas>[number]; coords: NonNullable<ReturnType<typeof coordenadasDeCiudad>> } => !!e.coords);

  if (conCoords.length === 0) {
    return {
      pdvResuelto,
      recomendada: null,
      alternativas: [],
      explicacion: "No hay escuelas habilitadas (activas o en revisión) con coordenadas conocidas para comparar.",
      agrupamiento: null,
      sinCoordenadas: (escuelas ?? []).filter((e) => habilitadas(e.estado)).map((e) => e.id),
    };
  }

  const { resultados: rutas, sinCoordenadas } = await resolverRutasParaDestinos(
    coordsPdv,
    pdvEncontrado.ciudad,
    conCoords.map((c) => ({ id: c.escuela.id, lat: c.coords.lat, lng: c.coords.lng }))
  );
  const rutaPorId = new Map(rutas.map((r) => [r.id, r]));

  const idsEscuelas = conCoords.map((c) => c.escuela.id);
  const [{ data: seguimientos }, { data: encuestas }] = await Promise.all([
    supabase
      .from("seguimientos")
      .select("escuela_id, estado_proceso, fecha_capacitacion, aspirante_aprobado, pdv_solicitud")
      .in("escuela_id", idsEscuelas)
      .returns<
        { escuela_id: string; estado_proceso: "EN_PROCESO" | "FINALIZADO"; fecha_capacitacion: string | null; aspirante_aprobado: string | null; pdv_solicitud: string | null }[]
      >(),
    supabase.from("encuestas").select("pdv_capacitacion, nps").returns<{ pdv_capacitacion: string; nps: number | null }[]>(),
  ]);

  const candidatos: CandidatoRecomendado[] = conCoords.map(({ escuela, coords }) => {
    const ruta = rutaPorId.get(escuela.id);
    const segsEscuela = (seguimientos ?? []).filter((s) => s.escuela_id === escuela.id);
    const disponibilidad = calcularDisponibilidad({ capacidad: escuela.capacidad, estado: escuela.estado }, segsEscuela, solicitud.fecha);
    const tasaAprobacion = calcularTasaAprobacion(segsEscuela);
    const nps = calcularNpsPromedio(escuela.nombre, encuestas ?? []);
    const km = ruta?.km ?? distanciaKm(coordsPdv, coords);
    const min = ruta?.min ?? 0;

    const { score, descalificada } = scoreEscuela({
      escuelaId: escuela.id,
      estado: escuela.estado,
      km,
      min,
      cuposLibres: disponibilidad.cuposLibres,
      hayDemoras: disponibilidad.hayDemoras,
      semaforo: disponibilidad.semaforo,
      tasaAprobacion,
      nps,
    });

    return {
      escuelaId: escuela.id,
      nombre: escuela.nombre,
      ciudad: escuela.ciudad,
      estado: escuela.estado,
      km,
      min,
      aproximado: ruta?.aproximado ?? true,
      cuposLibres: disponibilidad.cuposLibres,
      hayDemoras: disponibilidad.hayDemoras,
      semaforo: disponibilidad.semaforo,
      proximaFechaLibre: disponibilidad.proximaFechaLibre,
      score,
      descalificada,
    };
  });

  // Orden: primero las descalificadas (llenas/inactivas) al final, luego
  // ACTIVO siempre antes que REVISION (preferencia explícita pedida por
  // Bogati, no una simple penalización de puntaje), y recién dentro de cada
  // grupo se compara por score y luego por cercanía.
  const tierEstado = (c: CandidatoRecomendado) => (c.estado === "ACTIVO" ? 0 : 1);
  const ordenados = [...candidatos].sort((a, b) => {
    if (a.descalificada !== b.descalificada) return a.descalificada ? 1 : -1;
    const tierDiff = tierEstado(a) - tierEstado(b);
    if (tierDiff !== 0) return tierDiff;
    return b.score - a.score || a.km - b.km;
  });
  let mejor: CandidatoRecomendado | null = ordenados[0] ?? null;

  // Si hasta la mejor opción está descalificada (todas llenas en esa
  // fecha), se recomienda igual la que se libera más pronto, en vez de no
  // recomendar nada.
  if (mejor && mejor.descalificada) {
    const conFechaLibre = candidatos
      .filter((c) => c.proximaFechaLibre)
      .sort((a, b) => (a.proximaFechaLibre! < b.proximaFechaLibre! ? -1 : 1));
    if (conFechaLibre.length > 0) mejor = conFechaLibre[0];
  }

  const alternativas = ordenados.filter((c) => c.escuelaId !== mejor?.escuelaId).slice(0, 2);
  const masCercanaGeografica = [...candidatos].sort((a, b) => a.km - b.km).find((c) => c.escuelaId !== mejor?.escuelaId) ?? null;

  let agrupamiento: Agrupamiento | null = null;
  if (mejor) {
    const candidataAgrupar = (seguimientos ?? []).find(
      (s) =>
        s.escuela_id === mejor!.escuelaId &&
        s.estado_proceso === "EN_PROCESO" &&
        !!s.fecha_capacitacion &&
        !!s.pdv_solicitud &&
        normalizarCiudad(s.pdv_solicitud) !== normalizarCiudad(pdvEncontrado.nombre) &&
        diferenciaDias(s.fecha_capacitacion, solicitud.fecha) <= DIAS_VENTANA_AGRUPAMIENTO
    );
    if (candidataAgrupar) {
      agrupamiento = { escuelaNombre: mejor.nombre, pdvCercano: candidataAgrupar.pdv_solicitud!, fecha: candidataAgrupar.fecha_capacitacion! };
    }
  }

  const notaAgrupamiento = agrupamiento
    ? `Aprovecha: ya hay un proceso agendado en ${agrupamiento.escuelaNombre} el ${formatoCorto(agrupamiento.fecha)} desde ${agrupamiento.pdvCercano}; podrían coordinar la misma visita del capacitador.`
    : null;

  const explicacion = mejor
    ? await generarExplicacion(aCandidatoExplicacion(mejor), masCercanaGeografica ? aCandidatoExplicacion(masCercanaGeografica) : null, notaAgrupamiento)
    : "No encontré escuelas habilitadas para sugerir en este momento.";

  return { pdvResuelto, recomendada: mejor, alternativas, explicacion, agrupamiento, sinCoordenadas };
}
