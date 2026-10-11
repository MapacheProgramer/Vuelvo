import { supabase } from "../../../services/supabase.js";

// =========================================================
// DASHBOARD GENERAL
// =========================================================
export async function getDashboardData(businessId) {
  if (!businessId) {
    throw new Error("No se encontró el negocio.");
  }

  const [
    businessResult,
    customersResult,
    visitsResult,
    rewardsResult,
    recentCustomersResult,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select(`
        id,
        name,
        slug,
        logo_url,
        brand_color,
        settings
      `)
      .eq("id", businessId)
      .single(),

    supabase
      .from("customers")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId),

    supabase
      .from("visits")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId),

    supabase
      .from("rewards")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId)
      .eq("status", "earned"),

    supabase
      .from("customers")
      .select(`
        id,
        name,
        whatsapp,
        birthday,
        created_at
      `)
      .eq("business_id", businessId)
      .order("created_at", {
        ascending: false,
      })
      .limit(5),
  ]);

  const errors = [
    businessResult.error,
    customersResult.error,
    visitsResult.error,
    rewardsResult.error,
    recentCustomersResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error("Errores cargando dashboard:", errors);
    throw new Error("No pudimos cargar los datos del negocio.");
  }

  return {
    business: businessResult.data,
    stats: {
      customers: customersResult.count ?? 0,
      visits: visitsResult.count ?? 0,
      pendingRewards: rewardsResult.count ?? 0,
    },
    recentCustomers: recentCustomersResult.data ?? [],
  };
}

// =========================================================
// SOLICITUDES DE SELLO PENDIENTES
// =========================================================
export async function getPendingVisitRequests(businessId) {
  if (!businessId) {
    throw new Error("No se encontró el negocio.");
  }

  const { data, error } = await supabase.rpc(
    "get_pending_visit_requests",
    {
      p_business_id: businessId,
    },
  );

  if (error) {
    console.error(
      "Error cargando solicitudes de sello:",
      error,
    );
    throw new Error(
      "No pudimos cargar las solicitudes de sello.",
    );
  }

  return data ?? [];
}

// =========================================================
// APROBAR O RECHAZAR SOLICITUD DE SELLO
// =========================================================
export async function reviewVisitRequest(
  requestId,
  action,
) {
  if (!requestId) {
    throw new Error("No se encontró la solicitud.");
  }

  if (!["approve", "reject"].includes(action)) {
    throw new Error("La acción solicitada no es válida.");
  }

  const { data, error } = await supabase.rpc(
    "review_visit_request",
    {
      p_request_id: requestId,
      p_action: action,
    },
  );

  if (error) {
    console.error(
      "Error ejecutando review_visit_request:",
      error,
    );
    throw new Error(
      "No pudimos revisar la solicitud de sello.",
    );
  }

  if (!data?.ok) {
    const reason = data?.reason ?? "review_failed";

    const messages = {
      not_authenticated:
        "Debes iniciar sesión para revisar solicitudes.",
      invalid_action:
        "La acción solicitada no es válida.",
      request_not_found:
        "La solicitud ya no existe.",
      already_reviewed:
        "Esta solicitud ya fue revisada.",
      forbidden:
        "No tienes permisos para revisar esta solicitud.",
      tag_not_found:
        "El código asociado a la solicitud ya no está disponible.",
      customer_not_found:
        "El cliente asociado a la solicitud ya no está disponible.",
      business_not_found:
        "El negocio asociado a la solicitud ya no está disponible.",
      too_soon:
        "El cliente todavía está dentro del tiempo mínimo entre visitas.",
    };

    const reviewError = new Error(
      messages[reason] ||
        "No pudimos revisar la solicitud de sello.",
    );

    reviewError.reason = reason;
    reviewError.data = data;
    throw reviewError;
  }

  return data;
}

// =========================================================
// RECOMPENSAS PENDIENTES
// =========================================================
export async function getPendingRewards(businessId) {
  if (!businessId) {
    throw new Error("No se encontró el negocio.");
  }

  const { data, error } = await supabase
    .from("rewards")
    .select(`
      id,
      business_id,
      customer_id,
      reward_id,
      status,
      earned_at,
      redeemed_at,
      customer:customers (
        id,
        name,
        whatsapp
      ),
      selected_reward:reward_catalog (
        id,
        name,
        description
      )
    `)
    .eq("business_id", businessId)
    .eq("status", "earned")
    .order("earned_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Error cargando recompensas pendientes:",
      error,
    );
    throw new Error(
      "No pudimos cargar las recompensas pendientes.",
    );
  }

  return data ?? [];
}

// =========================================================
// CANJEAR RECOMPENSA
// =========================================================
export async function redeemReward(earnedRewardId) {
  if (!earnedRewardId) {
    throw new Error("No se encontró la recompensa.");
  }

  const { data, error } = await supabase.rpc(
    "redeem_reward",
    {
      p_earned_reward_id: earnedRewardId,
    },
  );

  if (error) {
    console.error(
      "Error ejecutando redeem_reward:",
      error,
    );
    throw new Error(
      "No pudimos canjear la recompensa.",
    );
  }

  if (!data?.ok) {
    const reason = data?.reason ?? "redeem_failed";
    let message = "No pudimos canjear la recompensa.";

    if (reason === "not_authenticated") {
      message =
        "Debes iniciar sesión para canjear recompensas.";
    }

    if (reason === "not_authorized") {
      message =
        "No tienes permisos para canjear esta recompensa.";
    }

    if (reason === "reward_not_found") {
      message = "La recompensa no existe.";
    }

    if (reason === "reward_not_selected") {
      message =
        "El cliente todavía no ha seleccionado su recompensa.";
    }

    if (reason === "already_redeemed") {
      message = "Esta recompensa ya fue canjeada.";
    }

    if (reason === "catalog_reward_not_found") {
      message =
        "La recompensa seleccionada ya no existe.";
    }

    const redeemError = new Error(message);
    redeemError.reason = reason;
    redeemError.data = data;
    throw redeemError;
  }

  return data;
}