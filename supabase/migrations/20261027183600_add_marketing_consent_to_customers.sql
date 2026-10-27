
-- VUELVO: Consentimiento comercial opcional.
-- No altera clientes, sellos ni recompensas existentes.

ALTER TABLE public.customers
  ADD COLUMN marketing_consent boolean
    NOT NULL DEFAULT false,

  ADD COLUMN marketing_consent_at timestamptz,

  ADD COLUMN marketing_consent_text text;


-- Si el cliente acepta publicidad,
-- debemos conservar la fecha y el texto autorizado.

ALTER TABLE public.customers
ADD CONSTRAINT customers_marketing_consent_evidence_check
CHECK (
  marketing_consent = false
  OR (
    marketing_consent_at IS NOT NULL
    AND NULLIF(
      BTRIM(marketing_consent_text),
      ''
    ) IS NOT NULL
  )
);
