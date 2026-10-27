
-- Recuperación segura de tarjetas de Vuelvo.
-- No modifica sellos, recompensas ni registros existentes.

CREATE TABLE public.customer_recoveries (
  token_hash text PRIMARY KEY,
  business_id uuid NOT NULL
    REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL
    REFERENCES public.customers(id) ON DELETE CASCADE,
  created_by uuid NOT NULL
    REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  CONSTRAINT customer_recovery_hash_valid
    CHECK (token_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX customer_recoveries_customer_idx
ON public.customer_recoveries(customer_id);

ALTER TABLE public.customer_recoveries
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.customer_recoveries
FROM PUBLIC, anon, authenticated;


-- Solo el propietario puede generar recuperaciones.

CREATE FUNCTION public.create_customer_recovery(
  p_business_id uuid,
  p_customer_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL
     OR public.is_owner(p_business_id)
        IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Bloquear el cliente para evitar operaciones simultáneas.
  PERFORM 1
  FROM public.customers
  WHERE id = p_customer_id
    AND business_id = p_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  -- Invalidar enlaces anteriores.
  UPDATE public.customer_recoveries
  SET revoked_at = now()
  WHERE customer_id = p_customer_id
    AND used_at IS NULL
    AND revoked_at IS NULL;

  -- Token aleatorio de 64 caracteres.
  v_token :=
    replace(gen_random_uuid()::text, '-', '') ||
    replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.customer_recoveries (
    token_hash,
    business_id,
    customer_id,
    created_by,
    expires_at
  )
  VALUES (
    encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
    p_business_id,
    p_customer_id,
    auth.uid(),
    now() + interval '15 minutes'
  );

  RETURN v_token;
END;
$$;


-- Utilizar el enlace una única vez desde el nuevo dispositivo.

CREATE FUNCTION public.use_customer_recovery(
  p_business_id uuid,
  p_token text,
  p_device_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hash text;
  v_customer_id uuid;
  v_verified_customer_id uuid;
BEGIN
  IF p_business_id IS NULL
     OR p_token IS NULL
     OR p_token !~ '^[0-9a-f]{64}$'
     OR p_device_token IS NULL
     OR p_device_token !~ '^[A-Za-z0-9_-]{8,64}$'
  THEN
    RETURN false;
  END IF;

  v_hash :=
    encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  SELECT customer_id
  INTO v_customer_id
  FROM public.customer_recoveries
  WHERE token_hash = v_hash
    AND business_id = p_business_id;

  IF v_customer_id IS NULL THEN
    RETURN false;
  END IF;

  -- Mantener el mismo orden de bloqueos
  -- que la función que genera enlaces.
  PERFORM 1
  FROM public.customers
  WHERE id = v_customer_id
    AND business_id = p_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT customer_id
  INTO v_verified_customer_id
  FROM public.customer_recoveries
  WHERE token_hash = v_hash
    AND business_id = p_business_id
    AND used_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
  FOR UPDATE;

  IF v_verified_customer_id IS NULL THEN
    RETURN false;
  END IF;

  -- No quitarle a otro cliente su dispositivo.
  IF EXISTS (
    SELECT 1
    FROM public.customers
    WHERE business_id = p_business_id
      AND device_token = p_device_token
      AND id <> v_customer_id
  ) THEN
    RETURN false;
  END IF;

  -- Conservar el mismo cliente y todo su historial.
  UPDATE public.customers
  SET device_token = p_device_token
  WHERE id = v_customer_id
    AND business_id = p_business_id;

  -- Marcar el enlace como utilizado.
  UPDATE public.customer_recoveries
  SET used_at = now()
  WHERE token_hash = v_hash;

  RETURN true;
END;
$$;


-- Permisos explícitos para las dos funciones.

REVOKE EXECUTE
ON FUNCTION public.create_customer_recovery(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.create_customer_recovery(uuid, uuid)
TO authenticated;

REVOKE EXECUTE
ON FUNCTION public.use_customer_recovery(uuid, text, text)
FROM PUBLIC, anon, authenticated;

-- El cliente todavía no tiene una sesión de usuario.
-- Solo puede recuperar con un token válido y temporal.
GRANT EXECUTE
ON FUNCTION public.use_customer_recovery(uuid, text, text)
TO anon, authenticated;
