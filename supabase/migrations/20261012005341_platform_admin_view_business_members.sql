-- =========================================================
-- PLATFORM ADMIN PUEDE VER MIEMBROS DE TODOS LOS NEGOCIOS
-- =========================================================

drop policy if exists
  "Platform admins can view all business members"
on public.business_members;


create policy
  "Platform admins can view all business members"
on public.business_members
for select
to authenticated
using (
  public.is_platform_admin()
);