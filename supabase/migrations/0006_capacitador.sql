-- ============================================================
-- Campo Capacitador en seguimientos
-- ============================================================
alter table public.seguimientos add column if not exists capacitador text;
