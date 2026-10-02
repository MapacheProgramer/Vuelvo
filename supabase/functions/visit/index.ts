// Supabase Edge Function: POST /functions/v1/visit  (versión endurecida, Fases 1 y 2)
// Body: { code, device_token, registration?: { name, whatsapp, birthday?, consent } }
// Respuestas (status):
//   needs_registration | registered_ok | too_soon | redirect | not_found | error

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------
// CORS restringido
// Producción: define el secret ALLOWED_ORIGINS con tus dominios, separados por coma
//   npx supabase secrets set ALLOWED_ORIGINS=https://vuelvo.vercel.app,https://tudominio.com
// Desarrollo: localhost y redes locales solo se permiten si existe el secret
//   npx supabase secrets set ALLOW_DEV_ORIGINS=true
// En producción bórralo:  npx supabase secrets unset ALLOW_DEV_ORIGINS
// ---------------------------------------------------------------------
const DEV_ORIGIN =
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{2,5}$/;

const ALLOW_DEV = Deno.env.get("ALLOW_DEV_ORIGINS") === "true";

const PROD_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // llamadas sin navegador (curl, servidor); no llevan Origin
  return PROD_ORIGINS.includes(origin) || (ALLOW_DEV && DEV_ORIGIN.test(origin));
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

// Límites de peticiones (Fase 2). Ajusta estos números según tu experiencia real.
// OJO: en un local con wifi compartida, muchos clientes salen con la misma IP.
const LIMITS = {
  ipPerMinute: 120,        // peticiones por IP por minuto (todas las acciones)
  devicePerMinute: 30,     // peticiones por dispositivo por minuto
  registrationsPerIpHour: 15,          // registros nuevos por IP por hora
  defaultNewCustomersPerBusinessHour: 30, // tope por negocio; se puede cambiar en settings.max_new_customers_per_hour
};
const CODE_RE = /^[A-Za-z0-9_-]{3,32}$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/;

const CONSENT_TEXT =
  "Autorizo el tratamiento de mis datos personales (nombre, WhatsApp y cumpleaños) " +
  "para gestionar mis sellos y recibir mensajes y promociones de este negocio, " +
  "conforme a la Ley 1581 de 2012.";

class ValidationError extends Error {}

// IP del visitante. Se guarda solo un hash, nunca la IP en claro.
async function hashedIp(req: Request): Promise<string> {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  const salt = Deno.env.get("RATE_LIMIT_SALT") ?? "vuelvo";
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

// true = permitido, false = límite superado.
// Si la base de datos falla, deja pasar (prioriza disponibilidad) y lo deja en los logs.
async function allow(
  supabase: ReturnType<typeof createClient>,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit error:", error.message);
    return true;
  }
  return data === true;
}

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

  // 0. Límites de peticiones por IP y por dispositivo
  const ipKey = await hashedIp(req);
  const withinLimits =
    (await allow(supabase, `ip:${ipKey}`, LIMITS.ipPerMinute, 60)) &&
    (await allow(supabase, `dev:${device_token}`, LIMITS.devicePerMinute, 60));
  if (!withinLimits) {
    return json({ status: "error", message: "Demasiados intentos. Espera un momento e intenta de nuevo." }, 429);
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

    // Límites de registros nuevos: por IP y por negocio
    const maxNew = Number(
      business.settings?.max_new_customers_per_hour ?? LIMITS.defaultNewCustomersPerBusinessHour,
    );
    if (!(await allow(supabase, `reg:ip:${ipKey}`, LIMITS.registrationsPerIpHour, 3600))) {
      return json({ status: "error", message: "Demasiados registros desde esta conexión. Intenta más tarde." }, 429);
    }
    if (!(await allow(supabase, `reg:biz:${business.id}`, maxNew, 3600))) {
      return json({ status: "error", message: "Hay muchos registros en este momento. Intenta en un rato." }, 429);
    }

    // Un dispositivo pertenece a un solo cliente por negocio:
    // si este token estaba con otro número, se libera antes de asignarlo.
    await supabase
      .from("customers")
      .update({ device_token: null })
      .eq("business_id", business.id)
      .eq("device_token", device_token)
      .neq("whatsapp", whatsapp);

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
      return json({
        status: "too_soon",
        customer: { name: customer.name },
        stamps: result.stamps,
        required: result.required ?? brand.stamps_required,
        reward_earned: result.reward_earned ?? false,
        business: brand,
      });
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