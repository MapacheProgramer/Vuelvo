import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import TagPage from "../pages/public/TagPage.jsx";
import CardPage from "../pages/public/CardPage.jsx";
import RecoveryPage from "../pages/public/RecoveryPage.jsx";

import LoginPage from "../pages/auth/LoginPage.jsx";
import InvitePage from "../pages/auth/InvitePage.jsx";

import DashboardPage from "../pages/dashboard/DashboardPage.jsx";
import CustomersPage from "../pages/dashboard/CustomersPage.jsx";
import CustomerDetailPage from "../pages/dashboard/CustomerDetailPage.jsx";
import RewardsPage from "../pages/dashboard/RewardsPage.jsx";
import CatalogPage from "../pages/dashboard/CatalogPage.jsx";
import TeamPage from "../pages/dashboard/TeamPage.jsx";
import BusinessPage from "../pages/dashboard/BusinessPage.jsx";

import AdminPage from "../pages/admin/AdminPage.jsx";
import AdminBusinessesPage from "../pages/admin/AdminBusinessesPage.jsx";
import AdminCreateBusinessPage from "../pages/admin/AdminCreateBusinessPage.jsx";
import AdminBusinessDetailPage from "../pages/admin/AdminBusinessDetailPage.jsx";
import AdminEditBusinessPage from "../pages/admin/AdminEditBusinessPage.jsx";

import ProtectedRoute from "../features/auth/components/ProtectedRoute.jsx";
import OwnerOnlyRoute from "../features/auth/components/OwnerOnlyRoute.jsx";
import PlatformAdminRoute from "../features/auth/components/PlatformAdminRoute.jsx";


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
        path="/recuperar/:businessId"
        element={
          <RecoveryPage />
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
        path="/admin"
        element={
          <PlatformAdminRoute>
            <AdminPage />
          </PlatformAdminRoute>
        }
      />


      <Route
        path="/admin/negocios"
        element={
          <PlatformAdminRoute>
            <AdminBusinessesPage />
          </PlatformAdminRoute>
        }
      />


      <Route
        path="/admin/negocios/nuevo"
        element={
          <PlatformAdminRoute>
            <AdminCreateBusinessPage />
          </PlatformAdminRoute>
        }
      />


      <Route
        path="/admin/negocios/:businessId"
        element={
          <PlatformAdminRoute>
            <AdminBusinessDetailPage />
          </PlatformAdminRoute>
        }
      />


      <Route
        path="/admin/negocios/:businessId/editar"
        element={
          <PlatformAdminRoute>
            <AdminEditBusinessPage />
          </PlatformAdminRoute>
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