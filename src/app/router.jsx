import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import TagPage from "../pages/public/TagPage.jsx";
import CardPage from "../pages/public/CardPage.jsx";

import LoginPage from "../pages/auth/LoginPage.jsx";
import InvitePage from "../pages/auth/InvitePage.jsx";

import DashboardPage from "../pages/dashboard/DashboardPage.jsx";
import CustomersPage from "../pages/dashboard/CustomersPage.jsx";
import CustomerDetailPage from "../pages/dashboard/CustomerDetailPage.jsx";
import RewardsPage from "../pages/dashboard/RewardsPage.jsx";
import CatalogPage from "../pages/dashboard/CatalogPage.jsx";
import TeamPage from "../pages/dashboard/TeamPage.jsx";
import BusinessPage from "../pages/dashboard/BusinessPage.jsx";

import ProtectedRoute from "../features/auth/components/ProtectedRoute.jsx";
import OwnerOnlyRoute from "../features/auth/components/OwnerOnlyRoute.jsx";


export default function AppRouter() {
  return (
    <Routes>

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />


      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />


      <Route
        path="/invite"
        element={
          <InvitePage />
        }
      />


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


      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/dashboard/clientes"
        element={
          <ProtectedRoute>
            <CustomersPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/dashboard/clientes/:customerId"
        element={
          <ProtectedRoute>
            <CustomerDetailPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/dashboard/recompensas"
        element={
          <ProtectedRoute>
            <RewardsPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/dashboard/catalogo"
        element={
          <ProtectedRoute>
            <CatalogPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/dashboard/equipo"
        element={
          <ProtectedRoute>
            <TeamPage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/dashboard/negocio"
        element={
          <OwnerOnlyRoute>
            <BusinessPage />
          </OwnerOnlyRoute>
        }
      />


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