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


  if (!valid) {
    return null;
  }


  return email;
}


function cleanName(
  value: unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }


  const name =
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
    name.length < 2 ||
    name.length > 60
  ) {
    return null;
  }


  return name;
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


    const businessId =
      typeof payload
        ?.business_id ===
      "string"
        ? payload
            .business_id
            .trim()
        : "";


    const email =
      cleanEmail(
        payload?.email,
      );


    const displayName =
      cleanName(
        payload
          ?.display_name,
      );


    if (
      !businessId
    ) {
      return json(
        {
          status:
            "error",

          message:
            "No se encontró el negocio.",
        },
        400,
      );
    }


    if (
      !displayName
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Escribe el nombre del miembro.",
        },
        400,
      );
    }


    if (
      !email
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Escribe un correo electrónico válido.",
        },
        400,
      );
    }


    // =======================================================
    // VERIFICAR QUE QUIEN INVITA SEA OWNER
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
          `
          business_id,
          user_id,
          role
          `,
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
            "Solo el propietario puede agregar miembros.",
        },
        403,
      );
    }


    // =======================================================
    // EVITAR INVITARSE A SÍ MISMO
    // =======================================================

    if (
      currentUser.email
        ?.toLowerCase() ===
      email
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Este correo ya pertenece al propietario.",
        },
        409,
      );
    }


    // =======================================================
    // DESTINO DE LA INVITACIÓN
    // =======================================================

    const redirectTo =
      origin
        ? `${origin}/invite`
        : undefined;


    // =======================================================
    // INVITAR USUARIO
    // =======================================================

    const {
      data:
        inviteData,

      error:
        inviteError,
    } =
      await supabase.auth.admin
        .inviteUserByEmail(
          email,
          {
            redirectTo,

            data: {
              display_name:
                displayName,
            },
          },
        );


    if (
      inviteError ||
      !inviteData.user
    ) {
      console.error(
        "invite user:",
        inviteError?.message,
      );


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
              "Ya existe una cuenta con este correo.",
          },
          409,
        );
      }


      return json(
        {
          status:
            "error",

          message:
            "No pudimos enviar la invitación.",
        },
        500,
      );
    }


    const newUser =
      inviteData.user;


    // =======================================================
    // CREAR MEMBRESÍA
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
            businessId,

          user_id:
            newUser.id,

          role:
            "staff",

          display_name:
            displayName,
        })
        .select(
          `
          business_id,
          user_id,
          role,
          display_name,
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
        "create membership:",
        membershipError
          ?.message,
      );


      const {
        error:
          deleteError,
      } =
        await supabase.auth.admin
          .deleteUser(
            newUser.id,
          );


      if (
        deleteError
      ) {
        console.error(
          "rollback invited user:",
          deleteError.message,
        );
      }


      return json(
        {
          status:
            "error",

          message:
            "No pudimos agregar el miembro al negocio.",
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
        "Invitación enviada correctamente.",

      member: {
        user_id:
          newUser.id,

        display_name:
          displayName,

        email,

        role:
          "staff",

        created_at:
          membership.created_at,
      },
    });
  },
);
