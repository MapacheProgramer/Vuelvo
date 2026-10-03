import {
  supabase,
} from "../../../services/supabase.js";

// =========================================================
// DASHBOARD GENERAL
// =========================================================

export async function getDashboardData(
  businessId,
) {
  if (!businessId) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }

  const [
    businessResult,
    customersResult,
    visitsResult,
    rewardsResult,
    recentCustomersResult,
  ] = await Promise.all([
    // -----------------------------------------------------
    // Información del negocio
    // -----------------------------------------------------

    supabase
      .from("businesses")
      .select(
        `
        id,
        name,
        slug,
        logo_url,
        brand_color,
        settings
        `,
      )
      .eq("id", businessId)
      .single(),

    // -----------------------------------------------------
    // Cantidad total de clientes
    // -----------------------------------------------------

    supabase
      .from("customers")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "business_id",
        businessId,
      ),

    // -----------------------------------------------------
    // Cantidad total de visitas
    // -----------------------------------------------------

    supabase
      .from("visits")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "business_id",
        businessId,
      ),

    // -----------------------------------------------------
    // Cantidad de recompensas pendientes
    // -----------------------------------------------------

    supabase
      .from("rewards")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "business_id",
        businessId,
      )
      .eq(
        "status",
        "earned",
      ),

    // -----------------------------------------------------
    // Últimos clientes registrados
    // -----------------------------------------------------

    supabase
      .from("customers")
      .select(
        `
        id,
        name,
        whatsapp,
        birthday,
        created_at
        `,
      )
      .eq(
        "business_id",
        businessId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
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
    console.error(
      "Errores cargando dashboard:",
      errors,
    );

    throw new Error(
      "No pudimos cargar los datos del negocio.",
    );
  }

  return {
    business:
      businessResult.data,

    stats: {
      customers:
        customersResult.count ??
        0,

      visits:
        visitsResult.count ??
        0,

      pendingRewards:
        rewardsResult.count ??
        0,
    },

    recentCustomers:
      recentCustomersResult.data ??
      [],
  };
}

// =========================================================
// RECOMPENSAS PENDIENTES
// =========================================================

export async function getPendingRewards(
  businessId,
) {
  if (!businessId) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("rewards")
    .select(
      `
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
      `,
    )
    .eq(
      "business_id",
      businessId,
    )
    .eq(
      "status",
      "earned",
    )
    .order(
      "earned_at",
      {
        ascending: false,
      },
    );

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

export async function redeemReward(
  earnedRewardId,
) {
  if (!earnedRewardId) {
    throw new Error(
      "No se encontró la recompensa.",
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    "redeem_reward",
    {
      p_earned_reward_id:
        earnedRewardId,
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
    const reason =
      data?.reason ??
      "redeem_failed";

    let message =
      "No pudimos canjear la recompensa.";

    if (
      reason ===
      "not_authenticated"
    ) {
      message =
        "Debes iniciar sesión para canjear recompensas.";
    }

    if (
      reason ===
      "not_authorized"
    ) {
      message =
        "No tienes permisos para canjear esta recompensa.";
    }

    if (
      reason ===
      "reward_not_found"
    ) {
      message =
        "La recompensa no existe.";
    }

    if (
      reason ===
      "reward_not_selected"
    ) {
      message =
        "El cliente todavía no ha seleccionado su recompensa.";
    }

    if (
      reason ===
      "already_redeemed"
    ) {
      message =
        "Esta recompensa ya fue canjeada.";
    }

    if (
      reason ===
      "catalog_reward_not_found"
    ) {
      message =
        "La recompensa seleccionada ya no existe.";
    }

    const redeemError =
      new Error(message);

    redeemError.reason =
      reason;

    redeemError.data =
      data;

    throw redeemError;
  }

  return data;
}