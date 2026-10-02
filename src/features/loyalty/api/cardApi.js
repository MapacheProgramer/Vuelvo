import {
  callEdgeFunction,
} from "../../../services/supabaseFunctions.js";

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