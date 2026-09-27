import { distanciaKm } from "@/lib/geoEcuador";
import type { GeometriaRuta, PuntoRuta, ResultadoMatriz, ResultadoRuta, RoutingProvider } from "@/lib/routing/tipos";

// Velocidad promedio asumida para estimar minutos quando no hay ruta real
// (vias interprovinciales de Ecuador, terreno mixto). Es solo una referencia
// para no dejar el campo "min" vacio; con ORS_API_KEY configurada este
// proveedor no se usa salvo que la llamada real falle.
const VELOCIDAD_PROMEDIO_KMH = 55;

function geometriaLinea(origen: PuntoRuta, destino: PuntoRuta): GeometriaRuta {
  return {
    type: "LineString",
    coordinates: [
      [origen.lng, origen.lat],
      [destino.lng, destino.lat],
    ],
  };
}

export const proveedorLineaRecta: RoutingProvider = {
  nombre: "linea_recta",

  async calcularMatriz(origen: PuntoRuta, destinos: PuntoRuta[]): Promise<ResultadoMatriz[]> {
    return destinos.map((destino) => {
      const km = distanciaKm(origen, destino);
      return { km, min: (km / VELOCIDAD_PROMEDIO_KMH) * 60 };
    });
  },

  async calcularRuta(origen: PuntoRuta, destino: PuntoRuta): Promise<ResultadoRuta> {
    const km = distanciaKm(origen, destino);
    return { km, min: (km / VELOCIDAD_PROMEDIO_KMH) * 60, geometria: geometriaLinea(origen, destino) };
  },
};
