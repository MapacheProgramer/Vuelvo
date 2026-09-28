// Supabase Edge Function: POST /functions/v1/visit
// Body: { code, device_token, registration?: { name, whatsapp, birthday?, consent } }
// Respuestas (status):
//   needs_registration | registered_ok | too_soon | redirect | not_found | error

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*", // en producción, pon tu dominio
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONSENT_TEXT =
  "Autorizo el tratamiento de mis datos personales (nombre, WhatsApp y cumpleaños) " +
  "para gestionar mis sellos y recibir mensajes y promociones de este negocio, " +
  "conforme a la Ley 1581 de 2012.";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Normaliza a formato E.164. Asume Colombia (+57) si son 10 dígitos que empiezan por 3.
function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return `+57${digits}`;
  if (digits.length === 12 && digits.startsWith("57")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ status: "error", message: "Método no permitido" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ status: "error", message: "JSON inválido" }, 400);
  }

  const { code, device_token, registration } = payload ?? {};
  if (!code || !device_token) {
    return json({ status: "error", message: "Faltan datos" }, 400);
  }

  // 1. Tag y negocio
  const { data: tag } = await supabase
    .from("tags")
    .select("id, business_id, action_type, action_config, active")
    .eq("code", code)
    .maybeSingle();

  if (!tag || !tag.active) return json({ status: "not_found" }, 404);

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, logo_url, brand_color, google_review_url, settings")
    .eq("id", tag.business_id)
    .single();

  const brand = {
    name: business.name,
    logo_url: business.logo_url,
    brand_color: business.brand_color,
    reward_name: business.settings?.reward_name,
    stamps_required: business.settings?.stamps_required,
  };

  // 2. Acciones que no necesitan cliente (link / menú)
  if (tag.action_type === "link" || tag.action_type === "menu") {
    const url = tag.action_config?.url;
    if (url) return json({ status: "redirect", url, business: brand });
  }
  if (tag.action_type === "review" && business.google_review_url) {
    return json({ status: "redirect", url: business.google_review_url, business: brand });
  }

  // 3. Identificar al cliente por dispositivo
  let { data: customer } = await supabase
    .from("customers")
    .select("id, name")
    .eq("business_id", business.id)
    .eq("device_token", device_token)
    .maybeSingle();

  // 4. Registro si es nuevo
  if (!customer) {
    if (!registration) {
      return json({ status: "needs_registration", business: brand, consent_text: CONSENT_TEXT });
    }

    const name = String(registration.name ?? "").trim();
    const whatsapp = normalizeWhatsapp(String(registration.whatsapp ?? ""));

    if (!name || name.length < 2) return json({ status: "error", message: "Escribe tu nombre" }, 400);
    if (!whatsapp) return json({ status: "error", message: "Revisa tu número de WhatsApp" }, 400);
    if (registration.consent !== true) {
      return json({ status: "error", message: "Debes aceptar el tratamiento de datos" }, 400);
    }

    // Si ya existía por WhatsApp (cambió de celular), se reasocia el dispositivo
    const { data: saved, error } = await supabase
      .from("customers")
      .upsert(
        {
          business_id: business.id,
          name,
          whatsapp,
          birthday: registration.birthday || null,
          consent_at: new Date().toISOString(),
          consent_text: CONSENT_TEXT,
          device_token,
        },
        { onConflict: "business_id,whatsapp" },
      )
      .select("id, name")
      .single();

    if (error) return json({ status: "error", message: "No pudimos registrarte" }, 500);
    customer = saved;
  }

  // 5. Registrar visita (anti-trampa dentro de la función SQL)
  const { data: result, error: rpcError } = await supabase.rpc("register_visit", {
    p_tag_code: code,
    p_customer_id: customer.id,
  });

  if (rpcError) return json({ status: "error", message: "No pudimos sumar tu sello" }, 500);

  if (!result.ok) {
    if (result.reason === "too_soon") {
      return json({ status: "too_soon", customer: { name: customer.name }, business: brand });
    }
    return json({ status: "error", message: "No pudimos sumar tu sello" }, 400);
  }

  // 6. Programar mensaje de reseña si el módulo está activo
  const { data: reviewModule } = await supabase
    .from("business_modules")
    .select("enabled")
    .eq("business_id", business.id)
    .eq("module", "reviews")
    .maybeSingle();

  if (reviewModule?.enabled) {
    const delayMin = business.settings?.review_delay_minutes ?? 60;
    await supabase.from("messages").insert({
      business_id: business.id,
      customer_id: customer.id,
      type: "review_request",
      send_at: new Date(Date.now() + delayMin * 60_000).toISOString(),
    });
  }

  return json({
    status: "registered_ok",
    customer: { name: customer.name },
    stamps: result.stamps,
    required: result.required,
    reward_earned: result.stamps === 0, // volvió a 0 = completó y ganó premio
    business: brand,
  });
});
