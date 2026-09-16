-- ============================================================
-- Encuestas de satisfaccion de capacitacion (replica del Google Form
-- "Encuesta de Satisfaccion Capacitacion en EDF")
-- ============================================================
create table if not exists public.encuestas (
  id uuid primary key default gen_random_uuid(),

  -- Identificacion
  capacitador text not null,
  nombre_encuestado text not null,
  fecha_capacitacion date not null,
  cargo text not null,
  cargo_otro text,
  pdv_capacitacion text not null,

  -- Informacion general
  limpieza_organizacion int,
  temas_recordados text,
  tiempo_suficiente text,
  tema_profundidad text,
  que_le_gusto text,
  que_no_le_gusto text,
  nps int,

  -- Calificacion formadores: array de
  -- {nombre, conocimiento, claridad, organizacion, acompanamiento, actitud, resolucion, fortaleza_debilidad}
  -- cada campo de calificacion usa el mismo rango en buckets del formulario original: "1-2","3-4","5-6","7-8","9-10"
  formadores jsonb not null default '[]'::jsonb,

  -- Finalizo el proceso (SI/NO) y ramas condicionales
  finalizo_proceso text,
  desempeno_funciones text,
  observaciones_colaborador text,
  motivo_no_finalizo text,
  motivo_otro text,
  que_habria_facilitado text,
  observaciones_desertor text,

  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_encuestas_pdv on public.encuestas(pdv_capacitacion);
create index if not exists idx_encuestas_fecha on public.encuestas(fecha_capacitacion);
create index if not exists idx_encuestas_capacitador on public.encuestas(capacitador);

drop trigger if exists trg_encuestas_updated_at on public.encuestas;
create trigger trg_encuestas_updated_at
  before update on public.encuestas
  for each row execute procedure public.set_updated_at();

alter table public.encuestas enable row level security;

drop policy if exists encuestas_select on public.encuestas;
create policy encuestas_select on public.encuestas
  for select using (auth.role() = 'authenticated');

drop policy if exists encuestas_insert on public.encuestas;
create policy encuestas_insert on public.encuestas
  for insert with check (auth.role() = 'authenticated');

drop policy if exists encuestas_update on public.encuestas;
create policy encuestas_update on public.encuestas
  for update using (auth.role() = 'authenticated');

drop policy if exists encuestas_delete on public.encuestas;
create policy encuestas_delete on public.encuestas
  for delete using (public.is_admin());

grant select, insert, update on public.encuestas to authenticated;
grant delete on public.encuestas to authenticated; -- filtrado por RLS (solo admin)
