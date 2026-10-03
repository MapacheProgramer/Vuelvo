import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// ===========================================================
// CORS
// ===========================================================

const DEV_ORIGIN =
  /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):\d{2,5}$/;


const ALLOW_DEV =
  Deno.env.get(
    "ALLOW_DEV_ORIGINS",
  ) === "true";


const PROD_ORIGINS =
  (
    Deno.env.get(
      "ALLOWED_ORIGINS",
    ) ?? ""
  )
    .split(",")
    .map(
      (value) =>
        value.trim(),
    )
    .filter(Boolean);


function isAllowedOrigin(
  origin: string | null,
) {
  if (!origin) {
    return true;
  }


  return (
    PROD_ORIGINS.includes(
      origin,
    ) ||
    (
      ALLOW_DEV &&
      DEV_ORIGIN.test(
        origin,
      )
    )
  );
}


function getCorsHeaders(
  origin: string | null,
) {
  const headers: Record<
    string,
    string
  > = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    Vary:
      "Origin",
  };


  if (
    origin &&
    isAllowedOrigin(
      origin,
    )
  ) {
    headers[
      "Access-Control-Allow-Origin"
    ] = origin;
  }


  return headers;
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
    // SUPABASE
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
    // USUARIO ACTUAL
    // =======================================================

    const {
      data:
        authData,

      error:
        authError,
    } =
      await supabase.auth
        .getUser(
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
    // BODY
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


    const businessId =
      typeof payload
        ?.business_id ===
      "string"
        ? payload
            .business_id
            .trim()
        : "";


    const targetUserId =
      typeof payload
        ?.user_id ===
      "string"
        ? payload
            .user_id
            .trim()
        : "";


    if (
      !businessId ||
      !targetUserId
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Faltan datos para eliminar el miembro.",
        },
        400,
      );
    }


    // =======================================================
    // NO ELIMINARSE A SÍ MISMO
    // =======================================================

    if (
      currentUser.id ===
      targetUserId
    ) {
      return json(
        {
          status:
            "error",

          message:
            "No puedes eliminar tu propia cuenta.",
        },
        400,
      );
    }


    // =======================================================
    // VERIFICAR OWNER
    // =======================================================

    const {
      data:
        ownerMembership,

      error:
        ownerError,
    } =
      await supabase
        .from(
          "business_members",
        )
        .select(
          "business_id, user_id, role",
        )
        .eq(
          "business_id",
          businessId,
        )
        .eq(
          "user_id",
          currentUser.id,
        )
        .maybeSingle();


    if (
      ownerError
    ) {
      console.error(
        "owner membership:",
        ownerError.message,
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
      !ownerMembership ||
      ownerMembership.role !==
        "owner"
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Solo el propietario puede eliminar miembros.",
        },
        403,
      );
    }


    // =======================================================
    // BUSCAR MIEMBRO
    // =======================================================

    const {
      data:
        targetMembership,

      error:
        targetError,
    } =
      await supabase
        .from(
          "business_members",
        )
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
        .eq(
          "business_id",
          businessId,
        )
        .eq(
          "user_id",
          targetUserId,
        )
        .maybeSingle();


    if (
      targetError
    ) {
      console.error(
        "target membership:",
        targetError.message,
      );


      return json(
        {
          status:
            "error",

          message:
            "No pudimos consultar el miembro.",
        },
        500,
      );
    }


    if (
      !targetMembership
    ) {
      return json(
        {
          status:
            "error",

          message:
            "El miembro no existe.",
        },
        404,
      );
    }


    // =======================================================
    // JAMÁS BORRAR OWNER
    // =======================================================

    if (
      targetMembership.role ===
      "owner"
    ) {
      return json(
        {
          status:
            "error",

          message:
            "No puedes eliminar al propietario del negocio.",
        },
        403,
      );
    }


    if (
      targetMembership.role !==
      "staff"
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Este miembro no puede ser eliminado desde esta acción.",
        },
        400,
      );
    }


    // =======================================================
    // ELIMINAR MEMBRESÍA
    // =======================================================

    const {
      error:
        deleteMembershipError,
    } =
      await supabase
        .from(
          "business_members",
        )
        .delete()
        .eq(
          "business_id",
          businessId,
        )
        .eq(
          "user_id",
          targetUserId,
        );


    if (
      deleteMembershipError
    ) {
      console.error(
        "delete membership:",
        deleteMembershipError.message,
      );


      return json(
        {
          status:
            "error",

          message:
            "No pudimos eliminar el miembro.",
        },
        500,
      );
    }


    // =======================================================
    // ELIMINAR USUARIO DE AUTH
    // =======================================================

    const {
      error:
        deleteUserError,
    } =
      await supabase.auth.admin
        .deleteUser(
          targetUserId,
        );


    // =======================================================
    // ROLLBACK SI FALLA AUTH
    // =======================================================

    if (
      deleteUserError
    ) {
      console.error(
        "delete auth user:",
        deleteUserError.message,
      );


      const {
        error:
          rollbackError,
      } =
        await supabase
          .from(
            "business_members",
          )
          .insert({
            business_id:
              targetMembership.business_id,

            user_id:
              targetMembership.user_id,

            role:
              targetMembership.role,

            display_name:
              targetMembership.display_name,

            onboarding_completed:
              targetMembership.onboarding_completed,

            created_at:
              targetMembership.created_at,
          });


      if (
        rollbackError
      ) {
        console.error(
          "rollback membership:",
          rollbackError.message,
        );
      }


      return json(
        {
          status:
            "error",

          message:
            "No pudimos eliminar completamente la cuenta del miembro.",
        },
        500,
      );
    }


    // =======================================================
    // OK
    // =======================================================

    return json({
      status:
        "ok",

      message:
        "Miembro eliminado correctamente.",

      user_id:
        targetUserId,
    });
  },
);