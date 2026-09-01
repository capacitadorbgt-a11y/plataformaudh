-- ============================================================
-- UDH - Universidad del Helado (Bogati)
-- Esquema inicial: escuelas, colaboradores, entregas, seguimientos
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tipos ----------
do $$ begin
  create type public.user_role as enum ('admin_udh', 'analista');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_escuela as enum ('ACTIVO', 'INACTIVO', 'REVISION');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rol_colaborador as enum ('ADMIN', 'POLI', 'OTRO');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_entrega as enum ('CAMISETA', 'ENTRADA_CINE', 'CHEQUE', 'OTRO');
exception when duplicate_object then null; end $$;

-- ---------- Perfiles (extiende auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  role public.user_role not null default 'analista',
  created_at timestamptz not null default now()
);

-- crea perfil automáticamente al registrar un usuario en Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'analista');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- helper: rol admin del usuario autenticado
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin_udh'
  );
$$;

-- ---------- Escuelas (PDV / escuelas de formación) ----------
create table if not exists public.escuelas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  capacidad int,
  provincia text,
  ciudad text,
  zona text,
  fecha_lanzamiento date,
  fecha_ultima_visita date,
  estado public.estado_escuela not null default 'REVISION',
  procesos_completados int default 0,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_escuelas_estado on public.escuelas(estado);
create index if not exists idx_escuelas_provincia on public.escuelas(provincia);

-- ---------- Colaboradores por escuela (datos sensibles) ----------
create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references public.escuelas(id) on delete cascade,
  nombre text not null,
  rol public.rol_colaborador not null default 'OTRO',
  datos_bancarios text, -- cédula + cuenta (texto libre, dato sensible)
  created_at timestamptz not null default now()
);

create index if not exists idx_colaboradores_escuela on public.colaboradores(escuela_id);

-- vista con datos bancarios enmascarados para roles no-admin
-- security_invoker = false (por defecto): la vista corre con los permisos de
-- su dueño, "atravesando" el RLS restrictivo de la tabla base para exponer
-- solo columnas seguras; el enmascarado real lo decide is_admin() por fila,
-- que sí evalúa el usuario que realiza la consulta (auth.uid()).
create or replace view public.colaboradores_view as
select
  id,
  escuela_id,
  nombre,
  rol,
  case when public.is_admin() then datos_bancarios
       else '••• (solo visible para Admin UDH)' end as datos_bancarios,
  created_at
from public.colaboradores;

-- ---------- Entregas: recompensas y material entregado ----------
create table if not exists public.entregas (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references public.escuelas(id) on delete cascade,
  tipo public.tipo_entrega not null,
  cantidad int,
  detalle text,
  fecha date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_entregas_escuela on public.entregas(escuela_id);

-- ---------- Seguimientos: reclutamiento y capacitación ----------
create table if not exists public.seguimientos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid references public.escuelas(id) on delete set null,
  escuela_nombre_libre text, -- respaldo si no hay match exacto con escuelas.nombre
  fecha_capacitacion date,
  num_aspirantes int,
  aspirantes jsonb not null default '[]'::jsonb, -- [{ "nombre": "...", "aprobado": true }]
  cargo text,
  num_ingreso int,
  aspirante_aprobado text,
  pdv_solicitud text,
  encuesta text,
  fecha_ingreso date,
  reembolso text,
  observaciones text,
  analista text,
  pago1 text,
  pago2 text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_seguimientos_escuela on public.seguimientos(escuela_id);
create index if not exists idx_seguimientos_fecha on public.seguimientos(fecha_capacitacion);

-- ---------- updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_escuelas_updated_at on public.escuelas;
create trigger trg_escuelas_updated_at
  before update on public.escuelas
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.escuelas enable row level security;
alter table public.colaboradores enable row level security;
alter table public.entregas enable row level security;
alter table public.seguimientos enable row level security;

-- profiles: cada usuario ve su propio perfil; admin ve todos
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin());

-- escuelas: todo usuario autenticado puede ver y actualizar (visitas de campo);
-- solo admin crea/elimina
drop policy if exists escuelas_select on public.escuelas;
create policy escuelas_select on public.escuelas
  for select using (auth.role() = 'authenticated');

drop policy if exists escuelas_insert on public.escuelas;
create policy escuelas_insert on public.escuelas
  for insert with check (public.is_admin());

drop policy if exists escuelas_update on public.escuelas;
create policy escuelas_update on public.escuelas
  for update using (auth.role() = 'authenticated');

drop policy if exists escuelas_delete on public.escuelas;
create policy escuelas_delete on public.escuelas
  for delete using (public.is_admin());

-- colaboradores: acceso directo a la tabla base SOLO admin (datos sensibles);
-- el resto de usuarios consulta la vista colaboradores_view (enmascarada)
drop policy if exists colaboradores_select_admin on public.colaboradores;
create policy colaboradores_select_admin on public.colaboradores
  for select using (public.is_admin());

drop policy if exists colaboradores_select_all on public.colaboradores;

drop policy if exists colaboradores_write on public.colaboradores;
create policy colaboradores_write on public.colaboradores
  for insert with check (public.is_admin());

drop policy if exists colaboradores_update on public.colaboradores;
create policy colaboradores_update on public.colaboradores
  for update using (public.is_admin());

drop policy if exists colaboradores_delete on public.colaboradores;
create policy colaboradores_delete on public.colaboradores
  for delete using (public.is_admin());

-- entregas: todos ven e insertan; solo admin elimina
drop policy if exists entregas_select on public.entregas;
create policy entregas_select on public.entregas
  for select using (auth.role() = 'authenticated');

drop policy if exists entregas_insert on public.entregas;
create policy entregas_insert on public.entregas
  for insert with check (auth.role() = 'authenticated');

drop policy if exists entregas_delete on public.entregas;
create policy entregas_delete on public.entregas
  for delete using (public.is_admin());

-- seguimientos: todos ven e insertan/actualizan; solo admin elimina
drop policy if exists seguimientos_select on public.seguimientos;
create policy seguimientos_select on public.seguimientos
  for select using (auth.role() = 'authenticated');

drop policy if exists seguimientos_insert on public.seguimientos;
create policy seguimientos_insert on public.seguimientos
  for insert with check (auth.role() = 'authenticated');

drop policy if exists seguimientos_update on public.seguimientos;
create policy seguimientos_update on public.seguimientos
  for update using (auth.role() = 'authenticated');

drop policy if exists seguimientos_delete on public.seguimientos;
create policy seguimientos_delete on public.seguimientos
  for delete using (public.is_admin());

-- ============================================================
-- Grants: RLS restringe FILAS, pero Postgres además exige privilegios de
-- tabla. Sin estos GRANT, "authenticated" no puede ni intentar el SELECT.
-- ============================================================
grant usage on schema public to authenticated;

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

grant select, insert, update on public.escuelas to authenticated;
grant delete on public.escuelas to authenticated; -- filtrado por RLS (solo admin)

grant select on public.colaboradores_view to authenticated;
grant select, insert, update, delete on public.colaboradores to authenticated; -- filtrado por RLS (solo admin)

grant select, insert on public.entregas to authenticated;
grant delete on public.entregas to authenticated; -- filtrado por RLS (solo admin)

grant select, insert, update on public.seguimientos to authenticated;
grant delete on public.seguimientos to authenticated; -- filtrado por RLS (solo admin)

-- ============================================================
-- Nota: la tabla "colaboradores" solo es legible directamente por admin_udh
-- (colaboradores_select_admin). Cualquier otro rol debe leer siempre
-- "colaboradores_view", que expone los mismos datos con la columna
-- datos_bancarios enmascarada para quienes no son admin.
-- ============================================================
