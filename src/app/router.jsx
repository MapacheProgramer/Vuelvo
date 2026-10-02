import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import TagPage from "../pages/public/TagPage.jsx";
import CardPage from "../pages/public/CardPage.jsx";
import LoginPage from "../pages/auth/LoginPage.jsx";
import DashboardPage from "../pages/dashboard/DashboardPage.jsx";

import ProtectedRoute from "../features/auth/components/ProtectedRoute.jsx";

export default function AppRouter() {
  return (
    <Routes>
      {/* Inicio */}
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* Autenticación */}
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* Rutas públicas del cliente */}

      {/* Escanear QR / registrar visita */}
      <Route
        path="/t/:code"
        element={<TagPage />}
      />

      {/* Consultar tarjeta sin sumar sello */}
      <Route
        path="/card/:code"
        element={<CardPage />}
      />

      {/* Panel del negocio */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Ruta inexistente */}
      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}