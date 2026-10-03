import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import TagPage from "../pages/public/TagPage.jsx";
import CardPage from "../pages/public/CardPage.jsx";

import LoginPage from "../pages/auth/LoginPage.jsx";

import DashboardPage from "../pages/dashboard/DashboardPage.jsx";
import CustomersPage from "../pages/dashboard/CustomersPage.jsx";
import RewardsPage from "../pages/dashboard/RewardsPage.jsx";
import CatalogPage from "../pages/dashboard/CatalogPage.jsx";

import ProtectedRoute from "../features/auth/components/ProtectedRoute.jsx";


export default function AppRouter() {
  return (
    <Routes>

      {/* =====================================================
          INICIO
          ===================================================== */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />


      {/* =====================================================
          AUTENTICACIÓN
          ===================================================== */}

      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />


      {/* =====================================================
          RUTAS PÚBLICAS
          ===================================================== */}

      <Route
        path="/t/:code"
        element={
          <TagPage />
        }
      />


      <Route
        path="/card/:code"
        element={
          <CardPage />
        }
      />


      {/* =====================================================
          DASHBOARD
          ===================================================== */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          CLIENTES
          ===================================================== */}

      <Route
        path="/dashboard/clientes"
        element={
          <ProtectedRoute>
            <CustomersPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          RECOMPENSAS
          ===================================================== */}

      <Route
        path="/dashboard/recompensas"
        element={
          <ProtectedRoute>
            <RewardsPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          CATÁLOGO
          ===================================================== */}

      <Route
        path="/dashboard/catalogo"
        element={
          <ProtectedRoute>
            <CatalogPage />
          </ProtectedRoute>
        }
      />


      {/* =====================================================
          RUTA NO ENCONTRADA
          ===================================================== */}

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