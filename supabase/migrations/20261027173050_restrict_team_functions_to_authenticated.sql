
-- VUELVO: restringir funciones de empleados
-- No cambia la lógica ni los datos existentes.

REVOKE EXECUTE
ON FUNCTION public.complete_member_onboarding()
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.complete_member_onboarding()
TO authenticated;


REVOKE EXECUTE
ON FUNCTION public.get_business_team(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.get_business_team(uuid)
TO authenticated;
