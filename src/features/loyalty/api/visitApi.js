import {
  callEdgeFunction,
} from "../../../services/supabaseFunctions.js";

export function registerVisit(payload) {
  return callEdgeFunction(
    "visit",
    {
      body: payload,
    },
  );
}