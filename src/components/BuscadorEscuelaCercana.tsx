"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  coordenadasDeCiudad,
  distanciaKm,
  LIMITES_ECUADOR_CONTINENTAL,
  normalizarCiudad,
  SILUETA_ECUADOR,
} from "@/lib/geoEcuador";

interface ResultadoRutaApi {
  id: string;
  km: number;
  min: number;
  aproximado: boolean;
}

type Semaforo = "verde" | "amarillo" | "rojo";

interface CandidatoRecomendadoApi {
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

interface RecomendacionApi {
  pdvResuelto: { nombre: string; ciudad: string | null } | null;
  recomendada: CandidatoRecomendadoApi | null;
  alternativas: CandidatoRecomendadoApi[];
  explicacion: string;
  agrupamiento: { escuelaNombre: string; pdvCercano: string; fecha: string } | null;
  sinCoordenadas: string[];
  error?: string;
}

const EMOJI_SEMAFORO: Record<Semaforo, string> = { verde: "🟢", amarillo: "🟡", rojo: "🔴" };

function formatoCortoFecha(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
}

export interface PdvUbicado {
  nombre: string;
  ciudad: string | null;
  provincia: string | null;
}

export interface EscuelaUbicada {
  id: string;
  nombre: string;
  ciudad: string | null;
  provincia: string | null;
  estado: string;
}

interface Sugerencia {
  escuela: EscuelaUbicada;
  km: number | null;
  min: number | null;
  rutaReal: boolean;
}

// Cuantas candidatas (mas alla del top 3 final) se le mandan a /api/rutas,
// para que si la ruta real cambia el orden dentro de un mismo grupo de
// ciudad, el top 3 mostrado ya lo refleje.
const CANDIDATAS_PARA_RUTA = 8;

const NAVY = "#172b4c";
const ORANGE = "#ea580c";

// El viewBox respeta la proporcion real lat/lng del territorio (Ecuador es
// mas alto que ancho) para que la silueta no salga distorsionada.
const ANCHO_MAPA = 100;
const ALTO_MAPA =
  ANCHO_MAPA *
  ((LIMITES_ECUADOR_CONTINENTAL.latMax - LIMITES_ECUADOR_CONTINENTAL.latMin) /
    (LIMITES_ECUADOR_CONTINENTAL.lngMax - LIMITES_ECUADOR_CONTINENTAL.lngMin));

function proyectar(lat: number, lng: number) {
  const { latMin, latMax, lngMin, lngMax } = LIMITES_ECUADOR_CONTINENTAL;
  const x = ((lng - lngMin) / (lngMax - lngMin)) * ANCHO_MAPA;
  const y = ((latMax - lat) / (latMax - latMin)) * ALTO_MAPA;
  return { x, y };
}

const SILUETA_PATH =
  SILUETA_ECUADOR.map(([lng, lat], i) => {
    const p = proyectar(lat, lng);
    return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(" ") + " Z";

export default function BuscadorEscuelaCercana({
  pdvs,
  escuelas,
}: {
  pdvs: PdvUbicado[];
  escuelas: EscuelaUbicada[];
}) {
  const [query, setQuery] = useState("");
  const [pdvSeleccionado, setPdvSeleccionado] = useState<PdvUbicado | null>(null);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [fecha, setFecha] = useState("");
  const [cargo, setCargo] = useState("");
  const [aspirantes, setAspirantes] = useState("");
  const [recomendacion, setRecomendacion] = useState<RecomendacionApi | null>(null);
  const [cargandoRecomendacion, setCargandoRecomendacion] = useState(false);

  // Puntos de venta que ya son escuela de formación (aparecen en /escuelas),
  // para mostrarlos primero en las sugerencias de búsqueda.
  const nombresEscuelas = useMemo(() => new Set(escuelas.map((e) => normalizarCiudad(e.nombre))), [escuelas]);

  const coincidencias = useMemo(() => {
    const q = normalizarCiudad(query);
    if (!q || q.length < 2) return [];
    const esEscuela = (p: PdvUbicado) => nombresEscuelas.has(normalizarCiudad(p.nombre));
    return pdvs
      .filter((p) => normalizarCiudad(p.nombre).includes(q))
      .sort((a, b) => Number(esEscuela(b)) - Number(esEscuela(a)))
      .slice(0, 8);
  }, [query, pdvs, nombresEscuelas]);

  const escuelasConCoordenadas = useMemo(
    () =>
      escuelas
        .map((e) => ({ escuela: e, coords: coordenadasDeCiudad(e.ciudad) }))
        .filter((e): e is { escuela: EscuelaUbicada; coords: NonNullable<ReturnType<typeof coordenadasDeCiudad>> } => !!e.coords),
    [escuelas]
  );

  const [rutasReales, setRutasReales] = useState<Record<string, ResultadoRutaApi>>({});
  const [cargandoRutas, setCargandoRutas] = useState(false);

  const candidatos = useMemo(() => {
    if (!pdvSeleccionado) return null;

    // Solo se sugieren escuelas habilitadas para capacitar: activas o en
    // revisión. Las inactivas quedan fuera de las sugerencias.
    const habilitadas = (estado: string) => estado === "ACTIVO" || estado === "REVISION";
    const ciudadPdv = normalizarCiudad(pdvSeleccionado.ciudad);
    const coordsPdv = coordenadasDeCiudad(pdvSeleccionado.ciudad);

    if (coordsPdv) {
      const ordenadas = escuelasConCoordenadas
        .filter(({ escuela }) => habilitadas(escuela.estado))
        .map(({ escuela, coords }) => ({
          escuela,
          coords,
          km: distanciaKm(coordsPdv, coords),
          mismaCiudad: normalizarCiudad(escuela.ciudad) === ciudadPdv,
        }))
        .sort((a, b) => {
          // Misma ciudad del PDV siempre primero, luego por cercanía.
          if (a.mismaCiudad !== b.mismaCiudad) return a.mismaCiudad ? -1 : 1;
          return a.km - b.km;
        });
      return { lista: ordenadas.slice(0, CANDIDATAS_PARA_RUTA), coordsPdv, sinCoordsPdv: false };
    }

    // Sin coordenadas para la ciudad del PDV: se ofrece como respaldo
    // cualquier escuela registrada en la misma provincia, sin distancia.
    const provincia = normalizarCiudad(pdvSeleccionado.provincia);
    const mismaProvincia = escuelas
      .filter((e) => habilitadas(e.estado) && provincia && normalizarCiudad(e.provincia) === provincia)
      .slice(0, 3)
      .map((escuela) => ({ escuela, coords: null, km: null as number | null, mismaCiudad: false }));
    return { lista: mismaProvincia, coordsPdv: null, sinCoordsPdv: true };
  }, [pdvSeleccionado, escuelasConCoordenadas, escuelas]);

  // Cada vez que cambian las candidatas con coordenadas, se piden rutas
  // reales (o línea recta de respaldo) al endpoint /api/rutas.
  useEffect(() => {
    setRutasReales({});
    if (!candidatos || candidatos.sinCoordsPdv || !candidatos.coordsPdv || candidatos.lista.length === 0) return;

    let cancelado = false;
    setCargandoRutas(true);
    fetch("/api/rutas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origen: candidatos.coordsPdv,
        origenCiudad: pdvSeleccionado?.ciudad ?? null,
        destinos: candidatos.lista.map((c) => ({ id: c.escuela.id, lat: c.coords?.lat ?? null, lng: c.coords?.lng ?? null })),
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: { resultados?: ResultadoRutaApi[] } | null) => {
        if (cancelado || !datos?.resultados) return;
        const mapa: Record<string, ResultadoRutaApi> = {};
        datos.resultados.forEach((r) => (mapa[r.id] = r));
        setRutasReales(mapa);
      })
      .catch(() => {
        // Sin conexión al endpoint: se sigue mostrando el orden en línea recta.
      })
      .finally(() => {
        if (!cancelado) setCargandoRutas(false);
      });

    return () => {
      cancelado = true;
    };
  }, [candidatos, pdvSeleccionado?.ciudad]);

  // Si además del PDV se indica una fecha tentativa, se pide una
  // recomendación real (combina tiempo de viaje, cupos y demoras) en vez de
  // solo ordenar por distancia.
  useEffect(() => {
    setRecomendacion(null);
    if (!pdvSeleccionado || !fecha) return;

    let cancelado = false;
    setCargandoRecomendacion(true);
    fetch("/api/recomendacion-escuela", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pdv: pdvSeleccionado.nombre,
        fecha,
        cargo: cargo.trim() || null,
        aspirantes: aspirantes.trim() ? Number(aspirantes) : null,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: RecomendacionApi | null) => {
        if (!cancelado && datos) setRecomendacion(datos);
      })
      .catch(() => {
        // Sin conexión al endpoint: se mantiene la vista por distancia.
      })
      .finally(() => {
        if (!cancelado) setCargandoRecomendacion(false);
      });

    return () => {
      cancelado = true;
    };
  }, [pdvSeleccionado, fecha, cargo, aspirantes]);

  const resultado = useMemo(() => {
    if (!candidatos) return null;

    if (candidatos.sinCoordsPdv) {
      return {
        sugerencias: candidatos.lista.map((c) => ({ escuela: c.escuela, km: null, min: null, rutaReal: false })) as Sugerencia[],
        coordsPdv: null,
        sinCoordsPdv: true,
      };
    }

    const conRutaReal = candidatos.lista
      .map((c) => {
        const real = rutasReales[c.escuela.id];
        return {
          escuela: c.escuela,
          mismaCiudad: c.mismaCiudad,
          km: real ? real.km : c.km,
          min: real ? real.min : null,
          rutaReal: !!real && !real.aproximado,
        };
      })
      .sort((a, b) => {
        if (a.mismaCiudad !== b.mismaCiudad) return a.mismaCiudad ? -1 : 1;
        return (a.km ?? Infinity) - (b.km ?? Infinity);
      });

    return { sugerencias: conRutaReal.slice(0, 3) as Sugerencia[], coordsPdv: candidatos.coordsPdv, sinCoordsPdv: false };
  }, [candidatos, rutasReales]);

  const masCercana = resultado?.sugerencias[0] ?? null;

  return (
    <div className="card p-5">
      <h2 className="font-semibold">Escuela de formación más cercana</h2>
      <p className="text-xs text-neutral-400 mb-4">
        Busca un punto de venta y te sugerimos la escuela de formación más próxima para capacitar a su personal.
      </p>

      <div className="grid md:grid-cols-[minmax(0,1fr)_320px] gap-5">
        <div>
          <div className="relative">
            <input
              className="input"
              placeholder="Buscar punto de venta (ej. GUAY GYE GARZO CENTRO)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPdvSeleccionado(null);
                setMostrarLista(true);
              }}
              onFocus={() => setMostrarLista(true)}
              onBlur={() => setTimeout(() => setMostrarLista(false), 150)}
            />
            {mostrarLista && coincidencias.length > 0 && (
              <div className="absolute z-20 mt-1 w-full card p-1 shadow-lg max-h-64 overflow-y-auto">
                {coincidencias.map((p) => (
                  <button
                    key={p.nombre}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setPdvSeleccionado(p);
                      setQuery(p.nombre);
                      setMostrarLista(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-neutral-100"
                  >
                    <div className="font-medium flex items-center gap-1.5">
                      {p.nombre}
                      {nombresEscuelas.has(normalizarCiudad(p.nombre)) && (
                        <span className="badge bg-udh-100 text-udh-700 text-[10px]">Escuela</span>
                      )}
                    </div>
                    {(p.ciudad || p.provincia) && (
                      <div className="text-xs text-neutral-400">
                        {[p.ciudad, p.provincia].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!pdvSeleccionado && (
            <p className="text-xs text-neutral-400 mt-3">
              Escribe al menos 2 letras del nombre del PDV y selecciónalo de la lista.
            </p>
          )}

          {pdvSeleccionado && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div>
                <label className="text-[10px] text-neutral-400">Fecha tentativa</label>
                <input className="input text-sm" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400">Cargo</label>
                <input
                  className="input text-sm"
                  placeholder="ADM, PTC, POLI..."
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400">Aspirantes</label>
                <input
                  className="input text-sm"
                  type="number"
                  min={1}
                  value={aspirantes}
                  onChange={(e) => setAspirantes(e.target.value)}
                />
              </div>
            </div>
          )}
          {pdvSeleccionado && !fecha && (
            <p className="text-[11px] text-neutral-400 mt-1">
              Indica una fecha para recibir una recomendación real (combina tiempo de viaje, cupos y demoras), no
              solo la distancia.
            </p>
          )}

          {pdvSeleccionado && fecha && (
            <div className="mt-4 space-y-3">
              {cargandoRecomendacion && !recomendacion && (
                <p className="text-sm text-neutral-400">Calculando la mejor recomendación…</p>
              )}

              {recomendacion?.error && (
                <p className="text-xs text-amber-600">{recomendacion.explicacion}</p>
              )}

              {recomendacion?.recomendada && (
                <>
                  <Link
                    href={`/escuelas/${recomendacion.recomendada.escuelaId}`}
                    className="block border-2 border-udh-500 bg-udh-50 rounded-xl px-4 py-3 hover:bg-udh-100"
                  >
                    <div className="text-xs text-udh-700 font-medium uppercase tracking-wide flex items-center gap-1.5">
                      Escuela recomendada
                      <span className="text-sm" title={`Disponibilidad: ${recomendacion.recomendada.semaforo}`}>
                        {EMOJI_SEMAFORO[recomendacion.recomendada.semaforo]}
                      </span>
                    </div>
                    <div className="font-semibold text-neutral-800">{recomendacion.recomendada.nombre}</div>
                    <div className="text-xs text-neutral-500">
                      {recomendacion.recomendada.ciudad ?? "—"} · ~{Math.round(recomendacion.recomendada.km)} km · ~
                      {Math.round(recomendacion.recomendada.min)} min
                      {recomendacion.recomendada.cuposLibres != null &&
                        ` · ${recomendacion.recomendada.cuposLibres} cupo${recomendacion.recomendada.cuposLibres === 1 ? "" : "s"} libre${recomendacion.recomendada.cuposLibres === 1 ? "" : "s"}`}
                    </div>
                  </Link>

                  <p className="text-sm text-neutral-600 italic">{recomendacion.explicacion}</p>

                  {recomendacion.recomendada.cuposLibres === 0 && recomendacion.recomendada.proximaFechaLibre && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      Se libera un cupo el {formatoCortoFecha(recomendacion.recomendada.proximaFechaLibre)}.
                    </p>
                  )}

                  {recomendacion.agrupamiento && (
                    <p className="text-xs text-udh-700 bg-udh-50 rounded-lg px-3 py-2">
                      Oportunidad de agrupar: {recomendacion.agrupamiento.pdvCercano} ya tiene una capacitación el{" "}
                      {formatoCortoFecha(recomendacion.agrupamiento.fecha)} en la misma escuela.
                    </p>
                  )}

                  <Link
                    href={`/seguimientos/nuevo?escuela_id=${recomendacion.recomendada.escuelaId}&fecha_capacitacion=${fecha}${cargo ? `&cargo=${encodeURIComponent(cargo)}` : ""}&pdv_solicitud=${encodeURIComponent(pdvSeleccionado.nombre)}`}
                    className="btn-primary inline-block text-sm"
                  >
                    Crear seguimiento con esta escuela
                  </Link>

                  {recomendacion.alternativas.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs text-neutral-400">Otras opciones:</div>
                      {recomendacion.alternativas.map((a) => (
                        <Link
                          key={a.escuelaId}
                          href={`/escuelas/${a.escuelaId}`}
                          className="flex items-center justify-between text-sm px-3 py-1.5 rounded-lg hover:bg-neutral-50 border border-neutral-100"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="text-xs">{EMOJI_SEMAFORO[a.semaforo]}</span> {a.nombre}
                          </span>
                          <span className="text-xs text-neutral-400 shrink-0 ml-2">
                            ~{Math.round(a.km)} km · ~{Math.round(a.min)} min
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {pdvSeleccionado && !fecha && resultado && (
            <div className="mt-4 space-y-3">
              {resultado.sinCoordsPdv && (
                <p className="text-xs text-amber-600">
                  No tenemos coordenadas para "{pdvSeleccionado.ciudad || "esta ciudad"}"; se sugieren escuelas de la
                  misma provincia como referencia.
                </p>
              )}

              {masCercana ? (
                <Link
                  href={`/escuelas/${masCercana.escuela.id}`}
                  className="block border-2 border-udh-500 bg-udh-50 rounded-xl px-4 py-3 hover:bg-udh-100"
                >
                  <div className="text-xs text-udh-700 font-medium uppercase tracking-wide flex items-center gap-1.5">
                    Escuela sugerida
                    {!resultado.sinCoordsPdv && masCercana.km != null && (
                      <span className={`badge text-[10px] ${masCercana.rutaReal ? "bg-udh-100 text-udh-700" : "bg-neutral-100 text-neutral-500"}`}>
                        {cargandoRutas && !masCercana.rutaReal ? "calculando ruta…" : masCercana.rutaReal ? "ruta real" : "aprox. en línea recta"}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-neutral-800">{masCercana.escuela.nombre}</div>
                  <div className="text-xs text-neutral-500">
                    {masCercana.escuela.ciudad ?? "—"}
                    {masCercana.km != null && ` · ~${Math.round(masCercana.km)} km`}
                    {masCercana.min != null && ` · ~${Math.round(masCercana.min)} min`}
                    {masCercana.km != null && " del PDV"}
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-neutral-400">
                  No encontramos escuelas de formación cercanas registradas para este PDV.
                </p>
              )}

              {resultado.sugerencias.length > 1 && (
                <div className="space-y-1.5">
                  <div className="text-xs text-neutral-400">Otras opciones:</div>
                  {resultado.sugerencias.slice(1).map(({ escuela, km, min }) => (
                    <Link
                      key={escuela.id}
                      href={`/escuelas/${escuela.id}`}
                      className="flex items-center justify-between text-sm px-3 py-1.5 rounded-lg hover:bg-neutral-50 border border-neutral-100"
                    >
                      <span>{escuela.nombre}</span>
                      <span className="text-xs text-neutral-400 shrink-0 ml-2">
                        {km != null ? `~${Math.round(km)} km${min != null ? ` · ~${Math.round(min)} min` : ""}` : escuela.ciudad}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <MapaEcuador
          escuelas={escuelasConCoordenadas}
          pdvCoords={resultado?.coordsPdv ?? null}
          cercanaId={recomendacion?.recomendada?.escuelaId ?? masCercana?.escuela.id ?? null}
        />
      </div>
    </div>
  );
}

function MapaEcuador({
  escuelas,
  pdvCoords,
  cercanaId,
}: {
  escuelas: { escuela: EscuelaUbicada; coords: { lat: number; lng: number } }[];
  pdvCoords: { lat: number; lng: number } | null;
  cercanaId: string | null;
}) {
  const puntoPdv = pdvCoords ? proyectar(pdvCoords.lat, pdvCoords.lng) : null;
  const puntoCercana = escuelas.find((e) => e.escuela.id === cercanaId);

  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
      <div className="text-[10px] font-semibold tracking-wide text-neutral-400 mb-1">ECUADOR</div>
      <svg
        viewBox={`0 0 ${ANCHO_MAPA} ${ALTO_MAPA.toFixed(2)}`}
        className="w-full h-auto"
        role="img"
        aria-label="Mapa referencial de Ecuador"
      >
        <path d={SILUETA_PATH} fill="#eaf0f8" stroke="#b9c6db" strokeWidth="0.5" strokeLinejoin="round" />

        {escuelas.map(({ escuela, coords }) => {
          const p = proyectar(coords.lat, coords.lng);
          const esCercana = escuela.id === cercanaId;
          return (
            <circle
              key={escuela.id}
              cx={p.x}
              cy={p.y}
              r={esCercana ? 2.6 : 1.4}
              fill={esCercana ? ORANGE : NAVY}
              stroke={esCercana ? "#fff" : "none"}
              strokeWidth={esCercana ? 0.6 : 0}
            >
              <title>{escuela.nombre}</title>
            </circle>
          );
        })}

        {puntoPdv && puntoCercana && (
          <line
            x1={puntoPdv.x}
            y1={puntoPdv.y}
            x2={proyectar(puntoCercana.coords.lat, puntoCercana.coords.lng).x}
            y2={proyectar(puntoCercana.coords.lat, puntoCercana.coords.lng).y}
            stroke={ORANGE}
            strokeWidth="0.5"
            strokeDasharray="1.5,1"
          />
        )}

        {puntoPdv && (
          <circle cx={puntoPdv.x} cy={puntoPdv.y} r="2.2" fill="#fff" stroke={ORANGE} strokeWidth="1.4" />
        )}
      </svg>
      <div className="flex items-center gap-3 text-[10px] text-neutral-500 mt-2 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: NAVY }} /> Escuelas
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: ORANGE }} /> Sugerida / PDV
        </span>
      </div>
    </div>
  );
}
