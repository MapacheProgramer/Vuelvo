import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../hooks/useAuth.js";


export default function PlatformAdminRoute({
  children,
}) {
  const {
    loading,
    isAuthenticated,
    isPlatformAdmin,
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
  // NO ES ADMINISTRADOR DE VUELVO
  // =========================================================

  if (
    !isPlatformAdmin
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }


  // =========================================================
  // ADMINISTRADOR AUTORIZADO
  // =========================================================

  return children;
}
