import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEV_ORIGIN =
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{2,5}$/;

const ALLOW_DEV =
  Deno.env.get("ALLOW_DEV_ORIGINS") === "true";

const PROD_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ?? ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function isAllowedOrigin(
  origin: string | null,
): boolean {
  if (!origin) {
    return true;
  }

  return (
    PROD_ORIGINS.includes(origin) ||
    (ALLOW_DEV && DEV_ORIGIN.test(origin))
  );
}

function corsHeaders(
  origin: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    Vary: "Origin",
  };

  if (
    origin &&
    isAllowedOrigin(origin)
  ) {
    headers["Access-Control-Allow-Origin"] =
      origin;
  }

  return headers;
}

const CODE_RE =
  /^[A-Za-z0-9_-]{3,32}$/;

const TOKEN_RE =
  /^[A-Za-z0-9_-]{8,64}$/;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const origin =
    req.headers.get("origin");

  const cors =
    corsHeaders(origin);

  const json = (
    body: unknown,
    status = 200,
  ) =>
    new Response(
      JSON.stringify(body),
      {
        status,

        headers: {
          ...cors,
          "Content-Type":
            "application/json",
        },
      },
    );

  // ---------------------------------------------------------
  // 1. Validar origen
  // ---------------------------------------------------------

  if (!isAllowedOrigin(origin)) {
    return json(
      {
        status: "error",
        message: "Origen no permitido",
      },
      403,
    );
  }

  // ---------------------------------------------------------
  // 2. Preflight CORS
  // ---------------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: cors,
    });
  }

  // ---------------------------------------------------------
  // 3. Solo POST
  // ---------------------------------------------------------

  if (req.method !== "POST") {
    return json(
      {
        status: "error",
        message: "Método no permitido",
      },
      405,
    );
  }

  // ---------------------------------------------------------
  // 4. Leer JSON
  // ---------------------------------------------------------

  let payload;

  try {
    payload = await req.json();
  } catch {
    return json(
      {
        status: "error",
        message: "JSON inválido",
      },
      400,
    );
  }

  const {
    code,
    device_token,
    earned_reward_id,
    catalog_reward_id,
  } = payload ?? {};

  // ---------------------------------------------------------
  // 5. Validar código
  // ---------------------------------------------------------

  if (
    typeof code !== "string" ||
    !CODE_RE.test(code)
  ) {
    return json(
      {
        status: "error",
        message: "Código inválido",
      },
      400,
    );
  }

  // ---------------------------------------------------------
  // 6. Validar device_token
  // ---------------------------------------------------------

  if (
    typeof device_token !== "string" ||
    !TOKEN_RE.test(device_token)
  ) {
    return json(
      {
        status: "error",
        message: "Dispositivo inválido",
      },
      400,
    );
  }

  // ---------------------------------------------------------
  // 7. Validar reward ganado
  // ---------------------------------------------------------

  if (
    typeof earned_reward_id !== "string" ||
    !UUID_RE.test(earned_reward_id)
  ) {
    return json(
      {
        status: "error",
        message:
          "Recompensa ganada inválida",
      },
      400,
    );
  }

  // ---------------------------------------------------------
  // 8. Validar reward del catálogo
  // ---------------------------------------------------------

  if (
    typeof catalog_reward_id !== "string" ||
    !UUID_RE.test(catalog_reward_id)
  ) {
    return json(
      {
        status: "error",
        message:
          "Recompensa seleccionada inválida",
      },
      400,
    );
  }

  // ---------------------------------------------------------
  // 9. Cliente Supabase interno
  // ---------------------------------------------------------

  const supabase =
    createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      )!,
    );

  // ---------------------------------------------------------
  // 10. Buscar tag
  // ---------------------------------------------------------

  const {
    data: tag,
    error: tagError,
  } = await supabase
    .from("tags")
    .select(
      `
      id,
      business_id,
      active
      `,
    )
    .eq("code", code)
    .maybeSingle();

  if (tagError) {
    console.error(
      "tag lookup error:",
      tagError.message,
    );

    return json(
      {
        status: "error",
        message:
          "No pudimos consultar el negocio",
      },
      500,
    );
  }

  if (!tag || !tag.active) {
    return json(
      {
        status: "not_found",
        message:
          "No encontramos este negocio",
      },
      404,
    );
  }

  // ---------------------------------------------------------
  // 11. Buscar cliente por negocio + dispositivo
  // ---------------------------------------------------------

  const {
    data: customer,
    error: customerError,
  } = await supabase
    .from("customers")
    .select(
      `
      id,
      business_id
      `,
    )
    .eq(
      "business_id",
      tag.business_id,
    )
    .eq(
      "device_token",
      device_token,
    )
    .maybeSingle();

  if (customerError) {
    console.error(
      "customer lookup error:",
      customerError.message,
    );

    return json(
      {
        status: "error",
        message:
          "No pudimos consultar tu cuenta",
      },
      500,
    );
  }

  if (!customer) {
    return json(
      {
        status: "not_registered",
        message:
          "Este dispositivo no tiene una tarjeta registrada",
      },
      404,
    );
  }

  // ---------------------------------------------------------
  // 12. Buscar premio ganado
  //
  // Debe pertenecer:
  // - al negocio
  // - al cliente identificado por device_token
  // ---------------------------------------------------------

  const {
    data: earnedReward,
    error: earnedRewardError,
  } = await supabase
    .from("rewards")
    .select(
      `
      id,
      business_id,
      customer_id,
      status,
      reward_id,
      earned_at,
      redeemed_at
      `,
    )
    .eq(
      "id",
      earned_reward_id,
    )
    .eq(
      "business_id",
      tag.business_id,
    )
    .eq(
      "customer_id",
      customer.id,
    )
    .maybeSingle();

  if (earnedRewardError) {
    console.error(
      "earned reward lookup error:",
      earnedRewardError.message,
    );

    return json(
      {
        status: "error",
        message:
          "No pudimos consultar tu recompensa",
      },
      500,
    );
  }

  if (!earnedReward) {
    return json(
      {
        status: "error",
        reason:
          "earned_reward_not_found",
        message:
          "La recompensa ganada no existe",
      },
      404,
    );
  }

  // ---------------------------------------------------------
  // 13. Verificar que no haya sido canjeada
  // ---------------------------------------------------------

  if (
    earnedReward.status ===
      "redeemed" ||
    earnedReward.redeemed_at
  ) {
    return json(
      {
        status: "error",
        reason:
          "reward_already_redeemed",
        message:
          "Esta recompensa ya fue canjeada",
      },
      409,
    );
  }

  if (
    earnedReward.status !==
    "earned"
  ) {
    return json(
      {
        status: "error",
        reason:
          "reward_not_available",
        message:
          "Esta recompensa ya no está disponible",
      },
      409,
    );
  }

  // ---------------------------------------------------------
  // 14. Buscar premio del catálogo
  //
  // Debe pertenecer al mismo negocio y estar activo.
  // ---------------------------------------------------------

  const {
    data: catalogReward,
    error: catalogError,
  } = await supabase
    .from("reward_catalog")
    .select(
      `
      id,
      business_id,
      name,
      description,
      active
      `,
    )
    .eq(
      "id",
      catalog_reward_id,
    )
    .eq(
      "business_id",
      tag.business_id,
    )
    .eq(
      "active",
      true,
    )
    .maybeSingle();

  if (catalogError) {
    console.error(
      "catalog lookup error:",
      catalogError.message,
    );

    return json(
      {
        status: "error",
        message:
          "No pudimos consultar la recompensa seleccionada",
      },
      500,
    );
  }

  if (!catalogReward) {
    return json(
      {
        status: "error",
        reason:
          "catalog_reward_not_found",
        message:
          "La recompensa seleccionada no está disponible",
      },
      404,
    );
  }

  // ---------------------------------------------------------
  // 15. Si ya eligió este mismo premio
  //
  // Lo tratamos como éxito para soportar doble clic o
  // reintentos de conexión.
  // ---------------------------------------------------------

  if (earnedReward.reward_id) {
    if (
      earnedReward.reward_id ===
      catalogReward.id
    ) {
      return json({
        status: "ok",

        already_selected:
          true,

        reward: {
          id:
            catalogReward.id,

          name:
            catalogReward.name,

          description:
            catalogReward.description,
        },
      });
    }

    // -------------------------------------------------------
    // Ya eligió una recompensa diferente
    // -------------------------------------------------------

    return json(
      {
        status: "error",
        reason:
          "reward_already_selected",
        message:
          "Ya seleccionaste una recompensa para este premio",
      },
      409,
    );
  }

  // ---------------------------------------------------------
  // 16. Ejecutar RPC select_reward()
  // ---------------------------------------------------------

  const {
    data: selectionResult,
    error: selectionError,
  } = await supabase.rpc(
    "select_reward",
    {
      p_earned_reward_id:
        earnedReward.id,

      p_customer_id:
        customer.id,

      p_catalog_reward_id:
        catalogReward.id,
    },
  );

  if (selectionError) {
    console.error(
      "select_reward rpc error:",
      selectionError.message,
    );

    return json(
      {
        status: "error",
        message:
          "No pudimos seleccionar la recompensa",
      },
      500,
    );
  }

  // ---------------------------------------------------------
  // 17. Revisar respuesta del RPC
  // ---------------------------------------------------------

  if (!selectionResult?.ok) {
    const reason =
      selectionResult?.reason ??
      "selection_failed";

    let message =
      "No pudimos seleccionar la recompensa";

    let httpStatus = 409;

    if (
      reason ===
      "earned_reward_not_found"
    ) {
      message =
        "La recompensa ganada no existe";

      httpStatus = 404;
    }

    if (
      reason ===
      "reward_already_redeemed"
    ) {
      message =
        "Esta recompensa ya fue canjeada";
    }

    if (
      reason ===
      "reward_already_selected"
    ) {
      message =
        "Ya seleccionaste una recompensa";
    }

    if (
      reason ===
      "catalog_reward_not_found"
    ) {
      message =
        "La recompensa seleccionada no está disponible";

      httpStatus = 404;
    }

    return json(
      {
        status: "error",
        reason,
        message,
      },
      httpStatus,
    );
  }

  // ---------------------------------------------------------
  // 18. Éxito
  // ---------------------------------------------------------

  return json({
    status: "ok",

    already_selected:
      false,

    reward: {
      id:
        selectionResult.reward_id,

      name:
        selectionResult.reward_name,

      description:
        selectionResult.reward_description,
    },
  });
});