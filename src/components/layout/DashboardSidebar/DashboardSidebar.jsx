import {
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../../features/auth/hooks/useAuth.js";

import "./DashboardSidebar.css";


const items = [
  {
    label:
      "Resumen",

    to:
      "/dashboard",

    end:
      true,
  },

  {
    label:
      "Clientes",

    to:
      "/dashboard/clientes",
  },

  {
    label:
      "Recompensas",

    to:
      "/dashboard/recompensas",
  },

  {
    label:
      "Catálogo",

    to:
      "/dashboard/catalogo",
  },

  {
    label:
      "Equipo",

    to:
      "/dashboard/equipo",
  },

  {
    label:
      "Negocio",

    to:
      "/dashboard/negocio",

    ownerOnly:
      true,
  },
];


export default function DashboardSidebar({
  open,
  onClose,
}) {
  const navigate =
    useNavigate();


  const {
    isOwner,
    role,
    signOut,
  } = useAuth();


  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);


  // =========================================================
  // FILTRAR OPCIONES SEGÚN ROL
  // =========================================================

  const visibleItems =
    items.filter(
      (
        item,
      ) => {
        if (
          item.ownerOnly &&
          !isOwner
        ) {
          return false;
        }


        return true;
      },
    );


  // =========================================================
  // CERRAR SESIÓN
  // =========================================================

  async function handleLogout() {
    if (
      loggingOut
    ) {
      return;
    }


    try {
      setLoggingOut(
        true,
      );


      await signOut();


      onClose?.();


      navigate(
        "/login",
        {
          replace:
            true,
        },
      );
    } catch (
      error
    ) {
      console.error(
        "Error cerrando sesión:",
        error,
      );


      alert(
        "No pudimos cerrar la sesión. Intenta nuevamente.",
      );
    } finally {
      setLoggingOut(
        false,
      );
    }
  }


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <aside
      className={
        `dashboard-sidebar${
          open
            ? " is-open"
            : ""
        }`
      }
    >

      {/* =====================================================
          MARCA
          ===================================================== */}

      <div className="dashboard-sidebar__brand">

        <span>
          VUELVO
        </span>


        <button
          className="dashboard-sidebar__close"
          type="button"
          onClick={
            onClose
          }
          aria-label="Cerrar menú"
        >
          ×
        </button>

      </div>


      {/* =====================================================
          NEGOCIO
          ===================================================== */}

      <div className="dashboard-sidebar__business">

        <span className="dashboard-sidebar__eyebrow">
          NEGOCIO
        </span>


        <strong>
          MOTO GARAGE
        </strong>


        {role && (
          <small>
            {role ===
            "owner"
              ? "PROPIETARIO"
              : "PERSONAL"}
          </small>
        )}

      </div>


      {/* =====================================================
          NAVEGACIÓN
          ===================================================== */}

      <nav
        className="dashboard-sidebar__nav"
        aria-label="Panel del negocio"
      >

        {visibleItems.map(
          (
            item,
          ) => (
            <NavLink
              key={
                item.to
              }
              to={
                item.to
              }
              end={
                item.end
              }
              onClick={
                onClose
              }
              className={({
                isActive,
              }) =>
                `dashboard-sidebar__link${
                  isActive
                    ? " is-active"
                    : ""
                }`
              }
            >
              {item.label}
            </NavLink>
          ),
        )}

      </nav>


      {/* =====================================================
          FOOTER
          ===================================================== */}

      <div className="dashboard-sidebar__footer">

        <button
          type="button"
          className="dashboard-sidebar__link"
          onClick={
            handleLogout
          }
          disabled={
            loggingOut
          }
        >
          {loggingOut
            ? "CERRANDO..."
            : "CERRAR SESIÓN"}
        </button>


        <span>
          VUELVO BUSINESS
        </span>


        <small>
          Panel de fidelización
        </small>

      </div>

    </aside>
  );
}