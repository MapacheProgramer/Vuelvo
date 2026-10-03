// Supabase Edge Function: POST /functions/v1/visit
//
// Body:
// {
//   code,
//   device_token,
//   registration?: {
//     name,
//     cedula,
//     whatsapp,
//     birthday?,
//     consent
//   }
// }
//
// Respuestas:
// needs_registration
// registered_ok
// too_soon
// redirect
// not_found
// error

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// ---------------------------------------------------------------------
// CORS restringido
// ---------------------------------------------------------------------

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
): boolean {
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


function corsHeaders(
  origin: string | null,
): Record<string, string> {
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


// ---------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------

const MAX_BODY_BYTES =
  4096;


const LIMITS = {
  ipPerMinute:
    120,

  devicePerMinute:
    30,

  registrationsPerIpHour:
    15,

  defaultNewCustomersPerBusinessHour:
    30,
};


const CODE_RE =
  /^[A-Za-z0-9_-]{3,32}$/;


const TOKEN_RE =
  /^[A-Za-z0-9_-]{8,64}$/;


const CEDULA_RE =
  /^[0-9]{5,15}$/;


const CONSENT_TEXT =
  "Autorizo el tratamiento de mis datos personales " +
  "(nombre, cédula de ciudadanía, WhatsApp y cumpleaños) " +
  "para gestionar mis sellos y recibir mensajes y promociones " +
  "de este negocio, conforme a la Ley 1581 de 2012.";


// ---------------------------------------------------------------------
// Errores de validación
// ---------------------------------------------------------------------

class ValidationError
  extends Error {}


// ---------------------------------------------------------------------
// IP hasheada
// ---------------------------------------------------------------------

async function hashedIp(
  req: Request,
): Promise<string> {
  const ip =
    req.headers.get(
      "cf-connecting-ip",
    ) ??
    req.headers
      .get(
        "x-forwarded-for",
      )
      ?.split(",")[0]
      .trim() ??
    "unknown";


  const salt =
    Deno.env.get(
      "RATE_LIMIT_SALT",
    ) ??
    "vuelvo";


  const bytes =
    new TextEncoder()
      .encode(
        `${salt}:${ip}`,
      );


  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes,
    );


  return Array.from(
    new Uint8Array(
      digest,
    ),
  )
    .map(
      (byte) =>
        byte
          .toString(16)
          .padStart(
            2,
            "0",
          ),
    )
    .join("")
    .slice(
      0,
      32,
    );
}


// ---------------------------------------------------------------------
// Rate limit
// ---------------------------------------------------------------------

async function allow(
  supabase:
    ReturnType<
      typeof createClient
    >,

  key:
    string,

  limit:
    number,

  windowSeconds:
    number,
): Promise<boolean> {
  const {
    data,
    error,
  } =
    await supabase.rpc(
      "check_rate_limit",
      {
        p_key:
          key,

        p_limit:
          limit,

        p_window_seconds:
          windowSeconds,
      },
    );


  if (error) {
    console.error(
      "rate limit error:",
      error.message,
    );

    return true;
  }


  return data === true;
}


// ---------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------

function normalizeWhatsapp(
  raw: string,
): string | null {
  const digits =
    raw.replace(
      /\D/g,
      "",
    );


  // Colombia
  if (
    digits.length === 10 &&
    digits.startsWith(
      "3",
    )
  ) {
    return `+57${digits}`;
  }


  // Colombia incluyendo 57
  if (
    digits.length === 12 &&
    digits.startsWith(
      "57",
    )
  ) {
    return `+${digits}`;
  }


  // Internacional
  if (
    digits.length >= 11 &&
    digits.length <= 15
  ) {
    return `+${digits}`;
  }


  return null;
}


// ---------------------------------------------------------------------
// Nombre
// ---------------------------------------------------------------------

function cleanName(
  raw: unknown,
): string {
  if (
    typeof raw !==
    "string"
  ) {
    throw new ValidationError(
      "Escribe tu nombre",
    );
  }


  const name =
    raw
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
    name.length < 2
  ) {
    throw new ValidationError(
      "Escribe tu nombre",
    );
  }


  if (
    name.length > 60
  ) {
    throw new ValidationError(
      "El nombre es demasiado largo",
    );
  }


  return name;
}


// ---------------------------------------------------------------------
// Cédula
// ---------------------------------------------------------------------

function cleanCedula(
  raw: unknown,
): string {
  if (
    typeof raw !==
    "string"
  ) {
    throw new ValidationError(
      "Escribe tu cédula de ciudadanía",
    );
  }


  const cedula =
    raw.trim();


  if (
    !CEDULA_RE.test(
      cedula,
    )
  ) {
    throw new ValidationError(
      "La cédula debe contener únicamente entre 5 y 15 números",
    );
  }


  return cedula;
}


// ---------------------------------------------------------------------
// Cumpleaños
// ---------------------------------------------------------------------

function cleanBirthday(
  raw: unknown,
): string | null {
  if (
    raw === undefined ||
    raw === null ||
    raw === ""
  ) {
    return null;
  }


  if (
    typeof raw !==
      "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      raw,
    )
  ) {
    throw new ValidationError(
      "La fecha de cumpleaños no es válida",
    );
  }


  const date =
    new Date(
      `${raw}T00:00:00Z`,
    );


  const valid =
    !isNaN(
      date.getTime(),
    ) &&
    date
      .toISOString()
      .slice(
        0,
        10,
      ) === raw;


  const year =
    Number(
      raw.slice(
        0,
        4,
      ),
    );


  if (
    !valid ||
    year < 1900 ||
    date.getTime() >
      Date.now()
  ) {
    throw new ValidationError(
      "La fecha de cumpleaños no es válida",
    );
  }


  return raw;
}


// =====================================================================
// SERVIDOR
// =====================================================================

Deno.serve(
  async (
    req,
  ) => {
    const origin =
      req.headers.get(
        "origin",
      );


    const cors =
      corsHeaders(
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


    // -----------------------------------------------------------------
    // 1. Origen
    // -----------------------------------------------------------------

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
            "Origen no permitido",
        },
        403,
      );
    }


    // -----------------------------------------------------------------
    // 2. Preflight
    // -----------------------------------------------------------------

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


    // -----------------------------------------------------------------
    // 3. Solo POST
    // -----------------------------------------------------------------

    if (
      req.method !==
      "POST"
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Método no permitido",
        },
        405,
      );
    }


    // -----------------------------------------------------------------
    // 4. Tamaño del body
    // -----------------------------------------------------------------

    const declared =
      Number(
        req.headers.get(
          "content-length",
        ) ?? "0",
      );


    if (
      declared >
      MAX_BODY_BYTES
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Petición demasiado grande",
        },
        413,
      );
    }


    let raw:
      string;


    try {
      raw =
        await req.text();
    } catch {
      return json(
        {
          status:
            "error",

          message:
            "Petición inválida",
        },
        400,
      );
    }


    if (
      raw.length >
      MAX_BODY_BYTES
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Petición demasiado grande",
        },
        413,
      );
    }


    // -----------------------------------------------------------------
    // 5. JSON
    // -----------------------------------------------------------------

    let payload:
      any;


    try {
      payload =
        JSON.parse(
          raw,
        );
    } catch {
      return json(
        {
          status:
            "error",

          message:
            "JSON inválido",
        },
        400,
      );
    }


    if (
      typeof payload !==
        "object" ||
      payload === null ||
      Array.isArray(
        payload,
      )
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Petición inválida",
        },
        400,
      );
    }


    const {
      code,
      device_token,
      registration,
    } =
      payload;


    // -----------------------------------------------------------------
    // 6. Validar código
    // -----------------------------------------------------------------

    if (
      typeof code !==
        "string" ||
      !CODE_RE.test(
        code,
      )
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Código inválido",
        },
        400,
      );
    }


    // -----------------------------------------------------------------
    // 7. Validar dispositivo
    // -----------------------------------------------------------------

    if (
      typeof device_token !==
        "string" ||
      !TOKEN_RE.test(
        device_token,
      )
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Dispositivo inválido",
        },
        400,
      );
    }


    // -----------------------------------------------------------------
    // 8. Validar registro
    // -----------------------------------------------------------------

    if (
      registration !==
        undefined &&
      (
        typeof registration !==
          "object" ||
        registration ===
          null ||
        Array.isArray(
          registration,
        )
      )
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Registro inválido",
        },
        400,
      );
    }


    // -----------------------------------------------------------------
    // 9. Supabase interno
    // -----------------------------------------------------------------

    const supabase =
      createClient(
        Deno.env.get(
          "SUPABASE_URL",
        )!,

        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        )!,
      );


    // -----------------------------------------------------------------
    // 10. Rate limits generales
    // -----------------------------------------------------------------

    const ipKey =
      await hashedIp(
        req,
      );


    const withinLimits =
      (
        await allow(
          supabase,

          `ip:${ipKey}`,

          LIMITS
            .ipPerMinute,

          60,
        )
      ) &&
      (
        await allow(
          supabase,

          `dev:${device_token}`,

          LIMITS
            .devicePerMinute,

          60,
        )
      );


    if (
      !withinLimits
    ) {
      return json(
        {
          status:
            "error",

          message:
            "Demasiados intentos. Espera un momento e intenta de nuevo.",
        },
        429,
      );
    }


    // -----------------------------------------------------------------
    // 11. Tag
    // -----------------------------------------------------------------

    const {
      data:
        tag,

      error:
        tagError,
    } =
      await supabase
        .from(
          "tags",
        )
        .select(
          `
          id,
          business_id,
          action_type,
          action_config,
          active
          `,
        )
        .eq(
          "code",
          code,
        )
        .maybeSingle();


    if (
      tagError
    ) {
      console.error(
        "tag lookup:",
        tagError.message,
      );


      return json(
        {
          status:
            "error",

          message:
            "No pudimos consultar el código",
        },
        500,
      );
    }


    if (
      !tag ||
      !tag.active
    ) {
      return json(
        {
          status:
            "not_found",
        },
        404,
      );
    }


    // -----------------------------------------------------------------
    // 12. Negocio
    // -----------------------------------------------------------------

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
        .select(
          `
          id,
          name,
          logo_url,
          brand_color,
          google_review_url,
          settings
          `,
        )
        .eq(
          "id",
          tag.business_id,
        )
        .single();


    if (
      businessError ||
      !business
    ) {
      console.error(
        "business lookup:",
        businessError
          ?.message,
      );


      return json(
        {
          status:
            "error",

          message:
            "No pudimos consultar el negocio",
        },
        500,
      );
    }


    const brand = {
      name:
        business.name,

      logo_url:
        business.logo_url,

      brand_color:
        business.brand_color,

      stamps_required:
        business.settings
          ?.stamps_required,
    };


    // -----------------------------------------------------------------
    // 13. Acciones que no requieren cliente
    // -----------------------------------------------------------------

    if (
      tag.action_type ===
        "link" ||
      tag.action_type ===
        "menu"
    ) {
      const url =
        tag.action_config
          ?.url;


      if (url) {
        return json({
          status:
            "redirect",

          url,

          business:
            brand,
        });
      }
    }


    if (
      tag.action_type ===
        "review" &&
      business
        .google_review_url
    ) {
      return json({
        status:
          "redirect",

        url:
          business
            .google_review_url,

        business:
          brand,
      });
    }


    // -----------------------------------------------------------------
    // 14. Primero identificar por dispositivo
    // -----------------------------------------------------------------

    let {
      data:
        customer,

      error:
        deviceCustomerError,
    } =
      await supabase
        .from(
          "customers",
        )
        .select(
          `
          id,
          name
          `,
        )
        .eq(
          "business_id",
          business.id,
        )
        .eq(
          "device_token",
          device_token,
        )
        .maybeSingle();


    if (
      deviceCustomerError
    ) {
      console.error(
        "customer device lookup:",
        deviceCustomerError
          .message,
      );


      return json(
        {
          status:
            "error",

          message:
            "No pudimos consultar tu cuenta",
        },
        500,
      );
    }


    // =================================================================
    // 15. SI EL DISPOSITIVO NO ESTÁ VINCULADO
    // =================================================================

    if (
      !customer
    ) {
      // ---------------------------------------------------------------
      // Todavía no envió formulario
      // ---------------------------------------------------------------

      if (
        !registration
      ) {
        return json({
          status:
            "needs_registration",

          business:
            brand,

          consent_text:
            CONSENT_TEXT,
        });
      }


      // ---------------------------------------------------------------
      // Validar formulario
      // ---------------------------------------------------------------

      let name:
        string;

      let cedula:
        string;

      let birthday:
        string | null;


      try {
        name =
          cleanName(
            registration
              .name,
          );


        cedula =
          cleanCedula(
            registration
              .cedula,
          );


        birthday =
          cleanBirthday(
            registration
              .birthday,
          );
      } catch (
        error
      ) {
        if (
          error instanceof
          ValidationError
        ) {
          return json(
            {
              status:
                "error",

              message:
                error.message,
            },
            400,
          );
        }


        throw error;
      }


      const whatsapp =
        typeof registration
          .whatsapp ===
          "string"
          ? normalizeWhatsapp(
              registration
                .whatsapp,
            )
          : null;


      if (
        !whatsapp
      ) {
        return json(
          {
            status:
              "error",

            message:
              "Revisa tu número de WhatsApp",
          },
          400,
        );
      }


      if (
        registration
          .consent !==
        true
      ) {
        return json(
          {
            status:
              "error",

            message:
              "Debes aceptar el tratamiento de datos",
          },
          400,
        );
      }


      // ---------------------------------------------------------------
      // 16. Buscar cliente existente por cédula
      // ---------------------------------------------------------------

      const {
        data:
          existingCustomer,

        error:
          existingCustomerError,
      } =
        await supabase
          .from(
            "customers",
          )
          .select(
            `
            id,
            name,
            whatsapp,
            birthday
            `,
          )
          .eq(
            "business_id",
            business.id,
          )
          .eq(
            "cedula",
            cedula,
          )
          .maybeSingle();


      if (
        existingCustomerError
      ) {
        console.error(
          "customer cedula lookup:",
          existingCustomerError
            .message,
        );


        return json(
          {
            status:
              "error",

            message:
              "No pudimos consultar tu registro",
          },
          500,
        );
      }


      // ===============================================================
      // 17. LA CÉDULA YA EXISTE
      // ===============================================================

      if (
        existingCustomer
      ) {
        // La cédula sola no es suficiente para
        // tomar control de una tarjeta existente.
        if (
          existingCustomer
            .whatsapp !==
          whatsapp
        ) {
          return json(
            {
              status:
                "error",

              message:
                "Esta cédula ya está registrada. Usa el mismo número de WhatsApp asociado a tu cuenta.",
            },
            409,
          );
        }


        // Liberar este dispositivo de cualquier
        // otra cuenta del mismo negocio.
        const {
          error:
            releaseError,
        } =
          await supabase
            .from(
              "customers",
            )
            .update({
              device_token:
                null,
            })
            .eq(
              "business_id",
              business.id,
            )
            .eq(
              "device_token",
              device_token,
            )
            .neq(
              "id",
              existingCustomer
                .id,
            );


        if (
          releaseError
        ) {
          console.error(
            "release device:",
            releaseError
              .message,
          );
        }


        const updateData:
          Record<
            string,
            unknown
          > = {
            name,

            whatsapp,

            consent_at:
              new Date()
                .toISOString(),

            consent_text:
              CONSENT_TEXT,

            device_token,
        };


        // Si el usuario introduce cumpleaños,
        // lo actualizamos. Si lo deja vacío,
        // conservamos el anterior.
        if (
          birthday
        ) {
          updateData
            .birthday =
            birthday;
        }


        const {
          data:
            linkedCustomer,

          error:
            linkError,
        } =
          await supabase
            .from(
              "customers",
            )
            .update(
              updateData,
            )
            .eq(
              "id",
              existingCustomer
                .id,
            )
            .eq(
              "business_id",
              business.id,
            )
            .select(
              `
              id,
              name
              `,
            )
            .single();


        if (
          linkError ||
          !linkedCustomer
        ) {
          console.error(
            "link existing customer:",
            linkError?.message,
          );


          return json(
            {
              status:
                "error",

              message:
                "No pudimos vincular tu tarjeta a este dispositivo",
            },
            500,
          );
        }


        customer =
          linkedCustomer;
      } else {
        // =============================================================
        // 18. CLIENTE REALMENTE NUEVO
        // =============================================================

        const maxNew =
          Number(
            business.settings
              ?.max_new_customers_per_hour ??
            LIMITS
              .defaultNewCustomersPerBusinessHour,
          );


        if (
          !(
            await allow(
              supabase,

              `reg:ip:${ipKey}`,

              LIMITS
                .registrationsPerIpHour,

              3600,
            )
          )
        ) {
          return json(
            {
              status:
                "error",

              message:
                "Demasiados registros desde esta conexión. Intenta más tarde.",
            },
            429,
          );
        }


        if (
          !(
            await allow(
              supabase,

              `reg:biz:${business.id}`,

              maxNew,

              3600,
            )
          )
        ) {
          return json(
            {
              status:
                "error",

              message:
                "Hay muchos registros en este momento. Intenta en un rato.",
            },
            429,
          );
        }


        // -------------------------------------------------------------
        // Liberar el dispositivo de otra cuenta
        // -------------------------------------------------------------

        await supabase
          .from(
            "customers",
          )
          .update({
            device_token:
              null,
          })
          .eq(
            "business_id",
            business.id,
          )
          .eq(
            "device_token",
            device_token,
          );


        // -------------------------------------------------------------
        // Crear cliente usando cédula como identidad
        // -------------------------------------------------------------

        const {
          data:
            saved,

          error:
            saveError,
        } =
          await supabase
            .from(
              "customers",
            )
            .upsert(
              {
                business_id:
                  business.id,

                name,

                cedula,

                whatsapp,

                birthday,

                consent_at:
                  new Date()
                    .toISOString(),

                consent_text:
                  CONSENT_TEXT,

                device_token,
              },
              {
                onConflict:
                  "business_id,cedula",
              },
            )
            .select(
              `
              id,
              name
              `,
            )
            .single();


        if (
          saveError ||
          !saved
        ) {
          console.error(
            "customer save:",
            saveError?.message,
          );


          if (
            saveError?.code ===
            "23505"
          ) {
            return json(
              {
                status:
                  "error",

                message:
                  "La cédula o el WhatsApp ya están registrados en este negocio.",
              },
              409,
            );
          }


          return json(
            {
              status:
                "error",

              message:
                "No pudimos registrarte",
            },
            500,
          );
        }


        customer =
          saved;
      }
    }


    // -----------------------------------------------------------------
    // 19. Registrar visita
    // -----------------------------------------------------------------

    const {
      data:
        result,

      error:
        rpcError,
    } =
      await supabase.rpc(
        "register_visit",
        {
          p_tag_code:
            code,

          p_customer_id:
            customer.id,
        },
      );


    if (
      rpcError
    ) {
      console.error(
        "register_visit:",
        rpcError.message,
      );


      return json(
        {
          status:
            "error",

          message:
            "No pudimos sumar tu sello",
        },
        500,
      );
    }


    if (
      !result?.ok
    ) {
      if (
        result?.reason ===
        "too_soon"
      ) {
        return json({
          status:
            "too_soon",

          customer: {
            name:
              customer.name,
          },

          stamps:
            result.stamps,

          required:
            result.required ??
            brand
              .stamps_required,

          reward_earned:
            result
              .reward_earned ??
            false,

          business:
            brand,
        });
      }


      return json(
        {
          status:
            "error",

          message:
            "No pudimos sumar tu sello",
        },
        400,
      );
    }


    // -----------------------------------------------------------------
    // 20. Programar mensaje de reseña
    // -----------------------------------------------------------------

    const {
      data:
        reviewModule,
    } =
      await supabase
        .from(
          "business_modules",
        )
        .select(
          "enabled",
        )
        .eq(
          "business_id",
          business.id,
        )
        .eq(
          "module",
          "reviews",
        )
        .maybeSingle();


    if (
      reviewModule
        ?.enabled
    ) {
      const delayMin =
        business.settings
          ?.review_delay_minutes ??
        60;


      const {
        error:
          messageError,
      } =
        await supabase
          .from(
            "messages",
          )
          .insert({
            business_id:
              business.id,

            customer_id:
              customer.id,

            type:
              "review_request",

            send_at:
              new Date(
                Date.now() +
                  delayMin *
                    60_000,
              )
                .toISOString(),
          });


      if (
        messageError
      ) {
        console.error(
          "review message:",
          messageError
            .message,
        );
      }
    }


    // -----------------------------------------------------------------
    // 21. Respuesta
    // -----------------------------------------------------------------

    return json({
      status:
        "registered_ok",

      customer: {
        name:
          customer.name,
      },

      stamps:
        result.stamps,

      required:
        result.required,

      reward_earned:
        result.reward_earned ??
        false,

      business:
        brand,
    });
  },
);
