import {
  supabase,
} from "../../../services/supabase.js";


export async function getBusinessCustomers(
  businessId,
) {
  if (!businessId) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }


  const [
    customersResult,
    visitsResult,
    rewardsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select(`
        id,
        business_id,
        name,
        cedula,
        whatsapp,
        birthday,
        created_at
      `)
      .eq(
        "business_id",
        businessId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),

    supabase
      .from("visits")
      .select(`
        id,
        customer_id,
        created_at
      `)
      .eq(
        "business_id",
        businessId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),

    supabase
      .from("rewards")
      .select(`
        id,
        customer_id,
        status,
        earned_at,
        redeemed_at
      `)
      .eq(
        "business_id",
        businessId,
      )
      .order(
        "earned_at",
        {
          ascending: false,
        },
      ),
  ]);


  if (customersResult.error) {
    console.error(
      "customers:",
      customersResult.error,
    );

    throw new Error(
      customersResult.error.message ||
        "No pudimos cargar los clientes.",
    );
  }


  if (visitsResult.error) {
    console.error(
      "customer visits:",
      visitsResult.error,
    );

    throw new Error(
      visitsResult.error.message ||
        "No pudimos cargar las visitas.",
    );
  }


  if (rewardsResult.error) {
    console.error(
      "customer rewards:",
      rewardsResult.error,
    );

    throw new Error(
      rewardsResult.error.message ||
        "No pudimos cargar las recompensas.",
    );
  }


  const customers =
    customersResult.data ?? [];

  const visits =
    visitsResult.data ?? [];

  const rewards =
    rewardsResult.data ?? [];


  return customers.map(
    (customer) => {
      const customerVisits =
        visits.filter(
          (visit) =>
            visit.customer_id ===
            customer.id,
        );


      const customerRewards =
        rewards.filter(
          (reward) =>
            reward.customer_id ===
            customer.id,
        );


      const latestReward =
        customerRewards[0] ??
        null;


      const currentStamps =
        latestReward?.earned_at
          ? customerVisits.filter(
              (visit) =>
                new Date(
                  visit.created_at,
                ).getTime() >
                new Date(
                  latestReward.earned_at,
                ).getTime(),
            ).length
          : customerVisits.length;


      const pendingRewards =
        customerRewards.filter(
          (reward) =>
            reward.status ===
            "earned",
        ).length;


      return {
        ...customer,

        stats: {
          visits:
            customerVisits.length,

          currentStamps,

          rewards:
            customerRewards.length,

          pendingRewards,

          lastVisit:
            customerVisits[0]
              ?.created_at ??
            null,
        },
      };
    },
  );
}


// ===========================================================
// FICHA INDIVIDUAL
// ===========================================================

export async function getCustomerDetails(
  businessId,
  customerId,
) {
  if (
    !businessId ||
    !customerId
  ) {
    throw new Error(
      "No se pudo identificar el cliente.",
    );
  }


  const [
    customerResult,
    businessResult,
    visitsResult,
    rewardsResult,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select(`
        id,
        business_id,
        name,
        cedula,
        whatsapp,
        birthday,
        created_at
      `)
      .eq(
        "business_id",
        businessId,
      )
      .eq(
        "id",
        customerId,
      )
      .maybeSingle(),

    supabase
      .from("businesses")
      .select(`
        id,
        settings
      `)
      .eq(
        "id",
        businessId,
      )
      .single(),

    supabase
      .from("visits")
      .select(`
        id,
        customer_id,
        created_at
      `)
      .eq(
        "business_id",
        businessId,
      )
      .eq(
        "customer_id",
        customerId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      ),

    supabase
      .from("rewards")
      .select(`
        id,
        customer_id,
        reward_id,
        status,
        earned_at,
        redeemed_at,
        selected_reward:reward_catalog (
          id,
          name,
          description
        )
      `)
      .eq(
        "business_id",
        businessId,
      )
      .eq(
        "customer_id",
        customerId,
      )
      .order(
        "earned_at",
        {
          ascending: false,
        },
      ),
  ]);


  if (customerResult.error) {
    console.error(
      "customer detail:",
      customerResult.error,
    );

    throw new Error(
      customerResult.error.message ||
        "No pudimos cargar el cliente.",
    );
  }


  if (!customerResult.data) {
    throw new Error(
      "No encontramos este cliente.",
    );
  }


  if (businessResult.error) {
    console.error(
      "customer business:",
      businessResult.error,
    );

    throw new Error(
      "No pudimos cargar la configuración del negocio.",
    );
  }


  if (visitsResult.error) {
    console.error(
      "customer detail visits:",
      visitsResult.error,
    );

    throw new Error(
      visitsResult.error.message ||
        "No pudimos cargar las visitas.",
    );
  }


  if (rewardsResult.error) {
    console.error(
      "customer detail rewards:",
      rewardsResult.error,
    );

    throw new Error(
      rewardsResult.error.message ||
        "No pudimos cargar las recompensas.",
    );
  }


  const customer =
    customerResult.data;

  const visits =
    visitsResult.data ?? [];

  const rewards =
    rewardsResult.data ?? [];


  const required =
    Number(
      businessResult.data
        ?.settings
        ?.stamps_required ??
        8,
    ) || 8;


  const latestReward =
    rewards[0] ??
    null;


  const currentStamps =
    latestReward?.earned_at
      ? visits.filter(
          (visit) =>
            new Date(
              visit.created_at,
            ).getTime() >
            new Date(
              latestReward.earned_at,
            ).getTime(),
        ).length
      : visits.length;


  const safeStamps =
    Math.max(
      0,
      Math.min(
        currentStamps,
        required,
      ),
    );


  const pendingRewards =
    rewards.filter(
      (reward) =>
        reward.status ===
        "earned",
    ).length;


  const redeemedRewards =
    rewards.filter(
      (reward) =>
        reward.status ===
        "redeemed",
    ).length;


  return {
    customer,

    progress: {
      stamps:
        safeStamps,

      required,
    },

    stats: {
      visits:
        visits.length,

      rewards:
        rewards.length,

      pendingRewards,

      redeemedRewards,

      lastVisit:
        visits[0]
          ?.created_at ??
        null,
    },

    visits,

    rewards,
  };
}