-- ============================================================
-- Permite editar entregas (antes solo se podian crear/eliminar)
-- y agrega el tipo PAGO al catalogo de entregas.
-- ============================================================
alter table public.entregas add column if not exists updated_at timestamptz not null default now();

drop policy if exists entregas_update on public.entregas;
create policy entregas_update on public.entregas
  for update using (auth.role() = 'authenticated');

grant update on public.entregas to authenticated;

do $$ begin
  alter type public.tipo_entrega add value if not exists 'PAGO';
exception when duplicate_object then null; end $$;
