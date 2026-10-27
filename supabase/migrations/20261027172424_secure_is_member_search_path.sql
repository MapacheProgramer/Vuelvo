
-- Proteger la función utilizada por las políticas RLS
-- sin cambiar su lógica de autorización.

CREATE OR REPLACE FUNCTION public.is_member(
  p_business uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$

  SELECT EXISTS (
    SELECT 1
    FROM public.business_members
    WHERE business_id = p_business
      AND user_id = auth.uid()
  );

$function$;
