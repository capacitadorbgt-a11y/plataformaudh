import type { GeometriaRuta, PuntoRuta, ResultadoMatriz, ResultadoRuta, RoutingProvider } from "@/lib/routing/tipos";

const PERFIL = "driving-car";
const MATRIX_URL = `https://api.openrouteservice.org/v2/matrix/${PERFIL}`;
const DIRECTIONS_URL = `https://api.openrouteservice.org/v2/directions/${PERFIL}/geojson`;

function aCoordenadaOrs(punto: PuntoRuta): [number, number] {
  return [punto.lng, punto.lat];
}

export const proveedorOpenRouteService: RoutingProvider = {
  nombre: "ors",

  async calcularMatriz(origen: PuntoRuta, destinos: PuntoRuta[]): Promise<ResultadoMatriz[]> {
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) throw new Error("ORS_API_KEY no configurada");
    if (destinos.length === 0) return [];

    const locations = [aCoordenadaOrs(origen), ...destinos.map(aCoordenadaOrs)];
    const respuesta = await fetch(MATRIX_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations,
        sources: [0],
        destinations: destinos.map((_, i) => i + 1),
        metrics: ["distance", "duration"],
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      throw new Error(`ORS matrix respondió ${respuesta.status}: ${detalle.slice(0, 300)}`);
    }

    const datos = await respuesta.json();
    const distancias: (number | null)[] = datos.distances?.[0] ?? [];
    const duraciones: (number | null)[] = datos.durations?.[0] ?? [];

    return destinos.map((_, i) => ({
      km: (distancias[i] ?? 0) / 1000,
      min: (duraciones[i] ?? 0) / 60,
    }));
  },

  async calcularRuta(origen: PuntoRuta, destino: PuntoRuta): Promise<ResultadoRuta> {
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) throw new Error("ORS_API_KEY no configurada");

    const respuesta = await fetch(DIRECTIONS_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [aCoordenadaOrs(origen), aCoordenadaOrs(destino)],
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      throw new Error(`ORS directions respondió ${respuesta.status}: ${detalle.slice(0, 300)}`);
    }

    const datos = await respuesta.json();
    const feature = datos.features?.[0];
    const resumen = feature?.properties?.summary;
    const geometria: GeometriaRuta | null =
      feature?.geometry?.type === "LineString" ? { type: "LineString", coordinates: feature.geometry.coordinates } : null;

    return {
      km: (resumen?.distance ?? 0) / 1000,
      min: (resumen?.duration ?? 0) / 60,
      geometria,
    };
  },
};
