// Supabase Edge Function: POST /functions/v1/visit  (versión endurecida, Fase 1)
// Body: { code, device_token, registration?: { name, whatsapp, birthday?, consent } }
// Respuestas (status):
//   needs_registration | registered_ok | too_soon | redirect | not_found | error

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------
// CORS restringido
// Producción: define el secret ALLOWED_ORIGINS con tus dominios, separados por coma
//   npx supabase secrets set ALLOWED_ORIGINS=https://vuelvo.vercel.app,https://tudominio.com
// Desarrollo: se permiten localhost y redes locales (celular en la misma wifi).
// Cuando publiques, ELIMINA la constante DEV_ORIGIN para cerrar el acceso local.
// ---------------------------------------------------------------------
const DEV_ORIGIN =
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{2,5}$/;

const PROD_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // llamadas sin navegador (curl, servidor); no llevan Origin
  return PROD_ORIGINS.includes(origin) || DEV_ORIGIN.test(origin);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

// ---------------------------------------------------------------------
// Constantes y validaciones
// ---------------------------------------------------------------------
const MAX_BODY_BYTES = 4096;
const CODE_RE = /^[A-Za-z0-9_-]{3,32}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/;

const CONSENT_TEXT =
  "Autorizo el tratamiento de mis datos personales (nombre, WhatsApp y cumpleaños) " +
  "para gestionar mis sellos y recibir mensajes y promociones de este negocio, " +
  "conforme a la Ley 1581 de 2012.";

class ValidationError extends Error {}

// Normaliza a E.164. Asume Colombia (+57) si son 10 dígitos que empiezan por 3.
function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) return `+57${digits}`;
  if (digits.length === 12 && digits.startsWith("57")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

function cleanName(raw: unknown): string {
  if (typeof raw !== "string") throw new ValidationError("Escribe tu nombre");
  // quita caracteres de control y espacios repetidos
  const name = raw.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  if (name.length < 2) throw new ValidationError("Escribe tu nombre");
  if (name.length > 60) throw new ValidationError("El nombre es demasiado largo");
  return name;
}

function cleanBirthday(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new ValidationError("La fecha de cumpleaños no es válida");
  }
  const d = new Date(`${raw}T00:00:00Z`);
  const valid = !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === raw;
  const year = Number(raw.slice(0, 4));
  if (!valid || year < 1900 || d.getTime() > Date.now()) {
    throw new ValidationError("La fecha de cumpleaños no es válida");
  }
  return raw;
}

// ---------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (!isAllowedOrigin(origin)) return json({ status: "error", message: "Origen no permitido" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ status: "error", message: "Método no permitido" }, 405);

  // --- Cuerpo: tamaño limitado y JSON válido ---
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return json({ status: "error", message: "Petición demasiado grande" }, 413);

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json({ status: "error", message: "Petición inválida" }, 400);
  }
  if (raw.length > MAX_BODY_BYTES) return json({ status: "error", message: "Petición demasiado grande" }, 413);

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ status: "error", message: "JSON inválido" }, 400);
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return json({ status: "error", message: "Petición inválida" }, 400);
  }

  const { code, device_token, registration } = payload;

  if (typeof code !== "string" || !CODE_RE.test(code)) {
    return json({ status: "error", message: "Código inválido" }, 400);
  }
  if (typeof device_token !== "string" || !TOKEN_RE.test(device_token)) {
    return json({ status: "error", message: "Dispositivo inválido" }, 400);
  }
  if (registration !== undefined && (typeof registration !== "object" || registration === null)) {
    return json({ status: "error", message: "Registro inválido" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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

  // 2. Acciones que no necesitan cliente (link / menú / reseña)
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

    let name: string;
    let birthday: string | null;
    try {
      name = cleanName(registration.name);
      birthday = cleanBirthday(registration.birthday);
    } catch (e) {
      if (e instanceof ValidationError) return json({ status: "error", message: e.message }, 400);
      throw e;
    }

    const whatsapp =
      typeof registration.whatsapp === "string" ? normalizeWhatsapp(registration.whatsapp) : null;
    if (!whatsapp) return json({ status: "error", message: "Revisa tu número de WhatsApp" }, 400);

    if (registration.consent !== true) {
      return json({ status: "error", message: "Debes aceptar el tratamiento de datos" }, 400);
    }

    const { data: saved, error } = await supabase
      .from("customers")
      .upsert(
        {
          business_id: business.id,
          name,
          whatsapp,
          birthday,
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
    reward_earned: result.stamps === 0,
    business: brand,
  });
});