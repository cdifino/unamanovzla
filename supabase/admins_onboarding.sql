-- ===========================================================================
-- Mapa de Ayuda — Migracion: onboarding self-service de administradores
-- Ejecuta este archivo COMPLETO en: Supabase > SQL Editor.
-- Es idempotente: puedes correrlo varias veces sin romper nada.
--
-- Modelo: cualquier persona puede SOLICITAR ser administrador (queda 'pending').
-- Un super-admin revisa la solicitud, la aprueba/rechaza y, de forma
-- informativa, le asigna el centro/hospital que va a gestionar.
-- Alcance FLEXIBLE: todo admin aprobado puede editar cualquier ubicacion;
-- la asignacion es solo informativa.
-- ===========================================================================

-- 1) Nuevas columnas en la tabla de administradores -------------------------
alter table public.admins add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'rejected'));
alter table public.admins add column if not exists is_super boolean not null default false;
alter table public.admins add column if not exists full_name text;
-- Centro/hospital asignado (informativo). Puede ser una ubicacion existente
-- y/o un texto libre con el nombre del centro.
alter table public.admins add column if not exists assigned_location_id text
  references public.locations(id) on delete set null;
alter table public.admins add column if not exists assigned_label text;
alter table public.admins add column if not exists requested_at timestamptz default now();
alter table public.admins add column if not exists reviewed_at timestamptz;
alter table public.admins add column if not exists reviewed_by uuid;

-- 2) Funciones de rol -------------------------------------------------------
-- Solo cuenta como admin si la solicitud fue APROBADA.
create or replace function public.is_admin() returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where user_id = auth.uid() and status = 'approved'
  );
$$;

-- Super-admin: puede aprobar solicitudes y asignar centros.
create or replace function public.is_super() returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where user_id = auth.uid() and status = 'approved' and is_super = true
  );
$$;

-- 3) Politicas RLS para la tabla admins -------------------------------------
-- Un usuario puede ver su propia fila (para detectar su rol/estado).
drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins
  for select using (user_id = auth.uid());

-- Cualquier usuario autenticado puede CREAR su propia solicitud (pendiente).
-- No puede auto-asignarse super ni un estado aprobado.
drop policy if exists admins_request_insert on public.admins;
create policy admins_request_insert on public.admins
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and is_super = false
    and assigned_location_id is null
  );

-- El super-admin puede ver todas las solicitudes/administradores.
drop policy if exists admins_super_read on public.admins;
create policy admins_super_read on public.admins
  for select using (public.is_super());

-- El super-admin puede aprobar/rechazar/asignar.
drop policy if exists admins_super_update on public.admins;
create policy admins_super_update on public.admins
  for update using (public.is_super()) with check (public.is_super());

-- El super-admin puede eliminar administradores.
drop policy if exists admins_super_delete on public.admins;
create policy admins_super_delete on public.admins
  for delete using (public.is_super());

-- 4) Privilegios ------------------------------------------------------------
grant insert, update, delete on public.admins to authenticated;

-- ===========================================================================
-- 5) IMPORTANTE — Marca tu propia cuenta como SUPER-ADMIN.
--    Reemplaza el correo por el tuyo y ejecuta esta linea UNA vez.
--    (Sin esto, nadie podra aprobar nuevas solicitudes.)
-- ===========================================================================
-- update public.admins set is_super = true, status = 'approved'
--   where user_id = (select id from auth.users where email = 'TU-CORREO@ejemplo.com');
