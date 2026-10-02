import { supabase } from "../../../services/supabase.js";

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
    // Información del negocio
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

    // Cantidad total de clientes
    supabase
      .from("customers")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId),

    // Cantidad total de visitas
    supabase
      .from("visits")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId),

    // Recompensas pendientes
    supabase
      .from("rewards")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId)
      .eq("status", "earned"),

    // Últimos clientes registrados
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
    console.error(
      "Errores cargando dashboard:",
      errors,
    );

    throw new Error(
      "No pudimos cargar los datos del negocio.",
    );
  }

  return {
    business: businessResult.data,

    stats: {
      customers:
        customersResult.count ?? 0,

      visits:
        visitsResult.count ?? 0,

      pendingRewards:
        rewardsResult.count ?? 0,
    },

    recentCustomers:
      recentCustomersResult.data ?? [],
  };
}