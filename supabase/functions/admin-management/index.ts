import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Operaciones exclusivas del administrador de la plataforma Vuelvo.
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map((item) => item.trim()).filter(Boolean);
const allowDev = Deno.env.get("ALLOW_DEV_ORIGINS") === "true";
const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}):\d{2,5}$/;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const originAllowed = Boolean(origin && (
    allowedOrigins.includes(origin) ||
    (allowDev && localOrigin.test(origin))
  ));
  const cors: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (originAllowed && origin) cors["Access-Control-Allow-Origin"] = origin;
  const json = (body: unknown, status = 200) => new Response(
    JSON.stringify(body),
    { status, headers: { ...cors, "Content-Type": "application/json" } },
  );

  if (req.method === "OPTIONS") return new Response(null, {
    status: originAllowed ? 204 : 403,
    headers: cors,
  });
  if (!originAllowed || req.method !== "POST") {
    return json({ status: "error", message: "Solicitud no permitida." }, 403);
  }

  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ status: "error", message: "Inicia sesión." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ status: "error", message: "Servicio no configurado." }, 500);

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return json({ status: "error", message: "Sesión no válida." }, 401);
  }
  const { data: admin, error: adminError } = await supabase
    .from("platform_admins").select("user_id")
    .eq("user_id", authData.user.id).maybeSingle();
  if (adminError) return json({ status: "error", message: "No pudimos validar los permisos." }, 500);
  if (!admin) return json({ status: "error", message: "Acceso restringido al administrador." }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ status: "error", message: "Solicitud no válida." }, 400); }
  const action = body.action;
  const businessId = body.businessId;
  if (typeof businessId !== "string" || !/^[0-9a-f-]{36}$/i.test(businessId)) {
    return json({ status: "error", message: "Identificador del negocio inválido." }, 400);
  }

  if (action === "reset_password") {
    const userId = body.userId;
    if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return json({ status: "error", message: "Usuario inválido." }, 400);
    }
    const { data: membership, error: memberError } = await supabase
      .from("business_members").select("user_id")
      .eq("business_id", businessId).eq("user_id", userId).maybeSingle();
    if (memberError) return json({ status: "error", message: "Error al verificar el usuario." }, 500);
    if (!membership) return json({ status: "error", message: "El usuario no pertenece a este negocio." }, 404);

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (userError || !email) return json({ status: "error", message: "El usuario no tiene un correo válido." }, 404);

    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (sendError) {
      console.error("admin password reset:", sendError.message);
      return json({ status: "error", message: "No pudimos enviar el correo de restablecimiento." }, 502);
    }
    return json({ status: "ok", message: "Correo de restablecimiento enviado." });
  }

  if (action === "delete_empty_business") {
    const confirmedSlug = body.confirmedSlug;
    const { data: business, error: businessError } = await supabase
      .from("businesses").select("id, slug, active")
      .eq("id", businessId).maybeSingle();
    if (businessError) return json({ status: "error", message: "No pudimos consultar el negocio." }, 500);
    if (!business) return json({ status: "error", message: "Negocio no encontrado." }, 404);
    if (business.active !== false) {
      return json({ status: "error", message: "Primero debes desactivar el negocio." }, 409);
    }
    if (typeof confirmedSlug !== "string" || confirmedSlug !== business.slug) {
      return json({ status: "error", message: "La confirmación no coincide con el identificador." }, 400);
    }

    // Sin respaldo recuperable, impedir el borrado si hay cualquier dato operativo.
    // business_members, business_modules y tags son configuración de este negocio
    // y se eliminan por CASCADE cuando las verificaciones anteriores pasan.
    for (const table of [
      "customers",
      "visits",
      "visit_requests",
      "rewards",
      "messages",
      "message_templates",
      "reward_catalog",
      "customer_recoveries",
    ]) {
      const { count, error } = await supabase.from(table)
        .select("*", { count: "exact", head: true }).eq("business_id", businessId);
      if (error) {
        console.error("check delete business:", table, error.message);
        return json({ status: "error", message: "No pudimos comprobar si el negocio tiene datos." }, 500);
      }
      if ((count ?? 0) > 0) {
        return json({ status: "error", message: "No se puede eliminar: el negocio tiene datos o configuraciones asociadas. Déjalo desactivado." }, 409);
      }
    }

    const { data: deleted, error: deleteError } = await supabase
      .from("businesses").delete()
      .eq("id", businessId).eq("active", false).select("id");
    if (deleteError || !deleted || deleted.length !== 1) {
      console.error("delete empty business:", deleteError?.message ?? "no rows");
      return json({ status: "error", message: "No pudimos eliminar el negocio. No se han eliminado las cuentas de acceso." }, 500);
    }
    // Los usuarios Auth no se borran: pueden tener otras membresías. Se revisarán separadamente.
    return json({ status: "ok", message: "Negocio de prueba eliminado. Las cuentas de acceso no se han borrado." });
  }

  return json({ status: "error", message: "Acción no permitida." }, 400);
});
