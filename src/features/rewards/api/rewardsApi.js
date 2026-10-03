import {
  supabase,
} from "../../../services/supabase.js";


export async function getBusinessRewards(
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
    .eq(
      "business_id",
      businessId,
    )
    .order(
      "earned_at",
      {
        ascending: false,
      },
    );

  if (error) {
    console.error(
      "getBusinessRewards:",
      error,
    );

    throw new Error(
      error.message ||
        "No pudimos cargar las recompensas.",
    );
  }

  return data ?? [];
}