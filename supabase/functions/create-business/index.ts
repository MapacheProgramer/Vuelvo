import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===========================================================
// CORS
// ===========================================================

const DEV_ORIGIN =
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{2,5}$/;

const ALLOW_DEV =
  Deno.env.get("ALLOW_DEV_ORIGINS") === "true";

const PROD_ORIGINS =
  (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

function isAllowedOrigin(
  origin: string | null,
) {
  if (!origin) {
    return true;
  }

  return (
    PROD_ORIGINS.includes(origin) ||
    (
      ALLOW_DEV &&
      DEV_ORIGIN.test(origin)
    )
  );
}

function getCorsHeaders(
  origin: string | null,
) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    Vary:
      "Origin",
  };

  if (
    origin &&
    isAllowedOrigin(origin)
  ) {
    headers[
      "Access-Control-Allow-Origin"
    ] = origin;
  }

  return headers;
}


// ===========================================================
// VALIDACIONES
// ===========================================================

function cleanEmail(
  value: unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const email =
    value
      .trim()
      .toLowerCase();

  const valid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    );

  return valid
    ? email
    : null;
}

function cleanText(
  value: unknown,
  min: number,
  max: number,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const text =
    value
      .replace(
        /[\u0000-\u001F\u007F]/g,
        "",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  if (
    text.length < min ||
    text.length > max
  ) {
    return null;
  }

  return text;
}

function cleanSlug(
  value: unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const slug =
    value
      .trim()
      .toLowerCase();

  if (
    slug.length < 2 ||
    slug.length > 60 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
      slug,
    )
  ) {
    return null;
  }

  return slug;
}


// ===========================================================
// SERVIDOR
// ===========================================================

Deno.serve(
  async (
    req,
  ) => {
    const origin =
      req.headers.get(
        "origin",
      );

    const cors =
      getCorsHeaders(
        origin,
      );

    const json = (
      body: unknown,
      status = 200,
    ) =>
      new Response(
        JSON.stringify(
          body,
        ),
        {
          status,

          headers: {
            ...cors,

            "Content-Type":
              "application/json",
          },
        },
      );


    // =======================================================
    // ORIGEN
    // =======================================================

    if (
      !isAllowedOrigin(
        origin,
      )
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Origen no permitido.",
        },
        403,
      );
    }


    // =======================================================
    // PREFLIGHT
    // =======================================================

    if (
      req.method ===
      "OPTIONS"
    ) {
      return new Response(
        null,
        {
          status:
            204,

          headers:
            cors,
        },
      );
    }


    // =======================================================
    // MÉTODO
    // =======================================================

    if (
      req.method !==
      "POST"
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Método no permitido.",
        },
        405,
      );
    }


    // =======================================================
    // TOKEN
    // =======================================================

    const authorization =
      req.headers.get(
        "Authorization",
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer ",
      )
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Debes iniciar sesión.",
        },
        401,
      );
    }

    const token =
      authorization.slice(
        7,
      );


    // =======================================================
    // SUPABASE SERVICE ROLE
    // =======================================================

    const supabase =
      createClient(
        Deno.env.get(
          "SUPABASE_URL",
        )!,

        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        )!,
      );


    // =======================================================
    // VALIDAR USUARIO AUTENTICADO
    // =======================================================

    const {
      data:
        authData,

      error:
        authError,
    } =
      await supabase.auth.getUser(
        token,
      );

    if (
      authError ||
      !authData.user
    ) {
      return json(
        {
          status:
            "error",

          message:
            "La sesión no es válida.",
        },
        401,
      );
    }

    const currentUser =
      authData.user;


    // =======================================================
    // VALIDAR ADMINISTRADOR DE VUELVO
    // =======================================================

    const {
      data:
        platformAdmin,

      error:
        platformAdminError,
    } =
      await supabase
        .from(
          "platform_admins",
        )
        .select(
          "user_id",
        )
        .eq(
          "user_id",
          currentUser.id,
        )
        .maybeSingle();

    if (
      platformAdminError
    ) {
      console.error(
        "platform admin:",
        platformAdminError.message,
      );

      return json(
        {
          status:
            "error",

          message:
            "No pudimos validar tus permisos.",
        },
        500,
      );
    }

    if (
      !platformAdmin
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Solo un administrador de Vuelvo puede crear negocios.",
        },
        403,
      );
    }


    // =======================================================
    // LEER BODY
    // =======================================================

    let payload:
      any;

    try {
      payload =
        await req.json();
    } catch {
      return json(
        {
          status:
            "error",

          message:
            "La solicitud no es válida.",
        },
        400,
      );
    }

    const businessName =
      cleanText(
        payload?.name,
        2,
        80,
      );

    const slug =
      cleanSlug(
        payload?.slug,
      );

    const businessType =
      cleanText(
        payload?.type ?? "general",
        2,
        40,
      );

    const ownerName =
      cleanText(
        payload?.owner_display_name,
        2,
        60,
      );

    const ownerEmail =
      cleanEmail(
        payload?.owner_email,
      );


    // =======================================================
    // VALIDAR DATOS
    // =======================================================

    if (
      !businessName
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Escribe un nombre válido para el negocio.",
        },
        400,
      );
    }

    if (
      !slug
    ) {
      return json(
        {
          status:
            "error",

          message:
            "El identificador debe usar solo letras minúsculas, números y guiones.",
        },
        400,
      );
    }

    if (
      !businessType
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Escribe un tipo de negocio válido.",
        },
        400,
      );
    }

    if (
      !ownerName
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Escribe el nombre del propietario.",
        },
        400,
      );
    }

    if (
      !ownerEmail
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Escribe un correo electrónico válido para el propietario.",
        },
        400,
      );
    }


    // =======================================================
    // EVITAR SLUG REPETIDO
    // =======================================================

    const {
      data:
        existingBusiness,

      error:
        existingBusinessError,
    } =
      await supabase
        .from(
          "businesses",
        )
        .select(
          "id",
        )
        .eq(
          "slug",
          slug,
        )
        .maybeSingle();

    if (
      existingBusinessError
    ) {
      console.error(
        "check business slug:",
        existingBusinessError.message,
      );

      return json(
        {
          status:
            "error",

          message:
            "No pudimos validar el identificador del negocio.",
        },
        500,
      );
    }

    if (
      existingBusiness
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Ya existe un negocio con este identificador.",
        },
        409,
      );
    }


    // =======================================================
    // CREAR NEGOCIO
    // =======================================================

    const {
      data:
        business,

      error:
        businessError,
    } =
      await supabase
        .from(
          "businesses",
        )
        .insert({
          name:
            businessName,

          slug,

          type:
            businessType,
        })
        .select(
          `
          id,
          name,
          slug,
          type,
          logo_url,
          brand_color,
          settings,
          created_at
          `,
        )
        .single();

    if (
      businessError ||
      !business
    ) {
      console.error(
        "create business:",
        businessError?.message,
      );

      return json(
        {
          status:
            "error",

          message:
            "No pudimos crear el negocio.",
        },
        500,
      );
    }


    // =======================================================
    // INVITAR PROPIETARIO
    // =======================================================

    const redirectTo =
      origin
        ? `${origin}/invite`
        : undefined;

    const {
      data:
        inviteData,

      error:
        inviteError,
    } =
      await supabase.auth.admin
        .inviteUserByEmail(
          ownerEmail,
          {
            redirectTo,

            data: {
              display_name:
                ownerName,

              role:
                "owner",
            },
          },
        );

    if (
      inviteError ||
      !inviteData.user
    ) {
      console.error(
        "invite owner:",
        inviteError?.message,
      );

      const {
        error:
          rollbackBusinessError,
      } =
        await supabase
          .from(
            "businesses",
          )
          .delete()
          .eq(
            "id",
            business.id,
          );

      if (
        rollbackBusinessError
      ) {
        console.error(
          "rollback business:",
          rollbackBusinessError.message,
        );
      }

      const message =
        inviteError?.message
          ?.toLowerCase() ??
        "";

      if (
        message.includes(
          "already",
        ) ||
        message.includes(
          "registered",
        ) ||
        message.includes(
          "exists",
        )
      ) {
        return json(
          {
            status:
              "error",

            message:
              "Ya existe una cuenta con el correo del propietario.",
          },
          409,
        );
      }

      return json(
        {
          status:
            "error",

          message:
            "No pudimos enviar la invitación al propietario.",
        },
        500,
      );
    }

    const ownerUser =
      inviteData.user;


    // =======================================================
    // CREAR MEMBRESÍA OWNER
    // =======================================================

    const {
      data:
        membership,

      error:
        membershipError,
    } =
      await supabase
        .from(
          "business_members",
        )
        .insert({
          business_id:
            business.id,

          user_id:
            ownerUser.id,

          role:
            "owner",

          display_name:
            ownerName,

          onboarding_completed:
            true,
        })
        .select(
          `
          business_id,
          user_id,
          role,
          display_name,
          onboarding_completed,
          created_at
          `,
        )
        .single();


    // =======================================================
    // ROLLBACK SI FALLA LA MEMBRESÍA
    // =======================================================

    if (
      membershipError ||
      !membership
    ) {
      console.error(
        "create owner membership:",
        membershipError?.message,
      );

      const {
        error:
          deleteUserError,
      } =
        await supabase.auth.admin
          .deleteUser(
            ownerUser.id,
          );

      if (
        deleteUserError
      ) {
        console.error(
          "rollback owner user:",
          deleteUserError.message,
        );
      }

      const {
        error:
          deleteBusinessError,
      } =
        await supabase
          .from(
            "businesses",
          )
          .delete()
          .eq(
            "id",
            business.id,
          );

      if (
        deleteBusinessError
      ) {
        console.error(
          "rollback business:",
          deleteBusinessError.message,
        );
      }

      return json(
        {
          status:
            "error",

          message:
            "No pudimos asociar el propietario al negocio.",
        },
        500,
      );
    }


    // =======================================================
    // RESPUESTA
    // =======================================================

    return json({
      status:
        "ok",

      message:
        "Negocio creado e invitación enviada al propietario.",

      business,

      owner: {
        user_id:
          ownerUser.id,

        display_name:
          ownerName,

        email:
          ownerEmail,

        role:
          "owner",

        created_at:
          membership.created_at,
      },
    });
  },
);
