import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { distanciaKm, normalizarCiudad } from "@/lib/geoEcuador";
import { obtenerProveedorRuteo, proveedorLineaRecta } from "@/lib/routing";
import type { GeometriaRuta, PuntoRuta } from "@/lib/routing";

export const runtime = "nodejs";

// Cuantos destinos como maximo se le mandan a la Matrix API de ORS por
// busqueda, para no gastar de mas la cuota gratuita (2000 req/dia).
const MAX_DESTINOS_RUTA_REAL = 8;
const CACHE_DIAS = 30;

interface DestinoEntrada {
  id: string;
  lat: number | null;
  lng: number | null;
}

interface ResultadoDestino {
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

export async function POST(req: Request) {
  await requirePermiso("escuelas");

  const body = await req.json().catch(() => null);
  const origen = body?.origen as PuntoRuta | undefined;
  const destinos = body?.destinos as DestinoEntrada[] | undefined;
  const origenCiudad = typeof body?.origenCiudad === "string" ? normalizarCiudad(body.origenCiudad) : null;
  const geometriaDeId = typeof body?.geometriaDeId === "string" ? body.geometriaDeId : null;

  if (!origen || typeof origen.lat !== "number" || typeof origen.lng !== "number" || !Array.isArray(destinos)) {
    return NextResponse.json({ error: "Cuerpo inválido: falta origen o destinos" }, { status: 400 });
  }

  const sinCoordenadas = destinos.filter((d) => typeof d.lat !== "number" || typeof d.lng !== "number").map((d) => d.id);
  const validos = destinos.filter(
    (d): d is DestinoEntrada & { lat: number; lng: number } => typeof d.lat === "number" && typeof d.lng === "number"
  );

  if (validos.length === 0) {
    return NextResponse.json({ resultados: [], sinCoordenadas });
  }

  const supabase = createClient();
  const cacheVigente = new Map<string, FilaCache>();
  if (origenCiudad) {
    const desde = new Date(Date.now() - CACHE_DIAS * 24 * 60 * 60 * 1000).toISOString();
    const { data: filas } = await supabase
      .from("ruta_cache")
      .select("escuela_id, km, min, geometria, calculado_en")
      .eq("pdv_ciudad", origenCiudad)
      .in("escuela_id", validos.map((d) => d.id))
      .gte("calculado_en", desde)
      .returns<FilaCache[]>();
    filas?.forEach((f) => cacheVigente.set(f.escuela_id, f));
  }

  const conDistanciaRecta = validos
    .map((d) => ({ destino: d, kmRecta: distanciaKm(origen, d) }))
    .sort((a, b) => a.kmRecta - b.kmRecta);

  const proveedor = obtenerProveedorRuteo();
  const resultados: ResultadoDestino[] = [];
  const filasParaGuardar: { pdv_ciudad: string; escuela_id: string; km: number; min: number; geometria: GeometriaRuta | null; calculado_en: string }[] = [];

  if (proveedor.nombre === "ors") {
    // Las que ya tienen caché vigente no se vuelven a pedir a ORS.
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
        const min = matriz[i]?.min ?? 0;
        resultados.push({ id: p.destino.id, km, min, aproximado: false });
        if (origenCiudad) {
          filasParaGuardar.push({ pdv_ciudad: origenCiudad, escuela_id: p.destino.id, km, min, geometria: null, calculado_en: new Date().toISOString() });
        }
      });
      resultados.push(...resto.map((p) => ({ id: p.destino.id, km: p.kmRecta, min: 0, aproximado: true })));
    } catch {
      // ORS falló (red, cuota, key inválida): se cae a línea recta para lo pendiente.
      resultados.push(...pendientes.map((p) => ({ id: p.destino.id, km: p.kmRecta, min: 0, aproximado: true })));
    }
  } else {
    resultados.push(...conDistanciaRecta.map((p) => ({ id: p.destino.id, km: p.kmRecta, min: 0, aproximado: true })));
  }

  let geometria: GeometriaRuta | null = null;
  if (geometriaDeId) {
    const destino = validos.find((d) => d.id === geometriaDeId);
    if (destino) {
      try {
        const ruta = await proveedor.calcularRuta(origen, destino);
        geometria = ruta.geometria;
        if (origenCiudad && proveedor.nombre === "ors") {
          filasParaGuardar.push({
            pdv_ciudad: origenCiudad,
            escuela_id: destino.id,
            km: ruta.km,
            min: ruta.min,
            geometria: ruta.geometria,
            calculado_en: new Date().toISOString(),
          });
        }
      } catch {
        try {
          const ruta = await proveedorLineaRecta.calcularRuta(origen, destino);
          geometria = ruta.geometria;
        } catch {
          geometria = null;
        }
      }
    }
  }

  if (filasParaGuardar.length > 0) {
    // Upsert de caché: mejor esfuerzo, si falla no debe romper la respuesta.
    await supabase.from("ruta_cache").upsert(filasParaGuardar, { onConflict: "pdv_ciudad,escuela_id" });
  }

  return NextResponse.json({ resultados, geometria, sinCoordenadas });
}
