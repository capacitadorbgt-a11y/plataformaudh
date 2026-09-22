"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  coordenadasDeCiudad,
  distanciaKm,
  LIMITES_ECUADOR_CONTINENTAL,
  normalizarCiudad,
  SILUETA_ECUADOR,
} from "@/lib/geoEcuador";

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
}

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

  const resultado = useMemo(() => {
    if (!pdvSeleccionado) return null;

    const coordsPdv = coordenadasDeCiudad(pdvSeleccionado.ciudad);

    if (coordsPdv) {
      const ordenadas = escuelasConCoordenadas
        .map(({ escuela, coords }) => ({ escuela, km: distanciaKm(coordsPdv, coords) }))
        .sort((a, b) => a.km - b.km);
      return { sugerencias: ordenadas.slice(0, 3) as Sugerencia[], coordsPdv, aproximado: false };
    }

    // Sin coordenadas para la ciudad del PDV: se ofrece como respaldo
    // cualquier escuela registrada en la misma provincia, sin distancia.
    const provincia = normalizarCiudad(pdvSeleccionado.provincia);
    const mismaProvincia = escuelas
      .filter((e) => provincia && normalizarCiudad(e.provincia) === provincia)
      .slice(0, 3)
      .map((escuela) => ({ escuela, km: null as number | null }));
    return { sugerencias: mismaProvincia, coordsPdv: null, aproximado: true };
  }, [pdvSeleccionado, escuelasConCoordenadas, escuelas]);

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

          {pdvSeleccionado && resultado && (
            <div className="mt-4 space-y-3">
              {resultado.aproximado && (
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
                  <div className="text-xs text-udh-700 font-medium uppercase tracking-wide">
                    Escuela sugerida
                  </div>
                  <div className="font-semibold text-neutral-800">{masCercana.escuela.nombre}</div>
                  <div className="text-xs text-neutral-500">
                    {masCercana.escuela.ciudad ?? "—"}
                    {masCercana.km != null && ` · ~${Math.round(masCercana.km)} km del PDV`}
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
                  {resultado.sugerencias.slice(1).map(({ escuela, km }) => (
                    <Link
                      key={escuela.id}
                      href={`/escuelas/${escuela.id}`}
                      className="flex items-center justify-between text-sm px-3 py-1.5 rounded-lg hover:bg-neutral-50 border border-neutral-100"
                    >
                      <span>{escuela.nombre}</span>
                      <span className="text-xs text-neutral-400 shrink-0 ml-2">
                        {km != null ? `~${Math.round(km)} km` : escuela.ciudad}
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
          cercanaId={masCercana?.escuela.id ?? null}
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
