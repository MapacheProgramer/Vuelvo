import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../hooks/useAuth.js";


export default function OwnerOnlyRoute({
  children,
}) {
  const {
    loading,
    isAuthenticated,
    isOwner,
    needsOnboarding,
  } = useAuth();


  const location =
    useLocation();


  // =========================================================
  // CARGANDO
  // =========================================================

  if (
    loading
  ) {
    return (
      <main className="auth-loading">

        <p>
          CARGANDO...
        </p>

      </main>
    );
  }


  // =========================================================
  // SIN SESIÓN
  // =========================================================

  if (
    !isAuthenticated
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }


  // =========================================================
  // STAFF PENDIENTE DE ACTIVACIÓN
  // =========================================================

  if (
    needsOnboarding
  ) {
    return (
      <Navigate
        to="/invite"
        replace
      />
    );
  }


  // =========================================================
  // NO ES OWNER
  // =========================================================

  if (
    !isOwner
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  // =========================================================
  // OWNER AUTORIZADO
  // =========================================================

  return children;
}