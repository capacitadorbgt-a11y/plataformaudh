-- ============================================================
-- Catalogo de PDV (puntos de venta) a nivel nacional.
-- Se usa para el desplegable "PDV solicitud" en Seguimientos.
-- ============================================================

create table if not exists public.pdvs (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

alter table public.pdvs enable row level security;

drop policy if exists pdvs_select on public.pdvs;
create policy pdvs_select on public.pdvs
  for select using (auth.role() = 'authenticated');

drop policy if exists pdvs_insert on public.pdvs;
create policy pdvs_insert on public.pdvs
  for insert with check (public.is_admin());

drop policy if exists pdvs_delete on public.pdvs;
create policy pdvs_delete on public.pdvs
  for delete using (public.is_admin());

grant select on public.pdvs to authenticated;
grant insert, delete on public.pdvs to authenticated; -- filtrado por RLS (solo admin)
