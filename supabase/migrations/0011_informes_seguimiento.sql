-- ============================================================
-- Permite adjuntar informes (PDF) directamente a un seguimiento, no solo
-- a una escuela. Reutiliza la misma tabla/bucket "informes": un informe
-- queda ligado a una escuela, a un seguimiento, o a ambos.
-- ============================================================

alter table public.informes alter column escuela_id drop not null;
alter table public.informes add column if not exists seguimiento_id uuid references public.seguimientos(id) on delete cascade;

alter table public.informes add constraint informes_escuela_o_seguimiento
  check (escuela_id is not null or seguimiento_id is not null);

create index if not exists idx_informes_seguimiento on public.informes(seguimiento_id);
