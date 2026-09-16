import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/auth";
import { createEncuesta } from "../actions";
import EncuestaForm from "@/components/EncuestaForm";

export default async function NuevaEncuestaPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requirePermiso("encuestas");
  const supabase = createClient();

  const { data: pdvs } = await supabase
    .from("pdvs")
    .select("id, nombre")
    .order("nombre")
    .returns<{ id: string; nombre: string }[]>();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">Nueva encuesta de satisfacción</h1>
        <p className="text-sm text-neutral-500">Capacitación en EDF</p>
      </div>

      <EncuestaForm action={createEncuesta} pdvs={pdvs ?? []} error={searchParams?.error} />
    </div>
  );
}
