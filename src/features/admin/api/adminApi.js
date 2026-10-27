import {
  supabase,
} from "../../../services/supabase.js";


export async function getAdminBusinesses() {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "businesses",
      )
      .select(
        `
        id,
        name,
        slug,
        active,
        type,
        logo_url,
        brand_color,
        created_at
        `,
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        },
      );


  if (error) {
    throw error;
  }


  return data ?? [];
}


export async function createAdminBusiness({
  name,
  slug,
  type,
  ownerDisplayName,
  ownerEmail,
}) {
  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        "create-business",
        {
          body: {
            name,
            slug,
            type,

            owner_display_name:
              ownerDisplayName,

            owner_email:
              ownerEmail,
          },
        },
      );


  if (error) {
    let message =
      "No pudimos crear el negocio.";


    try {
      const payload =
        await error.context
          ?.json();


      if (
        payload?.message
      ) {
        message =
          payload.message;
      }
    } catch {
      // Mantener mensaje genérico.
    }


    throw new Error(
      message,
    );
  }


  if (
    data?.status !==
    "ok"
  ) {
    throw new Error(
      data?.message ||
      "No pudimos crear el negocio.",
    );
  }


  return data;
}
export async function getAdminBusinessDetail(
  businessId,
) {
  const {
    data:
      business,

    error:
      businessError,
  } =
    await supabase
      .from(
        "businesses",
      )
      .select(
        `
        id,
        name,
        slug,
        type,
        active,
        logo_url,
        brand_color,
        google_review_url,
        settings,
        created_at
        `,
      )
      .eq(
        "id",
        businessId,
      )
      .single();


  if (
    businessError
  ) {
    throw businessError;
  }


  const {
    data:
      members,

    error:
      membersError,
  } =
    await supabase
      .from(
        "business_members",
      )
      .select(
        `
        user_id,
        role,
        display_name,
        onboarding_completed,
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
          ascending:
            true,
        },
      );


  if (
    membersError
  ) {
    throw membersError;
  }


  return {
    business,

    members:
      members ?? [],
  };
}
// ===========================================================
// CAMBIAR ESTADO DEL NEGOCIO
// ===========================================================

export async function updateAdminBusinessActive({
  businessId,
  active,
}) {
  if (!businessId) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }

  if (
    typeof active !==
    "boolean"
  ) {
    throw new Error(
      "El estado del negocio no es válido.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "businesses",
      )
      .update({
        active,
      })
      .eq(
        "id",
        businessId,
      )
      .select(`
        id,
        name,
        slug,
        type,
        logo_url,
        brand_color,
        google_review_url,
        active,
        settings,
        created_at
      `)
      .single();

  if (error) {
    console.error(
      "update business active:",
      error,
    );

    throw new Error(
      error.message ||
        "No pudimos cambiar el estado del negocio.",
    );
  }

  return data;
}