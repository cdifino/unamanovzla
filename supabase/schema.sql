-- ===========================================================================
-- Mapa de Ayuda — Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecuta este archivo completo en: Supabase > SQL Editor.
-- Despues ejecuta seed.sql para precargar parroquias y hospitales.
-- ===========================================================================

-- --------------------------- TABLAS ----------------------------------------
create table if not exists public.locations (
  id                 text primary key,
  name               text not null,
  kind               text not null check (kind in ('parroquia','hospital','otro')),
  state              text not null,
  municipio          text,
  lat                double precision,
  lng                double precision,
  status_level       text not null default 'sin_datos',
  summary            text default '',
  supplies_needed    text default '',
  donation_poc       text default '',
  rescue_teams       text default '',
  buildings_searched text default '',
  people_aided       text default '',
  blood_needed       boolean default false,
  blood_types        text default '',
  updated_at         timestamptz,
  updated_by         text
);

create table if not exists public.submissions (
  id                 uuid primary key default gen_random_uuid(),
  location_id        text references public.locations(id) on delete cascade,
  location_name      text,
  kind               text,
  submitter_name     text,
  submitter_contact  text,
  update_type        text,
  message            text not null,
  proposed           jsonb default '{}'::jsonb,
  new_location       boolean not null default false,
  status             text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at         timestamptz default now(),
  reviewed_at        timestamptz,
  reviewed_by        uuid
);

create index if not exists submissions_status_idx on public.submissions (status, created_at desc);

-- Quien es administrador. Agrega aqui el user_id de cada admin (ver README).
create table if not exists public.admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  email    text
);

-- --------------------------- SEGURIDAD (RLS) -------------------------------
alter table public.locations   enable row level security;
alter table public.submissions enable row level security;
alter table public.admins      enable row level security;

create or replace function public.is_admin() returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Cualquiera puede LEER las ubicaciones (lectores sin credenciales).
drop policy if exists locations_read on public.locations;
create policy locations_read on public.locations
  for select using (true);

-- Solo administradores pueden modificar ubicaciones.
drop policy if exists locations_admin_update on public.locations;
create policy locations_admin_update on public.locations
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists locations_admin_insert on public.locations;
create policy locations_admin_insert on public.locations
  for insert with check (public.is_admin());

-- Cualquiera puede ENVIAR un reporte (siempre entra como 'pending').
drop policy if exists submissions_insert_public on public.submissions;
create policy submissions_insert_public on public.submissions
  for insert with check (status = 'pending');

-- Solo administradores leen y revisan reportes.
drop policy if exists submissions_admin_read on public.submissions;
create policy submissions_admin_read on public.submissions
  for select using (public.is_admin());
drop policy if exists submissions_admin_update on public.submissions;
create policy submissions_admin_update on public.submissions
  for update using (public.is_admin()) with check (public.is_admin());

-- Un usuario puede ver su propia fila de admin (para detectar el rol).
drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins
  for select using (user_id = auth.uid());

-- --------------------------- PRIVILEGIOS -----------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.locations to anon, authenticated;
grant insert on public.submissions to anon, authenticated;
grant select, update on public.submissions to authenticated;
grant insert, update on public.locations to authenticated;
grant select on public.admins to authenticated;
