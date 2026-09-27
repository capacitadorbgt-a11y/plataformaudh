-- ============================================================
-- Cache de rutas reales (OpenRouteService) entre la ciudad de un PDV y una
-- escuela de formacion, para no repetir la misma llamada a la API de rutas
-- cada vez que alguien busca desde la misma ciudad. Se recalcula pasados
-- 30 dias (filtro por fecha lo hace la app, no un trigger).
-- ============================================================

create table if not exists public.ruta_cache (
  pdv_ciudad text not null,
  escuela_id uuid not null references public.escuelas(id) on delete cascade,
  km numeric not null,
  min numeric not null,
  geometria jsonb,
  calculado_en timestamptz not null default now(),
  primary key (pdv_ciudad, escuela_id)
);

create index if not exists idx_ruta_cache_calculado on public.ruta_cache(calculado_en);

alter table public.ruta_cache enable row level security;

drop policy if exists ruta_cache_select_authenticated on public.ruta_cache;
create policy ruta_cache_select_authenticated on public.ruta_cache
  for select using (auth.role() = 'authenticated');

drop policy if exists ruta_cache_insert_authenticated on public.ruta_cache;
create policy ruta_cache_insert_authenticated on public.ruta_cache
  for insert with check (auth.role() = 'authenticated');

drop policy if exists ruta_cache_update_authenticated on public.ruta_cache;
create policy ruta_cache_update_authenticated on public.ruta_cache
  for update using (auth.role() = 'authenticated');

drop policy if exists ruta_cache_delete_admin on public.ruta_cache;
create policy ruta_cache_delete_admin on public.ruta_cache
  for delete using (public.is_admin());

grant select, insert, update on public.ruta_cache to authenticated;
grant delete on public.ruta_cache to authenticated; -- filtrado por RLS (solo admin)
