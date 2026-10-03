import {
  supabase,
} from "../../../services/supabase.js";


const BUSINESS_ASSETS_BUCKET =
  "business-assets";


const ALLOWED_LOGO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


const ALLOWED_BUSINESS_TYPES = [
  "tienda",
  "restaurante",
  "cafeteria",
  "belleza",
  "salud",
  "veterinaria",
  "automotriz",
  "fitness",
  "servicios",
  "entretenimiento",
  "otro",
];


const MAX_LOGO_SIZE =
  2 * 1024 * 1024;


// ===========================================================
// OBTENER NEGOCIO
// ===========================================================

export async function getBusiness(
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
  } =
    await supabase
      .from("businesses")
      .select(`
        id,
        name,
        slug,
        type,
        logo_url,
        brand_color,
        google_review_url,
        settings,
        created_at
      `)
      .eq(
        "id",
        businessId,
      )
      .single();


  if (error) {
    console.error(
      "get business:",
      error,
    );


    throw new Error(
      error.message ||
        "No pudimos cargar la configuración del negocio.",
    );
  }


  return data;
}


// ===========================================================
// ACTUALIZAR NEGOCIO
// ===========================================================

export async function updateBusiness({
  businessId,
  name,
  type,
  logoUrl,
  brandColor,
  googleReviewUrl,
  settings,
}) {
  if (!businessId) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }


  const cleanName =
    name?.trim();


  const cleanType =
    type
      ?.trim()
      .toLowerCase();


  const cleanLogoUrl =
    logoUrl?.trim() ||
    null;


  const cleanBrandColor =
    brandColor?.trim() ||
    null;


  const cleanGoogleReviewUrl =
    googleReviewUrl?.trim() ||
    null;


  if (!cleanName) {
    throw new Error(
      "El nombre del negocio es obligatorio.",
    );
  }


  if (
    !cleanType ||
    !ALLOWED_BUSINESS_TYPES.includes(
      cleanType,
    )
  ) {
    throw new Error(
      "Selecciona un tipo de negocio válido.",
    );
  }


  if (
    cleanBrandColor &&
    !/^#[0-9a-fA-F]{6}$/.test(
      cleanBrandColor,
    )
  ) {
    throw new Error(
      "El color de marca debe tener formato hexadecimal.",
    );
  }


  if (
    !settings ||
    typeof settings !==
      "object" ||
    Array.isArray(
      settings,
    )
  ) {
    throw new Error(
      "La configuración del negocio no es válida.",
    );
  }


  const {
    data,
    error,
  } =
    await supabase
      .from("businesses")
      .update({
        name:
          cleanName,

        type:
          cleanType,

        logo_url:
          cleanLogoUrl,

        brand_color:
          cleanBrandColor,

        google_review_url:
          cleanGoogleReviewUrl,

        settings,
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
        settings,
        created_at
      `)
      .single();


  if (error) {
    console.error(
      "update business:",
      error,
    );


    throw new Error(
      error.message ||
        "No pudimos guardar la configuración del negocio.",
    );
  }


  return data;
}


// ===========================================================
// VALIDAR LOGO
// ===========================================================

function validateLogoFile(
  file,
) {
  if (!file) {
    throw new Error(
      "Selecciona una imagen.",
    );
  }


  if (
    !ALLOWED_LOGO_TYPES.includes(
      file.type,
    )
  ) {
    throw new Error(
      "El logo debe ser JPG, PNG o WEBP.",
    );
  }


  if (
    file.size >
    MAX_LOGO_SIZE
  ) {
    throw new Error(
      "El logo no puede superar los 2 MB.",
    );
  }
}


// ===========================================================
// SUBIR / REEMPLAZAR LOGO
// ===========================================================

export async function uploadBusinessLogo({
  businessId,
  file,
}) {
  if (!businessId) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }


  validateLogoFile(
    file,
  );


  const path =
    `${businessId}/logo`;


  const {
    error,
  } =
    await supabase.storage
      .from(
        BUSINESS_ASSETS_BUCKET,
      )
      .upload(
        path,
        file,
        {
          upsert:
            true,

          contentType:
            file.type,

          cacheControl:
            "3600",
        },
      );


  if (error) {
    console.error(
      "upload business logo:",
      error,
    );


    throw new Error(
      error.message ||
        "No pudimos subir el logo.",
    );
  }


  const {
    data,
  } =
    supabase.storage
      .from(
        BUSINESS_ASSETS_BUCKET,
      )
      .getPublicUrl(
        path,
      );


  if (!data?.publicUrl) {
    throw new Error(
      "No pudimos obtener la dirección pública del logo.",
    );
  }


  return {
    path,

    publicUrl:
      `${data.publicUrl}?v=${Date.now()}`,
  };
}


// ===========================================================
// ELIMINAR LOGO
// ===========================================================

export async function removeBusinessLogo(
  businessId,
) {
  if (!businessId) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }


  const path =
    `${businessId}/logo`;


  const {
    error,
  } =
    await supabase.storage
      .from(
        BUSINESS_ASSETS_BUCKET,
      )
      .remove([
        path,
      ]);


  if (error) {
    console.error(
      "remove business logo:",
      error,
    );


    throw new Error(
      error.message ||
        "No pudimos eliminar el logo.",
    );
  }


  return true;
}