
-- Permitir que el administrador de Vuelvo
-- consulte los códigos QR de los negocios.
-- No modifica ni elimina códigos existentes.

CREATE POLICY tags_platform_admin_select
ON public.tags
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin()
);
