-- ============================================================
-- 1) Colaboradores: cedula y fecha de ingreso como campos propios
-- ============================================================
alter table public.colaboradores add column if not exists cedula text;
alter table public.colaboradores add column if not exists fecha_ingreso date;

-- se recrea la vista enmascarada para incluir las columnas nuevas
-- (cedula se enmascara igual que datos_bancarios; fecha_ingreso es publica)
drop view if exists public.colaboradores_view;
create view public.colaboradores_view as
select
  id,
  escuela_id,
  nombre,
  rol,
  case when public.is_admin() then cedula
       else '••• (solo visible para Admin UDH)' end as cedula,
  case when public.is_admin() then datos_bancarios
       else '••• (solo visible para Admin UDH)' end as datos_bancarios,
  fecha_ingreso,
  created_at
from public.colaboradores;

grant select on public.colaboradores_view to authenticated;

-- ============================================================
-- 2) Informes: archivos adjuntos por escuela (PDF, DOCX, XLS, etc.)
-- ============================================================
create table if not exists public.informes (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references public.escuelas(id) on delete cascade,
  nombre_archivo text not null,
  tipo_archivo text,
  storage_path text not null,
  tamano_bytes bigint,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_informes_escuela on public.informes(escuela_id);

alter table public.informes enable row level security;

drop policy if exists informes_select on public.informes;
create policy informes_select on public.informes
  for select using (auth.role() = 'authenticated');

drop policy if exists informes_insert on public.informes;
create policy informes_insert on public.informes
  for insert with check (auth.role() = 'authenticated');

drop policy if exists informes_delete on public.informes;
create policy informes_delete on public.informes
  for delete using (public.is_admin());

grant select, insert on public.informes to authenticated;
grant delete on public.informes to authenticated; -- filtrado por RLS (solo admin)

-- ============================================================
-- 3) Storage: politicas para el bucket "informes" (creado via API,
-- privado). Cualquier autenticado puede leer/subir; solo admin borra.
-- ============================================================
drop policy if exists informes_storage_select on storage.objects;
create policy informes_storage_select on storage.objects
  for select using (bucket_id = 'informes' and auth.role() = 'authenticated');

drop policy if exists informes_storage_insert on storage.objects;
create policy informes_storage_insert on storage.objects
  for insert with check (bucket_id = 'informes' and auth.role() = 'authenticated');

drop policy if exists informes_storage_delete on storage.objects;
create policy informes_storage_delete on storage.objects
  for delete using (bucket_id = 'informes' and public.is_admin());
