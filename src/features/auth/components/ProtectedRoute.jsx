import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useAuth,
} from "../hooks/useAuth.js";

export default function ProtectedRoute({
  children,
}) {
  const {
    loading,
    isAuthenticated,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return (
      <main className="auth-loading">
        <p>CARGANDO...</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}