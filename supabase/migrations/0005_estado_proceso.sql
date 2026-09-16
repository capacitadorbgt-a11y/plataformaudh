-- ============================================================
-- Estado del proceso de reclutamiento/capacitacion por seguimiento
-- ============================================================
do $$ begin
  create type public.estado_proceso_seguimiento as enum ('EN_PROCESO', 'FINALIZADO');
exception when duplicate_object then null; end $$;

alter table public.seguimientos
  add column if not exists estado_proceso public.estado_proceso_seguimiento not null default 'EN_PROCESO';
