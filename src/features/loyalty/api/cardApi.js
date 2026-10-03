import {
  callEdgeFunction,
} from "../../../services/supabaseFunctions.js";

/**
 * Obtiene el estado actual de la tarjeta del cliente.
 *
 * No registra visitas.
 * Únicamente consulta:
 * - cliente
 * - sellos
 * - recompensas pendientes
 * - catálogo disponible
 * - última visita
 */
export function getCardStatus({
  code,
  deviceToken,
}) {
  return callEdgeFunction(
    "card-status",
    {
      body: {
        code,
        device_token: deviceToken,
      },
    },
  );
}

/**
 * Permite al cliente seleccionar una recompensa
 * de una recompensa ya ganada.
 *
 * El navegador no envía customer_id ni business_id.
 * La Edge Function identifica al cliente usando:
 *
 * code + device_token
 */
export function selectCustomerReward({
  code,
  deviceToken,
  earnedRewardId,
  catalogRewardId,
}) {
  return callEdgeFunction(
    "select-reward",
    {
      body: {
        code,
        device_token: deviceToken,
        earned_reward_id:
          earnedRewardId,
        catalog_reward_id:
          catalogRewardId,
      },
    },
  );
}