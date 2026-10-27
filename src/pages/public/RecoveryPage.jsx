
import {
  useState,
  useRef,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  supabase,
} from "../../services/supabase.js";

import {
  getDeviceToken,
} from "../../hooks/useDeviceToken.js";

import "./public-pages.css";


const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TOKEN_RE =
  /^[0-9a-f]{64}$/;


export default function RecoveryPage() {
  const {
    businessId,
  } = useParams();

  const [
    token,
  ] = useState(
    () => window.location.hash.slice(1),
  );

  const [
    status,
    setStatus,
  ] = useState("ready");

  const [
    message,
    setMessage,
  ] = useState("");

  const processing =
    useRef(false);

  const validLink =
    UUID_RE.test(businessId ?? "") &&
    TOKEN_RE.test(token);


  async function handleRecovery() {
    if (
      !validLink ||
      processing.current
    ) {
      return;
    }

    processing.current = true;
    setStatus("loading");
    setMessage("");

    try {
      const deviceToken =
        getDeviceToken();

      // La tarjeta necesita un token persistente.
      if (
        !deviceToken ||
        getDeviceToken({
          create: false,
        }) !== deviceToken
      ) {
        throw new Error(
          "El navegador debe permitir almacenamiento local.",
        );
      }

      const {
        data,
        error,
      } = await supabase.rpc(
        "use_customer_recovery",
        {
          p_business_id: businessId,
          p_token: token,
          p_device_token: deviceToken,
        },
      );

      if (error) {
        throw error;
      }

      if (data !== true) {
        setStatus("error");
        setMessage(
          "El enlace no es válido, ya fue utilizado o caducó. Solicita uno nuevo al negocio.",
        );
        return;
      }

      // Eliminar el código de la barra de direcciones.
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname +
          window.location.search,
      );

      setStatus("success");
    } catch (recoveryError) {
      console.error(
        "card recovery:",
        recoveryError,
      );

      setStatus("error");
      setMessage(
        "No pudimos recuperar tu tarjeta. Comprueba que este navegador permita guardar datos y solicita ayuda al negocio.",
      );
    } finally {
      processing.current = false;
    }
  }


  return (
    <main className="loyalty-page">
      <div className="loyalty-shell">
        <section className="loyalty-content">
          <div className="status-box">

            <p className="eyebrow">
              VUELVO
            </p>

            {status === "success" ? (
              <>
                <h1 className="display-title">
                  TARJETA RECUPERADA
                </h1>

                <p className="body-copy">
                  Tu tarjeta ya está vinculada
                  a este dispositivo.
                  Conservas tus sellos y recompensas.
                </p>

                <p className="body-copy">
                  Escanea nuevamente el QR
                  del negocio para abrir tu tarjeta.
                </p>
              </>
            ) : (
              <>
                <h1 className="display-title">
                  RECUPERAR TARJETA
                </h1>

                <p className="body-copy">
                  Vincula tu tarjeta Vuelvo
                  a este dispositivo.
                </p>

                <p className="body-copy">
                  Al confirmar, el dispositivo
                  anterior dejará de tener acceso
                  a esta tarjeta.
                </p>

                {!validLink ? (
                  <p className="body-copy error-text">
                    El enlace de recuperación
                    no es válido.
                    Solicita uno nuevo al negocio.
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={
                        status === "loading" ||
                        status === "success"
                      }
                      onClick={handleRecovery}
                      style={{
                        padding: "14px 20px",
                        border: "none",
                        borderRadius: "10px",
                        background: "#f05a28",
                        color: "#ffffff",
                        fontWeight: 800,
                        cursor:
                          status === "loading"
                            ? "wait"
                            : "pointer",
                        opacity:
                          status === "loading"
                            ? 0.7
                            : 1,
                      }}
                    >
                      {status === "loading"
                        ? "RECUPERANDO..."
                        : "RECUPERAR MI TARJETA"}
                    </button>

                    {message && (
                      <p
                        className="body-copy error-text"
                        role="alert"
                      >
                        {message}
                      </p>
                    )}
                  </>
                )}
              </>
            )}

          </div>
        </section>
      </div>
    </main>
  );
}
