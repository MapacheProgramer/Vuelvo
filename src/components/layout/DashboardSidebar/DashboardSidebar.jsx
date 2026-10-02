import { NavLink } from "react-router-dom";
import "./DashboardSidebar.css";

const items = [
  { label: "Resumen", to: "/dashboard", end: true },
  { label: "Clientes", to: "/dashboard/clientes" },
  { label: "Recompensas", to: "/dashboard/recompensas" },
  { label: "Catálogo", to: "/dashboard/catalogo" },
  { label: "Equipo", to: "/dashboard/equipo" },
  { label: "Negocio", to: "/dashboard/negocio" },
];

export default function DashboardSidebar({ open, onClose }) {
  return (
    <aside className={`dashboard-sidebar${open ? " is-open" : ""}`}>
      <div className="dashboard-sidebar__brand">
        <span>VUELVO</span>
        <button className="dashboard-sidebar__close" type="button" onClick={onClose} aria-label="Cerrar menú">
          ×
        </button>
      </div>

      <div className="dashboard-sidebar__business">
        <span className="dashboard-sidebar__eyebrow">NEGOCIO</span>
        <strong>MOTO GARAGE</strong>
      </div>

      <nav className="dashboard-sidebar__nav" aria-label="Panel del negocio">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `dashboard-sidebar__link${isActive ? " is-active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="dashboard-sidebar__footer">
        <span>VUELVO BUSINESS</span>
        <small>Panel de fidelización</small>
      </div>
    </aside>
  );
}
