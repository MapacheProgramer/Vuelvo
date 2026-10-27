
-- =========================================================
-- VUELVO - PROTECCION CONTRA DOBLE CANJE
-- =========================================================

CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_earned_reward_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reward rewards%rowtype;
  v_catalog reward_catalog%rowtype;
  v_user_id uuid;
BEGIN

  -- Usuario autenticado que intenta realizar el canje
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'not_authenticated'
    );
  END IF;


  -- Buscar y bloquear la recompensa
  -- Evita que dos solicitudes la canjeen simultaneamente
  SELECT *
  INTO v_reward
  FROM rewards
  WHERE id = p_earned_reward_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'reward_not_found'
    );
  END IF;


  -- Verificar que el usuario pertenece al negocio
  -- y que es owner o staff
  IF NOT EXISTS (
    SELECT 1
    FROM business_members
    WHERE business_id = v_reward.business_id
      AND user_id = v_user_id
      AND role IN ('owner', 'staff')
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'not_authorized'
    );
  END IF;


  -- El negocio debe estar activo
  IF NOT EXISTS (
    SELECT 1
    FROM businesses
    WHERE id = v_reward.business_id
      AND active = true
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'business_inactive'
    );
  END IF;


  -- Debe haber una recompensa seleccionada
  IF v_reward.reward_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'reward_not_selected'
    );
  END IF;


  -- Evitar doble canje
  IF v_reward.status = 'redeemed' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'already_redeemed',
      'redeemed_at', v_reward.redeemed_at
    );
  END IF;


  -- Obtener informacion del premio seleccionado
  SELECT *
  INTO v_catalog
  FROM reward_catalog
  WHERE id = v_reward.reward_id
    AND business_id = v_reward.business_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'catalog_reward_not_found'
    );
  END IF;


  -- Canjear
  UPDATE rewards
  SET
    status = 'redeemed',
    redeemed_at = now()
  WHERE id = v_reward.id;


  RETURN jsonb_build_object(
    'ok', true,
    'reward_id', v_reward.id,
    'selected_reward_id', v_catalog.id,
    'reward_name', v_catalog.name,
    'reward_description', v_catalog.description,
    'status', 'redeemed',
    'redeemed_at', now()
  );

END;
$function$;
