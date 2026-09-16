import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import { notFound } from "next/navigation";
import { updateEncuesta } from "../../actions";
import EncuestaForm from "@/components/EncuestaForm";
import type { Encuesta } from "@/types/database";

export default async function EditarEncuestaPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  await requirePermiso("encuestas");
  const supabase = createClient();

  const [{ data: pdvs }, { data: encuesta }] = await Promise.all([
    supabase.from("pdvs").select("id, nombre").order("nombre").returns<{ id: string; nombre: string }[]>(),
    supabase.from("encuestas").select("*").eq("id", params.id).single<Encuesta>(),
  ]);

  if (!encuesta) notFound();

  const boundUpdate = updateEncuesta.bind(null, encuesta.id);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">Editar encuesta de satisfacción</h1>
        <p className="text-sm text-neutral-500">Capacitación en EDF</p>
      </div>

      <EncuestaForm action={boundUpdate} pdvs={pdvs ?? []} encuesta={encuesta} error={searchParams?.error} />
    </div>
  );
}
