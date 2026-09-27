import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth";
import { resolverRutasParaDestinos, resolverGeometria } from "@/lib/routing/resolver";
import type { PuntoRuta } from "@/lib/routing";

export const runtime = "nodejs";

interface DestinoEntrada {
  id: string;
  lat: number | null;
  lng: number | null;
}

export async function POST(req: Request) {
  await requirePermiso("escuelas");

  const body = await req.json().catch(() => null);
  const origen = body?.origen as PuntoRuta | undefined;
  const destinos = body?.destinos as DestinoEntrada[] | undefined;
  const origenCiudad = typeof body?.origenCiudad === "string" ? body.origenCiudad : null;
  const geometriaDeId = typeof body?.geometriaDeId === "string" ? body.geometriaDeId : null;

  if (!origen || typeof origen.lat !== "number" || typeof origen.lng !== "number" || !Array.isArray(destinos)) {
    return NextResponse.json({ error: "Cuerpo inválido: falta origen o destinos" }, { status: 400 });
  }

  const { resultados, sinCoordenadas } = await resolverRutasParaDestinos(origen, origenCiudad, destinos);

  let geometria = null;
  if (geometriaDeId) {
    const destino = destinos.find((d) => d.id === geometriaDeId && typeof d.lat === "number" && typeof d.lng === "number");
    if (destino) {
      geometria = await resolverGeometria(origen, { lat: destino.lat as number, lng: destino.lng as number });
    }
  }

  return NextResponse.json({ resultados, geometria, sinCoordenadas });
}
