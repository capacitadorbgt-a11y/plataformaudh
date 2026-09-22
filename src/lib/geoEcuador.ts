// Coordenadas aproximadas (centro de la cabecera cantonal) de las ciudades
// donde Bogati tiene puntos de venta y/o escuelas de formación. Se usan solo
// para sugerir la escuela más cercana y ubicarla en el mapa referencial del
// panel; no son coordenadas de precisión catastral.
export interface CoordenadaCiudad {
  lat: number;
  lng: number;
  provincia: string;
}

export const CIUDADES_ECUADOR: Record<string, CoordenadaCiudad> = {
  CUENCA: { lat: -2.8974, lng: -79.0045, provincia: "AZUAY" },
  GUALACEO: { lat: -2.8858, lng: -78.7758, provincia: "AZUAY" },
  PAUTE: { lat: -2.7797, lng: -78.7602, provincia: "AZUAY" },
  "SIG SIG": { lat: -3.05, lng: -78.7833, provincia: "AZUAY" },
  SIGSIG: { lat: -3.05, lng: -78.7833, provincia: "AZUAY" },
  GIRON: { lat: -3.1667, lng: -79.15, provincia: "AZUAY" },
  GUARANDA: { lat: -1.5906, lng: -79.0009, provincia: "BOLIVAR" },
  CALUMA: { lat: -1.5833, lng: -79.35, provincia: "BOLIVAR" },
  AZOGUES: { lat: -2.7375, lng: -78.8483, provincia: "CAÑAR" },
  BIBLIAN: { lat: -2.6667, lng: -78.8667, provincia: "CAÑAR" },
  "LA TRONCAL": { lat: -2.4167, lng: -79.3333, provincia: "CAÑAR" },
  CAÑAR: { lat: -2.5553, lng: -78.9397, provincia: "CAÑAR" },
  COLTA: { lat: -1.7167, lng: -78.7333, provincia: "CHIMBORAZO" },
  CUMANDA: { lat: -2.1, lng: -79.1167, provincia: "CHIMBORAZO" },
  GUANO: { lat: -1.6, lng: -78.6333, provincia: "CHIMBORAZO" },
  RIOBAMBA: { lat: -1.6636, lng: -78.6546, provincia: "CHIMBORAZO" },
  "LA MANA": { lat: -0.95, lng: -79.2167, provincia: "COTOPAXI" },
  LATACUNGA: { lat: -0.9333, lng: -78.6167, provincia: "COTOPAXI" },
  SALCEDO: { lat: -1.0333, lng: -78.5833, provincia: "COTOPAXI" },
  SAQUISILI: { lat: -0.8333, lng: -78.6667, provincia: "COTOPAXI" },
  PUJILI: { lat: -0.9667, lng: -78.7, provincia: "COTOPAXI" },
  "EL GUABO": { lat: -3.2667, lng: -79.8333, provincia: "EL ORO" },
  HUAQUILLAS: { lat: -3.4783, lng: -80.2306, provincia: "EL ORO" },
  MACHALA: { lat: -3.2581, lng: -79.9553, provincia: "EL ORO" },
  PASAJE: { lat: -3.3333, lng: -79.8, provincia: "EL ORO" },
  PIÑAS: { lat: -3.6667, lng: -79.6667, provincia: "EL ORO" },
  PINAS: { lat: -3.6667, lng: -79.6667, provincia: "EL ORO" },
  "SANTA ROSA": { lat: -3.45, lng: -79.9667, provincia: "EL ORO" },
  ATACAMES: { lat: 0.8667, lng: -79.85, provincia: "ESMERALDAS" },
  ESMERALDAS: { lat: 0.9592, lng: -79.6516, provincia: "ESMERALDAS" },
  QUININDE: { lat: 0.3167, lng: -79.4667, provincia: "ESMERALDAS" },
  DURAN: { lat: -2.1667, lng: -79.8333, provincia: "GUAYAS" },
  "GENERAL VILLAMIL PLAYAS": { lat: -2.6333, lng: -80.3833, provincia: "GUAYAS" },
  PLAYAS: { lat: -2.6333, lng: -80.3833, provincia: "GUAYAS" },
  GUAYAQUIL: { lat: -2.171, lng: -79.9224, provincia: "GUAYAS" },
  JUJAN: { lat: -2.0333, lng: -79.7833, provincia: "GUAYAS" },
  MILAGRO: { lat: -2.1333, lng: -79.6, provincia: "GUAYAS" },
  NARANJAL: { lat: -2.6667, lng: -79.6167, provincia: "GUAYAS" },
  "PEDRO CARBO": { lat: -1.8333, lng: -80.2333, provincia: "GUAYAS" },
  SALITRE: { lat: -1.9667, lng: -80.05, provincia: "GUAYAS" },
  SAMBORONDON: { lat: -1.9667, lng: -79.7333, provincia: "GUAYAS" },
  "SANTA LUCIA": { lat: -1.7833, lng: -80.0333, provincia: "GUAYAS" },
  DAULE: { lat: -1.8667, lng: -79.9833, provincia: "GUAYAS" },
  IBARRA: { lat: 0.3517, lng: -78.1223, provincia: "IMBABURA" },
  OTAVALO: { lat: 0.2345, lng: -78.2611, provincia: "IMBABURA" },
  COTACACHI: { lat: 0.3, lng: -78.2667, provincia: "IMBABURA" },
  CATAMAYO: { lat: -3.9833, lng: -79.35, provincia: "LOJA" },
  LOJA: { lat: -3.9931, lng: -79.2042, provincia: "LOJA" },
  BABAHOYO: { lat: -1.8021, lng: -79.5347, provincia: "LOS RIOS" },
  "BUENA FE": { lat: -0.85, lng: -79.55, provincia: "LOS RIOS" },
  MONTALVO: { lat: -1.4667, lng: -79.5, provincia: "LOS RIOS" },
  QUEVEDO: { lat: -1.0225, lng: -79.4628, provincia: "LOS RIOS" },
  QUINSALOMA: { lat: -1.0333, lng: -79.35, provincia: "LOS RIOS" },
  VENTANAS: { lat: -1.45, lng: -79.4667, provincia: "LOS RIOS" },
  VINCES: { lat: -1.55, lng: -79.7333, provincia: "LOS RIOS" },
  MANTA: { lat: -0.95, lng: -80.7333, provincia: "MANABI" },
  PORTOVIEJO: { lat: -1.0546, lng: -80.4525, provincia: "MANABI" },
  CHONE: { lat: -0.6989, lng: -80.0956, provincia: "MANABI" },
  JIPIJAPA: { lat: -1.35, lng: -80.5833, provincia: "MANABI" },
  MACAS: { lat: -2.3086, lng: -78.1225, provincia: "MORONA SANTIAGO" },
  SUCUA: { lat: -2.4667, lng: -78.1667, provincia: "MORONA SANTIAGO" },
  TENA: { lat: -0.9917, lng: -77.8125, provincia: "NAPO" },
  "EL COCA": { lat: -0.4667, lng: -76.9833, provincia: "ORELLANA" },
  "PUERTO FRANCISCO DE ORELLANA": { lat: -0.4667, lng: -76.9833, provincia: "ORELLANA" },
  "JOYA DE LOS SACHAS": { lat: -0.35, lng: -76.8667, provincia: "ORELLANA" },
  LORETO: { lat: -0.6667, lng: -77.3, provincia: "ORELLANA" },
  PUYO: { lat: -1.4833, lng: -78.0, provincia: "PASTAZA" },
  CAYAMBE: { lat: 0.0417, lng: -78.1447, provincia: "PICHINCHA" },
  "LOS BANCOS": { lat: 0.0333, lng: -78.8667, provincia: "PICHINCHA" },
  MEJIA: { lat: -0.5167, lng: -78.5667, provincia: "PICHINCHA" },
  MACHACHI: { lat: -0.5167, lng: -78.5667, provincia: "PICHINCHA" },
  "PUERTO QUITO": { lat: 0.1167, lng: -79.05, provincia: "PICHINCHA" },
  QUITO: { lat: -0.1807, lng: -78.4678, provincia: "PICHINCHA" },
  RUMIÑAHUI: { lat: -0.3333, lng: -78.45, provincia: "PICHINCHA" },
  RUMINAHUI: { lat: -0.3333, lng: -78.45, provincia: "PICHINCHA" },
  SANGOLQUI: { lat: -0.3333, lng: -78.45, provincia: "PICHINCHA" },
  "LA LIBERTAD": { lat: -2.2333, lng: -80.9, provincia: "SANTA ELENA" },
  SALINAS: { lat: -2.2167, lng: -80.9667, provincia: "SANTA ELENA" },
  "SANTA ELENA": { lat: -2.2333, lng: -80.85, provincia: "SANTA ELENA" },
  "LA CONCORDIA": { lat: -0.0167, lng: -79.3833, provincia: "SANTO DOMINGO" },
  "SANTO DOMINGO": { lat: -0.2528, lng: -79.1731, provincia: "SANTO DOMINGO" },
  "LAGO AGRIO": { lat: 0.0833, lng: -76.8833, provincia: "SUCUMBIOS" },
  "NUEVA LOJA": { lat: 0.0833, lng: -76.8833, provincia: "SUCUMBIOS" },
  SHUSHUFINDI: { lat: -0.1833, lng: -76.65, provincia: "SUCUMBIOS" },
  AMBATO: { lat: -1.2417, lng: -78.6197, provincia: "TUNGURAHUA" },
  PELILEO: { lat: -1.3333, lng: -78.5333, provincia: "TUNGURAHUA" },
  PILLARO: { lat: -1.1667, lng: -78.5333, provincia: "TUNGURAHUA" },
  BAÑOS: { lat: -1.3934, lng: -78.4243, provincia: "TUNGURAHUA" },
  BANOS: { lat: -1.3934, lng: -78.4243, provincia: "TUNGURAHUA" },
  YANTZAZA: { lat: -3.8333, lng: -78.7667, provincia: "ZAMORA CHINCHIPE" },
  ZAMORA: { lat: -4.0667, lng: -78.9667, provincia: "ZAMORA CHINCHIPE" },
};

export function normalizarCiudad(valor: string | null | undefined): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

// Indice normalizado (sin tildes/Ñ) construido a partir de CIUDADES_ECUADOR,
// para no depender de que cada clave del mapa ya esté escrita sin acentos.
const INDICE_NORMALIZADO: Record<string, CoordenadaCiudad> = Object.fromEntries(
  Object.entries(CIUDADES_ECUADOR).map(([nombre, coords]) => [normalizarCiudad(nombre), coords])
);

export function coordenadasDeCiudad(ciudad: string | null | undefined): CoordenadaCiudad | null {
  if (!ciudad) return null;
  return INDICE_NORMALIZADO[normalizarCiudad(ciudad)] ?? null;
}

// Formula de Haversine: distancia en linea recta (km) entre dos puntos dados
// por latitud/longitud. No es distancia por carretera, solo una referencia.
export function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Caja de coordenadas continental de Ecuador (incluye Galápagos separado, no
// usado aqui) para proyectar puntos en el mapa referencial del panel.
export const LIMITES_ECUADOR_CONTINENTAL = {
  latMin: -5.1,
  latMax: 1.5,
  lngMin: -81.1,
  lngMax: -75.2,
};

// Silueta simplificada del territorio continental (sin Galápagos), como
// pares [lng, lat]. Fuente: world.geo.json (dominio publico), usada solo
// como referencia visual en el mapa del panel.
export const SILUETA_ECUADOR: [number, number][] = [
  [-80.302561, -3.404856],
  [-79.770293, -2.657512],
  [-79.986559, -2.220794],
  [-80.368784, -2.685159],
  [-80.967765, -2.246943],
  [-80.764806, -1.965048],
  [-80.933659, -1.057455],
  [-80.58337, -0.906663],
  [-80.399325, -0.283703],
  [-80.020898, 0.36034],
  [-80.09061, 0.768429],
  [-79.542762, 0.982938],
  [-78.855259, 1.380924],
  [-77.855061, 0.809925],
  [-77.668613, 0.825893],
  [-77.424984, 0.395687],
  [-76.57638, 0.256936],
  [-76.292314, 0.416047],
  [-75.801466, 0.084801],
  [-75.373223, -0.152032],
  [-75.233723, -0.911417],
  [-75.544996, -1.56161],
  [-76.635394, -2.608678],
  [-77.837905, -3.003021],
  [-78.450684, -3.873097],
  [-78.639897, -4.547784],
  [-79.205289, -4.959129],
  [-79.624979, -4.454198],
  [-80.028908, -4.346091],
  [-80.442242, -4.425724],
  [-80.469295, -4.059287],
  [-80.184015, -3.821162],
  [-80.302561, -3.404856],
];
