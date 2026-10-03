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
        whatsapp,
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