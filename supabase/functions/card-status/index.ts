import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEV_ORIGIN =
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{2,5}$/;

const ALLOW_DEV = Deno.env.get("ALLOW_DEV_ORIGINS") === "true";

const PROD_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;

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
    "Vary": "Origin",
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

  if (!isAllowedOrigin(origin)) {
    return json(
      {
        status: "error",
        message: "Origen no permitido",
      },
      403,
    );
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: cors,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        status: "error",
        message: "Método no permitido",
      },
      405,
    );
  }

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ---------------------------------------------------------
  // 1. Buscar tag y negocio
  // ---------------------------------------------------------

  const { data: tag, error: tagError } = await supabase
    .from("tags")
    .select("id, business_id, active")
    .eq("code", code)
    .maybeSingle();

  if (tagError) {
    console.error("tag lookup error:", tagError.message);

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

  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select(
        "id, name, logo_url, brand_color, settings",
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

  const required =
    Number(
      business.settings?.stamps_required ?? 8,
    ) || 8;

  const brand = {
    name: business.name,
    logo_url: business.logo_url,
    brand_color: business.brand_color,
    reward_name:
      business.settings?.reward_name ??
      "Recompensa",
    stamps_required: required,
  };

  // ---------------------------------------------------------
  // 2. Buscar cliente usando business + device_token
  // ---------------------------------------------------------

  const { data: customer, error: customerError } =
    await supabase
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
  // 3. Buscar último premio ganado
  // ---------------------------------------------------------

  const { data: lastReward, error: rewardError } =
    await supabase
      .from("rewards")
      .select("id, status, earned_at, redeemed_at")
      .eq("business_id", business.id)
      .eq("customer_id", customer.id)
      .order("earned_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (rewardError) {
    console.error(
      "reward lookup error:",
      rewardError.message,
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
  // 4. Contar visitas desde el último premio
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

  const stamps = count ?? 0;

  // ---------------------------------------------------------
  // 5. Buscar última visita
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
  // 6. Determinar si hay recompensa pendiente
  // ---------------------------------------------------------

  const rewardAvailable =
    Boolean(lastReward) &&
    lastReward.status !== "redeemed" &&
    !lastReward.redeemed_at;

  return json({
    status: "ok",

    customer: {
      name: customer.name,
    },

    stamps,
    required,

    reward_available: rewardAvailable,

    reward: lastReward
      ? {
          id: lastReward.id,
          status: lastReward.status,
          earned_at: lastReward.earned_at,
          redeemed_at:
            lastReward.redeemed_at,
        }
      : null,

    last_visit:
      lastVisit?.created_at ?? null,

    business: brand,
  });
});