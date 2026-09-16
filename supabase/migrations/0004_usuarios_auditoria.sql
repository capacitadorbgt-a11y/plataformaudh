-- ============================================================
-- 1) Usuarios: cuenta activa/inactiva y permisos por herramienta
-- ============================================================
alter table public.profiles add column if not exists activo boolean not null default true;
alter table public.profiles add column if not exists permisos jsonb not null default
  '{"escuelas": true, "seguimientos": true, "entregas": true}'::jsonb;

-- ============================================================
-- 2) Auditoria: registro de acciones por usuario
-- ============================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  accion text not null,
  entidad text,
  entidad_id uuid,
  detalle text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_user on public.audit_log(user_id);
create index if not exists idx_audit_log_created on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_admin on public.audit_log;
create policy audit_log_select_admin on public.audit_log
  for select using (public.is_admin());

drop policy if exists audit_log_insert_own on public.audit_log;
create policy audit_log_insert_own on public.audit_log
  for insert with check (auth.uid() = user_id);

grant select on public.audit_log to authenticated; -- filtrado por RLS (solo admin)
grant insert on public.audit_log to authenticated;
