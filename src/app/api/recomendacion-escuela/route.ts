import { NextResponse } from "next/server";
import { requirePermiso } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { recomendarEscuela } from "@/lib/recomendacion/recomendar";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { user } = await requirePermiso("escuelas");

  const body = await req.json().catch(() => null);
  const pdv = typeof body?.pdv === "string" ? body.pdv.trim() : "";
  const fecha = typeof body?.fecha === "string" ? body.fecha : "";
  const cargo = typeof body?.cargo === "string" && body.cargo.trim() ? body.cargo.trim() : null;
  const aspirantes = typeof body?.aspirantes === "number" && body.aspirantes > 0 ? body.aspirantes : null;

  if (!pdv || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Faltan datos: se necesita 'pdv' y 'fecha' (aaaa-mm-dd)." }, { status: 400 });
  }

  const resultado = await recomendarEscuela({ pdv, fecha, cargo, aspirantes });

  await logAudit(user.id, "recomendar_escuela", {
    detalle: `PDV "${pdv}" · ${fecha}${cargo ? ` · ${cargo}` : ""} -> ${resultado.recomendada?.nombre ?? "sin recomendación"}`,
  });

  return NextResponse.json(resultado);
}
