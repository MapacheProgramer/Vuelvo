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