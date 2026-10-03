import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import BrandHeader from "../../components/layout/BrandHeader/BrandHeader";
import RegistrationForm from "../../components/loyalty/RegistrationForm/RegistrationForm";

import {
  registerVisit,
} from "../../features/loyalty/api/visitApi";

import {
  readLoyaltySnapshot,
  saveLoyaltySnapshot,
} from "../../features/loyalty/storage/loyaltyStorage";

import {
  getDeviceToken,
} from "../../hooks/useDeviceToken";

import "./public-pages.css";


function cacheProgress(
  code,
  data,
) {
  const cached =
    readLoyaltySnapshot(
      code,
    );


  saveLoyaltySnapshot(
    code,
    {
      business:
        data.business ??
        cached?.business,

      customerName:
        data.customer?.name ??
        cached?.customerName,

      stamps:
        data.stamps ??
        cached?.stamps,

      required:
        data.required ??
        data.business
          ?.stamps_required ??
        cached?.required,

      rewardEarned:
        data.reward_earned ??
        cached?.rewardEarned ??
        false,
    },
  );
}


export default function TagPage() {
  const {
    code,
  } = useParams();


  const navigate =
    useNavigate();


  const [
    state,
    setState,
  ] = useState({
    status:
      "loading",
  });


  const [
    form,
    setForm,
  ] = useState({
    name:
      "",

    cedula:
      "",

    whatsapp:
      "",

    birthday:
      "",

    consent:
      false,
  });


  const [
    submitting,
    setSubmitting,
  ] = useState(
    false,
  );


  const [
    error,
    setError,
  ] = useState(
    "",
  );


  // =========================================================
  // ENVIAR AL CLIENTE A SU TARJETA
  // =========================================================

  function goToCard(
    data,
  ) {
    cacheProgress(
      code,
      data,
    );


    navigate(
      `/card/${code}`,
      {
        replace:
          true,
      },
    );
  }


  // =========================================================
  // INTENTAR REGISTRAR VISITA AL ABRIR EL QR
  // =========================================================

  useEffect(() => {
    let cancelled =
      false;


    async function start() {
      try {
        const data =
          await registerVisit({
            code,

            device_token:
              getDeviceToken(),
          });


        if (
          cancelled
        ) {
          return;
        }


        if (
          data.status ===
          "redirect"
        ) {
          window.location.replace(
            data.url,
          );

          return;
        }


        if (
          data.status ===
          "registered_ok"
        ) {
          goToCard(
            data,
          );

          return;
        }


        if (
          data.status ===
          "too_soon"
        ) {
          goToCard(
            data,
          );

          return;
        }


        setState(
          data,
        );
      } catch (
        requestError
      ) {
        console.error(
          "visit:",
          requestError,
        );


        if (
          !cancelled
        ) {
          setState({
            status:
              "error",

            message:
              "No hay conexión. Intenta de nuevo.",
          });
        }
      }
    }


    start();


    return () => {
      cancelled =
        true;
    };
  }, [
    code,
    navigate,
  ]);


  // =========================================================
  // REGISTRO DE CLIENTE
  // =========================================================

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();


    setError(
      "",
    );

    setSubmitting(
      true,
    );


    try {
      const registration = {
        ...form,

        name:
          form.name.trim(),

        cedula:
          form.cedula.trim(),

        whatsapp:
          form.whatsapp.trim(),
      };


      const data =
        await registerVisit({
          code,

          device_token:
            getDeviceToken(),

          registration,
        });


      if (
        data.status ===
        "error"
      ) {
        setError(
          data.message ||
            "No pudimos registrarte.",
        );

        return;
      }


      if (
        data.status ===
          "registered_ok" ||
        data.status ===
          "too_soon"
      ) {
        goToCard(
          data,
        );

        return;
      }


      if (
        data.status ===
        "redirect"
      ) {
        window.location.replace(
          data.url,
        );

        return;
      }


      setState(
        data,
      );
    } catch (
      requestError
    ) {
      console.error(
        "registration:",
        requestError,
      );


      setError(
        "No hay conexión. Intenta de nuevo.",
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
    <main className="loyalty-page">

      <div className="loyalty-shell">

        <BrandHeader
          business={
            state.business
          }
        />


        <section className="loyalty-content">

          {state.status ===
            "loading" && (
            <LoadingState />
          )}


          {state.status ===
            "not_found" && (
            <SimpleState
              title="Código no disponible"
              text="Este código no está activo. Pídele al equipo que lo revise."
            />
          )}


          {state.status ===
            "error" && (
            <SimpleState
              title="Algo salió mal"
              text={
                state.message
              }
              error
            />
          )}


          {state.status ===
            "needs_registration" && (
            <Registration
              state={
                state
              }
              form={
                form
              }
              setForm={
                setForm
              }
              onSubmit={
                handleSubmit
              }
              submitting={
                submitting
              }
              error={
                error
              }
            />
          )}

        </section>

      </div>

    </main>
  );
}


// ===========================================================
// CARGANDO
// ===========================================================

function LoadingState() {
  return (
    <div className="status-box">

      <div
        className="loading-mark"
        aria-hidden="true"
      />


      <p className="eyebrow">
        Vuelvo
      </p>


      <h1 className="display-title">
        Registrando tu visita
      </h1>


      <p className="body-copy">
        En un momento verás tu tarjeta.
      </p>

    </div>
  );
}


// ===========================================================
// ESTADO SIMPLE
// ===========================================================

function SimpleState({
  title,
  text,
  error = false,
}) {
  return (
    <div className="status-box">

      <p className="eyebrow">
        Vuelvo
      </p>


      <h1 className="display-title">
        {title}
      </h1>


      <p
        className={`body-copy${
          error
            ? " error-text"
            : ""
        }`}
      >
        {text}
      </p>

    </div>
  );
}


// ===========================================================
// REGISTRO
// ===========================================================

function Registration({
  state,
  form,
  setForm,
  onSubmit,
  submitting,
  error,
}) {
  return (
    <>

      <p className="eyebrow">
        Tu tarjeta digital
      </p>


      <h1 className="display-title">
        Empieza a sumar sellos
      </h1>


      <p className="body-copy">
        Completa{" "}
        <strong>
          {
            state.business
              ?.stamps_required
          }
        </strong>{" "}
        sellos y desbloquea las recompensas
        disponibles de este negocio.
      </p>


      <RegistrationForm
        form={
          form
        }
        setForm={
          setForm
        }
        consentText={
          state.consent_text
        }
        onSubmit={
          onSubmit
        }
        submitting={
          submitting
        }
        error={
          error
        }
      />

    </>
  );
}