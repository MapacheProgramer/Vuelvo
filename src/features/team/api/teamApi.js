import {
  supabase,
} from "../../../services/supabase.js";


// ===========================================================
// OBTENER EQUIPO DEL NEGOCIO
// ===========================================================

export async function getBusinessTeam(
  businessId,
) {
  if (!businessId) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_business_team",
      {
        p_business_id:
          businessId,
      },
    );


  if (error) {
    console.error(
      "get business team:",
      error,
    );


    throw new Error(
      error.message ||
        "No pudimos cargar el equipo.",
    );
  }


  return (
    Array.isArray(data)
      ? data
      : []
  );
}


// ===========================================================
// USUARIO AUTENTICADO ACTUAL
// ===========================================================

export async function getCurrentTeamUser() {
  const {
    data,
    error,
  } =
    await supabase.auth
      .getUser();


  if (
    error ||
    !data?.user
  ) {
    throw new Error(
      "No pudimos identificar tu cuenta.",
    );
  }


  return data.user;
}


// ===========================================================
// AGREGAR MIEMBRO
// ===========================================================

export async function addBusinessTeamMember({
  businessId,
  displayName,
  email,
}) {
  const cleanName =
    displayName
      ?.trim();


  const cleanEmail =
    email
      ?.trim()
      .toLowerCase();


  if (
    !businessId
  ) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }


  if (
    !cleanName
  ) {
    throw new Error(
      "Escribe el nombre del miembro.",
    );
  }


  if (
    !cleanEmail
  ) {
    throw new Error(
      "Escribe el correo electrónico.",
    );
  }


  const {
    data: {
      session,
    },
    error:
      sessionError,
  } =
    await supabase.auth
      .getSession();


  if (
    sessionError ||
    !session
  ) {
    throw new Error(
      "Tu sesión ya no es válida.",
    );
  }


  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        "add-team-member",
        {
          body: {
            business_id:
              businessId,

            display_name:
              cleanName,

            email:
              cleanEmail,
          },

          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        },
      );


  if (error) {
    console.error(
      "add team member:",
      error,
    );


    let message =
      "No pudimos agregar el miembro.";


    try {
      const context =
        error.context;


      if (
        context?.clone
      ) {
        const body =
          await context
            .clone()
            .json();


        if (
          body?.message
        ) {
          message =
            body.message;
        }
      }
    } catch {
      // Si no podemos leer la respuesta,
      // dejamos el mensaje general.
    }


    throw new Error(
      message,
    );
  }


  if (
    data?.status !==
    "ok"
  ) {
    throw new Error(
      data?.message ||
        "No pudimos agregar el miembro.",
    );
  }


  return data;
}


// ===========================================================
// ELIMINAR MIEMBRO
// ===========================================================

export async function removeBusinessTeamMember({
  businessId,
  userId,
}) {
  if (
    !businessId
  ) {
    throw new Error(
      "No se encontró el negocio.",
    );
  }


  if (
    !userId
  ) {
    throw new Error(
      "No se encontró el miembro.",
    );
  }


  const {
    data: {
      session,
    },
    error:
      sessionError,
  } =
    await supabase.auth
      .getSession();


  if (
    sessionError ||
    !session
  ) {
    throw new Error(
      "Tu sesión ya no es válida.",
    );
  }


  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        "remove-team-member",
        {
          body: {
            business_id:
              businessId,

            user_id:
              userId,
          },

          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        },
      );


  if (error) {
    console.error(
      "remove team member:",
      error,
    );


    let message =
      "No pudimos eliminar el miembro.";


    try {
      const context =
        error.context;


      if (
        context?.clone
      ) {
        const body =
          await context
            .clone()
            .json();


        if (
          body?.message
        ) {
          message =
            body.message;
        }
      }
    } catch {
      // Dejamos el mensaje general.
    }


    throw new Error(
      message,
    );
  }


  if (
    data?.status !==
    "ok"
  ) {
    throw new Error(
      data?.message ||
        "No pudimos eliminar el miembro.",
    );
  }


  return data;
}