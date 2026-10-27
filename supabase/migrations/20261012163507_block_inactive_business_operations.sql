-- =========================================================
-- BLOQUEAR OPERACIONES DE NEGOCIOS DESACTIVADOS
-- =========================================================

-- =========================================================
-- REVIEW VISIT REQUEST
-- =========================================================

CREATE OR REPLACE FUNCTION public.review_visit_request(
  p_request_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_request public.visit_requests%rowtype;
  v_tag_code text;
  v_result jsonb;
begin
  -- 1. Debe existir un usuario autenticado
  v_user_id := auth.uid();

  if v_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'not_authenticated'
    );
  end if;

  -- 2. Solo aceptamos approve o reject
  if p_action not in ('approve', 'reject') then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid_action'
    );
  end if;

  -- 3. Bloquear la solicitud para evitar doble aprobación
  select *
  into v_request
  from public.visit_requests
  where id = p_request_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'request_not_found'
    );
  end if;

  -- 4. Solo se puede revisar una solicitud pendiente
  if v_request.status <> 'pending' then
    return jsonb_build_object(
      'ok', false,
      'reason', 'already_reviewed',
      'status', v_request.status
    );
  end if;

  -- 5. Comprobar que el usuario pertenece al negocio
  if not exists (
    select 1
    from public.business_members
    where business_id = v_request.business_id
      and user_id = v_user_id
      and role in ('owner', 'staff')
  ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'forbidden'
    );
  end if;

  -- 5.1. El negocio debe existir
  if not exists (
    select 1
    from public.businesses
    where id = v_request.business_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'business_not_found'
    );
  end if;

  -- 5.2. El negocio debe estar activo
  if not exists (
    select 1
    from public.businesses
    where id = v_request.business_id
      and active = true
  ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'business_inactive'
    );
  end if;

  -- 6. Rechazar
  if p_action = 'reject' then
    update public.visit_requests
    set
      status = 'rejected',
      reviewed_at = now(),
      reviewed_by = v_user_id
    where id = p_request_id;

    return jsonb_build_object(
      'ok', true,
      'status', 'rejected',
      'request_id', p_request_id
    );
  end if;

  -- 7. Obtener el código del tag
  select code
  into v_tag_code
  from public.tags
  where id = v_request.tag_id
    and business_id = v_request.business_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'tag_not_found'
    );
  end if;

  -- 8. Registrar realmente la visita
  v_result := public.register_visit(
    v_tag_code,
    v_request.customer_id
  );

  -- 9. Si register_visit rechazó la operación,
  -- la solicitud sigue pending.
  if coalesce((v_result->>'ok')::boolean, false) = false then
    return v_result || jsonb_build_object(
      'request_id', p_request_id,
      'request_status', 'pending'
    );
  end if;

  -- 10. La visita sí fue registrada: aprobar solicitud
  update public.visit_requests
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = v_user_id
  where id = p_request_id;

  return v_result || jsonb_build_object(
    'request_id', p_request_id,
    'request_status', 'approved'
  );
end;
$function$;


-- =========================================================
-- REDEEM REWARD
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


  -- Buscar el premio ganado
  SELECT *
  INTO v_reward
  FROM rewards
  WHERE id = p_earned_reward_id;

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


  -- Obtener información del premio seleccionado
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
