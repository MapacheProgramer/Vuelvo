-- =========================================================
-- PLATFORM ADMIN PUEDE ACTUALIZAR CUALQUIER NEGOCIO
-- =========================================================

drop policy if exists
  "Platform admins can update all businesses"
on public.businesses;


create policy
  "Platform admins can update all businesses"
on public.businesses
for update
to authenticated
using (
  public.is_platform_admin()
)
with check (
  public.is_platform_admin()
);


-- =========================================================
-- PLATFORM ADMIN PUEDE GESTIONAR BUSINESS-ASSETS
-- =========================================================

drop policy if exists
  "Platform admins can read business assets"
on storage.objects;

create policy
  "Platform admins can read business assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'business-assets'
  and public.is_platform_admin()
);


drop policy if exists
  "Platform admins can insert business assets"
on storage.objects;

create policy
  "Platform admins can insert business assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'business-assets'
  and public.is_platform_admin()
);


drop policy if exists
  "Platform admins can update business assets"
on storage.objects;

create policy
  "Platform admins can update business assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'business-assets'
  and public.is_platform_admin()
)
with check (
  bucket_id = 'business-assets'
  and public.is_platform_admin()
);


drop policy if exists
  "Platform admins can delete business assets"
on storage.objects;

create policy
  "Platform admins can delete business assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'business-assets'
  and public.is_platform_admin()
);