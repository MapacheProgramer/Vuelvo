import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEV_ORIGIN =
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{2,5}$/;

const ALLOW_DEV =
  Deno.env.get("ALLOW_DEV_ORIGINS") === "true";

const PROD_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) {
    return true;
  }

  return (
    PROD_ORIGINS.includes(origin) ||
    (ALLOW_DEV && DEV_ORIGIN.test(origin))
  );
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };

  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

const CODE_RE = /^[A-Za-z0-9_-]{3,32}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        ...cors,
        "Content-Type": "application/json",
      },
    });

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

  const { code, device_token } = payload ?? {};

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
  // 6. Validar dispositivo
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
  // 7. Cliente Supabase interno
  // ---------------------------------------------------------

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ---------------------------------------------------------
  // 8. Buscar tag
  // ---------------------------------------------------------

  const {
    data: tag,
    error: tagError,
  } = await supabase
    .from("tags")
    .select("id, business_id, active")
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
        message: "No pudimos consultar la tarjeta",
      },
      500,
    );
  }

  if (!tag || !tag.active) {
    return json(
      {
        status: "not_found",
      },
      404,
    );
  }

  // ---------------------------------------------------------
  // 9. Buscar negocio
  // ---------------------------------------------------------

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(
      `
      id,
      name,
      logo_url,
      brand_color,
      settings
      `,
    )
    .eq("id", tag.business_id)
    .single();

  if (businessError || !business) {
    console.error(
      "business lookup error:",
      businessError?.message,
    );

    return json(
      {
        status: "error",
        message: "No pudimos consultar el negocio",
      },
      500,
    );
  }

  // ---------------------------------------------------------
  // 10. Configuración del negocio
  // ---------------------------------------------------------

  const required =
    Number(
      business.settings?.stamps_required ?? 8,
    ) || 8;

  const configuredMinHours =
    Number(
      business.settings?.min_hours_between_visits ?? 12,
    );

  const minHoursBetweenVisits =
    Number.isFinite(configuredMinHours) &&
    configuredMinHours >= 0
      ? configuredMinHours
      : 12;

  const brand = {
    name: business.name,
    logo_url: business.logo_url,
    brand_color: business.brand_color,
    stamps_required: required,
  };

  // ---------------------------------------------------------
  // 11. Buscar cliente por negocio + dispositivo
  // ---------------------------------------------------------

  const {
    data: customer,
    error: customerError,
  } = await supabase
    .from("customers")
    .select("id, name")
    .eq("business_id", business.id)
    .eq("device_token", device_token)
    .maybeSingle();

  if (customerError) {
    console.error(
      "customer lookup error:",
      customerError.message,
    );

    return json(
      {
        status: "error",
        message: "No pudimos consultar tu cuenta",
      },
      500,
    );
  }

  if (!customer) {
    return json({
      status: "not_registered",
      business: brand,
    });
  }

  // ---------------------------------------------------------
  // 12. Buscar último premio ganado
  //
  // Se usa para saber desde qué momento contar los sellos
  // correspondientes a la tarjeta actual.
  // ---------------------------------------------------------

  const {
    data: lastReward,
    error: lastRewardError,
  } = await supabase
    .from("rewards")
    .select(
      `
      id,
      status,
      earned_at,
      redeemed_at,
      reward_id
      `,
    )
    .eq("business_id", business.id)
    .eq("customer_id", customer.id)
    .order("earned_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (lastRewardError) {
    console.error(
      "last reward lookup error:",
      lastRewardError.message,
    );

    return json(
      {
        status: "error",
        message: "No pudimos consultar tus recompensas",
      },
      500,
    );
  }

  // ---------------------------------------------------------
  // 13. Buscar TODAS las recompensas pendientes
  // ---------------------------------------------------------

  const {
    data: pendingRewardsRaw,
    error: pendingRewardsError,
  } = await supabase
    .from("rewards")
    .select(
      `
      id,
      status,
      earned_at,
      redeemed_at,
      reward_id
      `,
    )
    .eq("business_id", business.id)
    .eq("customer_id", customer.id)
    .eq("status", "earned")
    .order("earned_at", {
      ascending: false,
    });

  if (pendingRewardsError) {
    console.error(
      "pending rewards lookup error:",
      pendingRewardsError.message,
    );

    return json(
      {
        status: "error",
        message: "No pudimos consultar tus recompensas",
      },
      500,
    );
  }

  const rawPendingRewards =
    pendingRewardsRaw ?? [];

  // ---------------------------------------------------------
  // 14. IDs de premios ya seleccionados
  // ---------------------------------------------------------

  const selectedRewardIds = [
    ...new Set(
      rawPendingRewards
        .map((reward) => reward.reward_id)
        .filter(
          (rewardId): rewardId is string =>
            typeof rewardId === "string",
        ),
    ),
  ];

  // ---------------------------------------------------------
  // 15. Mapa con datos del catálogo ya seleccionado
  // ---------------------------------------------------------

  const selectedRewardMap = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      active: boolean;
    }
  >();

  if (selectedRewardIds.length > 0) {
    const {
      data: selectedCatalog,
      error: selectedCatalogError,
    } = await supabase
      .from("reward_catalog")
      .select(
        `
        id,
        name,
        description,
        active
        `,
      )
      .eq("business_id", business.id)
      .in("id", selectedRewardIds);

    if (selectedCatalogError) {
      console.error(
        "selected catalog lookup error:",
        selectedCatalogError.message,
      );

      return json(
        {
          status: "error",
          message: "No pudimos consultar tus recompensas",
        },
        500,
      );
    }

    for (const reward of selectedCatalog ?? []) {
      selectedRewardMap.set(
        reward.id,
        reward,
      );
    }
  }

  // ---------------------------------------------------------
  // 16. Obtener catálogo activo
  //
  // Se consulta siempre para que el cliente pueda ver
  // de antemano qué recompensas podrá desbloquear.
  // ---------------------------------------------------------

  const {
    data: catalog,
    error: catalogError,
  } = await supabase
    .from("reward_catalog")
    .select(
      `
      id,
      name,
      description
      `,
    )
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", {
      ascending: true,
    });

  if (catalogError) {
    console.error(
      "catalog lookup error:",
      catalogError.message,
    );

    return json(
      {
        status: "error",
        message:
          "No pudimos consultar el catálogo de recompensas",
      },
      500,
    );
  }

  const rewardCatalog =
    catalog ?? [];

  // ---------------------------------------------------------
  // 18. Formatear premios pendientes
  // ---------------------------------------------------------

  const pendingRewards =
    rawPendingRewards.map(
      (reward) => {
        const selectedReward =
          reward.reward_id
            ? selectedRewardMap.get(
                reward.reward_id,
              ) ?? null
            : null;

        return {
          id: reward.id,
          status: reward.status,
          earned_at: reward.earned_at,
          redeemed_at: reward.redeemed_at,
          reward_id: reward.reward_id,
          selected_reward:
            selectedReward
              ? {
                  id: selectedReward.id,
                  name: selectedReward.name,
                  description:
                    selectedReward.description,
                  active:
                    selectedReward.active,
                }
              : null,
        };
      },
    );

  // ---------------------------------------------------------
  // 19. Contar sellos desde el último premio
  // ---------------------------------------------------------

  let visitQuery = supabase
    .from("visits")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("business_id", business.id)
    .eq("customer_id", customer.id);

  if (lastReward?.earned_at) {
    visitQuery = visitQuery.gt(
      "created_at",
      lastReward.earned_at,
    );
  }

  const {
    count,
    error: visitError,
  } = await visitQuery;

  if (visitError) {
    console.error(
      "visit count error:",
      visitError.message,
    );

    return json(
      {
        status: "error",
        message: "No pudimos consultar tus sellos",
      },
      500,
    );
  }

  const stamps =
    count ?? 0;

  // ---------------------------------------------------------
  // 20. Buscar última visita
  // ---------------------------------------------------------

  const {
    data: lastVisit,
    error: lastVisitError,
  } = await supabase
    .from("visits")
    .select("created_at")
    .eq("business_id", business.id)
    .eq("customer_id", customer.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (lastVisitError) {
    console.error(
      "last visit error:",
      lastVisitError.message,
    );
  }

  // ---------------------------------------------------------
  // 21. Calcular cuándo puede sumar el siguiente sello
  // ---------------------------------------------------------

  const serverNowMs = Date.now();

  let nextVisitAt: string | null = null;
  let secondsUntilNextVisit = 0;
  let canRegisterVisit = true;

  if (
    lastVisit?.created_at &&
    minHoursBetweenVisits > 0
  ) {
    const lastVisitMs =
      new Date(
        lastVisit.created_at,
      ).getTime();

    if (Number.isFinite(lastVisitMs)) {
      const nextVisitMs =
        lastVisitMs +
        minHoursBetweenVisits *
          60 *
          60 *
          1000;

      const remainingMs =
        Math.max(
          0,
          nextVisitMs - serverNowMs,
        );

      nextVisitAt =
        new Date(
          nextVisitMs,
        ).toISOString();

      secondsUntilNextVisit =
        Math.ceil(
          remainingMs / 1000,
        );

      canRegisterVisit =
        secondsUntilNextVisit <= 0;
    }
  }

  // ---------------------------------------------------------
  // 22. Respuesta final
  // ---------------------------------------------------------

  return json({
    status: "ok",

    customer: {
      name: customer.name,
    },

    stamps,

    required,

    reward_available:
      pendingRewards.length > 0,

    // Compatibilidad temporal con CardPage actual.
    reward:
      pendingRewards[0] ?? null,

    // Nueva información para el sistema de recompensas.
    pending_rewards:
      pendingRewards,

    reward_catalog:
      rewardCatalog,

    last_visit:
      lastVisit?.created_at ?? null,

    min_hours_between_visits:
      minHoursBetweenVisits,

    can_register_visit:
      canRegisterVisit,

    next_visit_at:
      nextVisitAt,

    seconds_until_next_visit:
      secondsUntilNextVisit,

    server_time:
      new Date(
        serverNowMs,
      ).toISOString(),

    business: brand,
  });
});