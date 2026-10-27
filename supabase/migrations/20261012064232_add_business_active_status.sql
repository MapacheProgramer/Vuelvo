-- =========================================================
-- ESTADO ACTIVO DE LOS NEGOCIOS
-- =========================================================

alter table public.businesses
add column if not exists active boolean not null default true;

-- Garantizar que los negocios actuales permanezcan activos.
update public.businesses
set active = true
where active is null;