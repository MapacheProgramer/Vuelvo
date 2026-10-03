import {
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../../services/supabase.js";

import "./InvitePage.css";


export default function InvitePage() {
  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    ready,
    setReady,
  ] = useState(false);


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState(false);


  // =========================================================
  // VALIDAR SESIÓN CREADA POR LA INVITACIÓN
  // =========================================================

  useEffect(() => {
    let active =
      true;


    let validationFinished =
      false;


    function acceptSession(
      session,
    ) {
      if (
        !active ||
        !session?.user
      ) {
        return;
      }


      validationFinished =
        true;


      setReady(
        true,
      );


      setError(
        "",
      );


      setLoading(
        false,
      );
    }


    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            event,
            session,
          ) => {
            if (
              !active
            ) {
              return;
            }


            if (
              session &&
              (
                event ===
                  "SIGNED_IN" ||
                event ===
                  "INITIAL_SESSION" ||
                event ===
                  "TOKEN_REFRESHED"
              )
            ) {
              acceptSession(
                session,
              );
            }
          },
        );


    async function validateInvite() {
      try {
        const {
          data,
          error:
            sessionError,
        } =
          await supabase.auth
            .getSession();


        if (
          !active
        ) {
          return;
        }


        if (
          sessionError
        ) {
          throw sessionError;
        }


        if (
          data?.session
        ) {
          acceptSession(
            data.session,
          );

          return;
        }


        window.setTimeout(
          () => {
            if (
              !active ||
              validationFinished
            ) {
              return;
            }


            validationFinished =
              true;


            setReady(
              false,
            );


            setLoading(
              false,
            );


            setError(
              "No pudimos validar esta invitación.",
            );
          },
          4000,
        );
      } catch (
        validationError
      ) {
        console.error(
          "invite session:",
          validationError,
        );


        if (
          !active
        ) {
          return;
        }


        validationFinished =
          true;


        setReady(
          false,
        );


        setLoading(
          false,
        );


        setError(
          "No pudimos validar esta invitación.",
        );
      }
    }


    validateInvite();


    return () => {
      active =
        false;


      subscription
        .unsubscribe();
    };
  }, []);


  // =========================================================
  // CREAR CONTRASEÑA + COMPLETAR ONBOARDING
  // =========================================================

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();


    if (
      submitting
    ) {
      return;
    }


    setError(
      "",
    );


    if (
      password.length <
      8
    ) {
      setError(
        "La contraseña debe tener al menos 8 caracteres.",
      );

      return;
    }


    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Las contraseñas no coinciden.",
      );

      return;
    }


    try {
      setSubmitting(
        true,
      );


      // =====================================================
      // 1. COMPROBAR SESIÓN
      // =====================================================

      const {
        data:
          sessionData,

        error:
          sessionError,
      } =
        await supabase.auth
          .getSession();


      if (
        sessionError ||
        !sessionData?.session
      ) {
        throw new Error(
          "La sesión de invitación ya no es válida.",
        );
      }


      // =====================================================
      // 2. GUARDAR CONTRASEÑA
      // =====================================================

      const {
        data:
          updateData,

        error:
          updateError,
      } =
        await supabase.auth
          .updateUser({
            password,
          });


      if (
        updateError
      ) {
        throw updateError;
      }


      if (
        !updateData?.user
      ) {
        throw new Error(
          "No pudimos guardar la contraseña.",
        );
      }


      // =====================================================
      // 3. MARCAR ONBOARDING COMO COMPLETADO
      // =====================================================

      const {
        data:
          onboardingCompleted,

        error:
          onboardingError,
      } =
        await supabase.rpc(
          "complete_member_onboarding",
        );


      if (
        onboardingError
      ) {
        console.error(
          "complete onboarding:",
          onboardingError,
        );


        throw new Error(
          "La contraseña fue creada, pero no pudimos completar la activación de la cuenta.",
        );
      }


      if (
        onboardingCompleted !==
        true
      ) {
        throw new Error(
          "No pudimos completar la activación de la cuenta.",
        );
      }


      // =====================================================
      // 4. ÉXITO
      // =====================================================

      setPassword(
        "",
      );


      setConfirmPassword(
        "",
      );


      setSuccess(
        true,
      );


      // Usamos location.replace para recargar la aplicación.
      // Así AuthProvider volverá a consultar business_members
      // y tendremos el estado actualizado del usuario.
      window.setTimeout(
        () => {
          window.location.replace(
            "/dashboard",
          );
        },
        1200,
      );
    } catch (
      activationError
    ) {
      console.error(
        "invite activation:",
        activationError,
      );


      setError(
        activationError?.message ||
          "No pudimos activar la cuenta.",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }


  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="invite-page">

      <section className="invite-card">

        <p className="invite-card__eyebrow">
          VUELVO
        </p>


        <h1>
          ACTIVA TU CUENTA
        </h1>


        <p className="invite-card__intro">
          Crea una contraseña para acceder
          al panel del negocio.
        </p>


        {/* ===================================================
            VALIDANDO
            =================================================== */}

        {loading && (
          <div className="invite-state">

            <strong>
              VALIDANDO INVITACIÓN
            </strong>


            <p>
              Estamos preparando tu cuenta.
            </p>

          </div>
        )}


        {/* ===================================================
            INVITACIÓN INVÁLIDA
            =================================================== */}

        {!loading &&
          !ready &&
          !success && (
            <div className="invite-state invite-state--error">

              <strong>
                INVITACIÓN NO VÁLIDA
              </strong>


              <p>
                {error ||
                  "El enlace puede haber expirado o ya haber sido utilizado."}
              </p>

            </div>
          )}


        {/* ===================================================
            FORMULARIO
            =================================================== */}

        {!loading &&
          ready &&
          !success && (
            <form
              className="invite-form"
              onSubmit={
                handleSubmit
              }
            >

              <label>

                <span>
                  NUEVA CONTRASEÑA
                </span>


                <input
                  type="password"
                  value={
                    password
                  }
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  disabled={
                    submitting
                  }
                  onChange={(
                    event,
                  ) =>
                    setPassword(
                      event.target
                        .value,
                    )
                  }
                  required
                />

              </label>


              <label>

                <span>
                  CONFIRMAR CONTRASEÑA
                </span>


                <input
                  type="password"
                  value={
                    confirmPassword
                  }
                  autoComplete="new-password"
                  placeholder="Repite la contraseña"
                  minLength={8}
                  disabled={
                    submitting
                  }
                  onChange={(
                    event,
                  ) =>
                    setConfirmPassword(
                      event.target
                        .value,
                    )
                  }
                  required
                />

              </label>


              {error && (
                <p
                  className="invite-form__error"
                  role="alert"
                >
                  {error}
                </p>
              )}


              <button
                type="submit"
                className="invite-form__submit"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? "ACTIVANDO..."
                  : "ACTIVAR MI CUENTA"}
              </button>

            </form>
          )}


        {/* ===================================================
            ÉXITO
            =================================================== */}

        {success && (
          <div className="invite-state invite-state--success">

            <strong>
              CUENTA ACTIVADA
            </strong>


            <p>
              Tu contraseña fue creada correctamente.
              Entrando al panel...
            </p>

          </div>
        )}

      </section>

    </main>
  );
}