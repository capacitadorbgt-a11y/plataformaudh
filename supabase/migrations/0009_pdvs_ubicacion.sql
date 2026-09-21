-- ============================================================
-- Agrega ciudad/provincia al catalogo de PDV para poder sugerir la
-- escuela de formacion mas cercana segun la ubicacion del punto de venta.
-- ============================================================

alter table public.pdvs add column if not exists ciudad text;
alter table public.pdvs add column if not exists provincia text;
