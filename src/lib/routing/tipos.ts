export interface PuntoRuta {
  lat: number;
  lng: number;
}

// GeoJSON LineString minimo (coordinates en [lng, lat], como manda el estandar).
export interface GeometriaRuta {
  type: "LineString";
  coordinates: [number, number][];
}

export interface ResultadoMatriz {
  km: number;
  min: number;
}

export interface ResultadoRuta extends ResultadoMatriz {
  geometria: GeometriaRuta | null;
}

export interface RoutingProvider {
  nombre: "ors" | "linea_recta";
  // Distancia/tiempo desde un origen hacia varios destinos en una sola llamada.
  calcularMatriz(origen: PuntoRuta, destinos: PuntoRuta[]): Promise<ResultadoMatriz[]>;
  // Ruta completa (con geometria para dibujar) hacia un solo destino.
  calcularRuta(origen: PuntoRuta, destino: PuntoRuta): Promise<ResultadoRuta>;
}
