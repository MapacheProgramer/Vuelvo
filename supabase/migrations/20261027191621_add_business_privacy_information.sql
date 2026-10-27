
-- VUELVO: Información de privacidad por negocio.
-- No modifica configuraciones ni clientes existentes.

ALTER TABLE public.businesses
  ADD COLUMN privacy_legal_name text,
  ADD COLUMN privacy_contact_email text,
  ADD COLUMN privacy_contact_phone text,
  ADD COLUMN privacy_contact_address text,
  ADD COLUMN privacy_policy_url text;
