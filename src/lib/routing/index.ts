import { proveedorLineaRecta } from "@/lib/routing/lineaRecta";
import { proveedorOpenRouteService } from "@/lib/routing/openRouteService";
import type { RoutingProvider } from "@/lib/routing/tipos";

export type { GeometriaRuta, PuntoRuta, ResultadoMatriz, ResultadoRuta, RoutingProvider } from "@/lib/routing/tipos";
export { proveedorLineaRecta } from "@/lib/routing/lineaRecta";

export function obtenerProveedorRuteo(): RoutingProvider {
  const configurado = process.env.ROUTING_PROVIDER;
  const nombre = configurado === "linea_recta" || configurado === "ors" ? configurado : process.env.ORS_API_KEY ? "ors" : "linea_recta";

  return nombre === "ors" ? proveedorOpenRouteService : proveedorLineaRecta;
}
