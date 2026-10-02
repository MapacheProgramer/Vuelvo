import {
  useState,
} from "react";

import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../features/auth/hooks/useAuth.js";

import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    signIn,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  if (
    !authLoading &&
    isAuthenticated
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await signIn(
        email.trim(),
        password,
      );

      const destination =
        location.state?.from ||
        "/dashboard";

      navigate(
        destination,
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(error);

      if (
        error.message ===
        "Invalid login credentials"
      ) {
        setError(
          "Correo o contraseña incorrectos.",
        );
      } else {
        setError(
          error.message ||
          "No pudimos iniciar sesión.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">

      <section className="login-brand">
        <div>
          <p className="login-brand__eyebrow">
            VUELVO
          </p>

          <h1>
            CLIENTES QUE
            <br />
            VUELVEN.
          </h1>

          <p>
            Gestiona clientes, sellos y
            recompensas desde un solo lugar.
          </p>
        </div>
      </section>

      <section className="login-panel">

        <div className="login-box">

          <div className="login-box__heading">
            <p className="eyebrow">
              ACCESO NEGOCIOS
            </p>

            <h2>
              INICIAR SESIÓN
            </h2>

            <p>
              Ingresa con la cuenta asociada
              a tu negocio.
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >

            <label>
              CORREO

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="correo@negocio.com"
                autoComplete="email"
                required
              />
            </label>

            <label>
              CONTRASEÑA

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            {error && (
              <div
                className="login-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "ENTRANDO..."
                : "ENTRAR"}
            </button>

          </form>

        </div>

      </section>

    </main>
  );
}