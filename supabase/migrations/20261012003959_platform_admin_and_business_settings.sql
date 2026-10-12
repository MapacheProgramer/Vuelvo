-- =========================================================
-- PLATFORM ADMINS
-- =========================================================

create table if not exists public.platform_admins (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  created_at timestamptz
    not null
    default now()
);


alter table public.platform_admins
enable row level security;


-- =========================================================
-- VERIFICAR PLATFORM ADMIN
-- =========================================================

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
  );
$$;


revoke all
on function public.is_platform_admin()
from public;


grant execute
on function public.is_platform_admin()
to authenticated;


-- =========================================================
-- PLATFORM ADMIN PUEDE VER TODOS LOS NEGOCIOS
-- =========================================================

drop policy if exists
  "Platform admins can view all businesses"
on public.businesses;


create policy
  "Platform admins can view all businesses"
on public.businesses
for select
to authenticated
using (
  public.is_platform_admin()
);


-- =========================================================
-- ELIMINAR reward_name LEGACY
-- =========================================================

update public.businesses
set settings =
  settings - 'reward_name'
where settings ? 'reward_name';


-- =========================================================
-- SETTINGS POR DEFECTO PARA NEGOCIOS NUEVOS
-- =========================================================

alter table public.businesses
alter column settings
set default '{
  "stamps_required": 8,
  "reactivation_days": 30,
  "birthday_days_before": 7,
  "review_delay_minutes": 60,
  "min_hours_between_visits": 12
}'::jsonb;