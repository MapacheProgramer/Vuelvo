import {
  supabase,
} from "../../../services/supabase.js";


function validateRewardName(name) {
  const cleanName =
    name?.trim();

  if (!cleanName) {
    throw new Error(
      "Escribe el nombre de la recompensa.",
    );
  }

  if (cleanName.length > 100) {
    throw new Error(
      "El nombre de la recompensa es demasiado largo.",
    );
  }

  return cleanName;
}


/* =========================================================
   OBTENER CATÁLOGO
   ========================================================= */

export async function getRewardCatalog(
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
    .from("reward_catalog")
    .select("*")
    .eq(
      "business_id",
      businessId,
    )
    .order(
      "name",
      {
        ascending: true,
      },
    );

  if (error) {
    console.error(
      "getRewardCatalog:",
      error,
    );

    throw new Error(
      error.message ||
        "No pudimos cargar el catálogo.",
    );
  }

  return data ?? [];
}


/* =========================================================
   CREAR RECOMPENSA
   ========================================================= */

export async function createReward({
  businessId,
  name,
  description,
  active = true,
}) {
  if (!businessId) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }

  const cleanName =
    validateRewardName(name);

  const cleanDescription =
    description?.trim();

  const {
    data,
    error,
  } = await supabase
    .from("reward_catalog")
    .insert({
      business_id:
        businessId,

      name:
        cleanName,

      description:
        cleanDescription ||
        null,

      active:
        Boolean(active),
    })
    .select("*")
    .single();

  if (error) {
    console.error(
      "createReward:",
      error,
    );

    throw new Error(
      error.message ||
        "No pudimos crear la recompensa.",
    );
  }

  return data;
}


/* =========================================================
   EDITAR RECOMPENSA
   ========================================================= */

export async function updateReward({
  businessId,
  rewardId,
  name,
  description,
  active,
}) {
  if (!businessId) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }

  if (!rewardId) {
    throw new Error(
      "No se encontró la recompensa.",
    );
  }

  const cleanName =
    validateRewardName(name);

  const cleanDescription =
    description?.trim();

  const {
    data,
    error,
  } = await supabase
    .from("reward_catalog")
    .update({
      name:
        cleanName,

      description:
        cleanDescription ||
        null,

      active:
        Boolean(active),
    })
    .eq(
      "id",
      rewardId,
    )
    .eq(
      "business_id",
      businessId,
    )
    .select("*")
    .single();

  if (error) {
    console.error(
      "updateReward:",
      error,
    );

    throw new Error(
      error.message ||
        "No pudimos actualizar la recompensa.",
    );
  }

  return data;
}