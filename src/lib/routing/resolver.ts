import "server-only";
import { createClient } from "@/lib/supabase/server";
import { normalizarCiudad } from "@/lib/geoEcuador";
import { obtenerProveedorRuteo, proveedorLineaRecta } from "@/lib/routing/index";
import type { GeometriaRuta, PuntoRuta } from "@/lib/routing/tipos";

// Cuantos destinos como maximo se le mandan a la Matrix API de ORS por
// busqueda, para no gastar de mas la cuota gratuita (2000 req/dia).
const MAX_DESTINOS_RUTA_REAL = 8;
const CACHE_DIAS = 30;

export interface DestinoConId {
  id: string;
  lat: number | null;
  lng: number | null;
}

export interface ResultadoRutaDestino {
  id: string;
  km: number;
  min: number;
  aproximado: boolean;
}

interface FilaCache {
  escuela_id: string;
  km: number;
  min: number;
  geometria: GeometriaRuta | null;
  calculado_en: string;
}

// Usado por /api/rutas y por el motor de recomendación: dado un origen y una
// lista de destinos con id (típicamente escuelas), calcula km/min por ruta
// real (si hay ORS_API_KEY) con caché de 30 días por ciudad de origen, o en
// línea recta si no. Los destinos sin lat/lng se reportan en sinCoordenadas
// y no entran a la ruta.
export async function resolverRutasParaDestinos(
  origen: PuntoRuta,
  origenCiudad: string | null,
  destinos: DestinoConId[]
): Promise<{ resultados: ResultadoRutaDestino[]; sinCoordenadas: string[] }> {
  const ciudadNormalizada = origenCiudad ? normalizarCiudad(origenCiudad) : null;
  const sinCoordenadas = destinos.filter((d) => typeof d.lat !== "number" || typeof d.lng !== "number").map((d) => d.id);
  const validos = destinos.filter(
    (d): d is DestinoConId & { lat: number; lng: number } => typeof d.lat === "number" && typeof d.lng === "number"
  );

  if (validos.length === 0) return { resultados: [], sinCoordenadas };

  const supabase = createClient();
  const cacheVigente = new Map<string, FilaCache>();
  if (ciudadNormalizada) {
    const desde = new Date(Date.now() - CACHE_DIAS * 24 * 60 * 60 * 1000).toISOString();
    const { data: filas } = await supabase
      .from("ruta_cache")
      .select("escuela_id, km, min, geometria, calculado_en")
      .eq("pdv_ciudad", ciudadNormalizada)
      .in("escuela_id", validos.map((d) => d.id))
      .gte("calculado_en", desde)
      .returns<FilaCache[]>();
    filas?.forEach((f) => cacheVigente.set(f.escuela_id, f));
  }

  // Estimación en línea recta (siempre disponible, sin red): sirve para
  // preseleccionar candidatas y como valor real cuando no hay ORS_API_KEY o
  // la llamada a ORS falla. Antes esto se calculaba solo en km y el tiempo
  // quedaba fijo en 0, lo que hacía que el componente "tiempo" del score de
  // recomendación no distinguiera una escuela a 10 km de una a 200 km.
  const estimacionesRecta = await proveedorLineaRecta.calcularMatriz(origen, validos);
  const conDistanciaRecta = validos
    .map((d, i) => ({ destino: d, kmRecta: estimacionesRecta[i].km, minRecta: estimacionesRecta[i].min }))
    .sort((a, b) => a.kmRecta - b.kmRecta);

  const proveedor = obtenerProveedorRuteo();
  const resultados: ResultadoRutaDestino[] = [];
  const filasParaGuardar: { pdv_ciudad: string; escuela_id: string; km: number; min: number; geometria: GeometriaRuta | null; calculado_en: string }[] = [];

  if (proveedor.nombre === "ors") {
    const pendientes = conDistanciaRecta.filter((p) => !cacheVigente.has(p.destino.id));
    const preseleccionadas = pendientes.slice(0, MAX_DESTINOS_RUTA_REAL);
    const resto = pendientes.slice(MAX_DESTINOS_RUTA_REAL);

    cacheVigente.forEach((fila, id) => {
      resultados.push({ id, km: fila.km, min: fila.min, aproximado: false });
    });

    try {
      const matriz = preseleccionadas.length
        ? await proveedor.calcularMatriz(
            origen,
            preseleccionadas.map((p) => p.destino)
          )
        : [];
      preseleccionadas.forEach((p, i) => {
        const km = matriz[i]?.km ?? p.kmRecta;
        const min = matriz[i]?.min ?? p.minRecta;
        resultados.push({ id: p.destino.id, km, min, aproximado: false });
        if (ciudadNormalizada) {
          filasParaGuardar.push({ pdv_ciudad: ciudadNormalizada, escuela_id: p.destino.id, km, min, geometria: null, calculado_en: new Date().toISOString() });
        }
      });
      resultados.push(...resto.map((p) => ({ id: p.destino.id, km: p.kmRecta, min: p.minRecta, aproximado: true })));
    } catch {
      resultados.push(...pendientes.map((p) => ({ id: p.destino.id, km: p.kmRecta, min: p.minRecta, aproximado: true })));
    }
  } else {
    resultados.push(...conDistanciaRecta.map((p) => ({ id: p.destino.id, km: p.kmRecta, min: p.minRecta, aproximado: true })));
  }

  if (filasParaGuardar.length > 0) {
    await supabase.from("ruta_cache").upsert(filasParaGuardar, { onConflict: "pdv_ciudad,escuela_id" });
  }

  return { resultados, sinCoordenadas };
}

export async function resolverGeometria(origen: PuntoRuta, destino: PuntoRuta): Promise<GeometriaRuta | null> {
  const proveedor = obtenerProveedorRuteo();
  try {
    const ruta = await proveedor.calcularRuta(origen, destino);
    return ruta.geometria;
  } catch {
    try {
      const ruta = await proveedorLineaRecta.calcularRuta(origen, destino);
      return ruta.geometria;
    } catch {
      return null;
    }
  }
}
