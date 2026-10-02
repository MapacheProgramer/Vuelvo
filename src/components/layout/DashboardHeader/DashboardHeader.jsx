import "./DashboardHeader.css";

export default function DashboardHeader({ onMenu }) {
  return (
    <header className="dashboard-header">
      <button className="dashboard-header__menu" type="button" onClick={onMenu} aria-label="Abrir menú">
        <span />
        <span />
        <span />
      </button>

      <div className="dashboard-header__context">
        <span>Panel del negocio</span>
        <strong>Moto Garage</strong>
      </div>

      <button className="dashboard-header__account" type="button">
        <span className="dashboard-header__avatar" aria-hidden="true">JS</span>
        <span className="dashboard-header__account-copy">
          <strong>José Sierra</strong>
          <small>Propietario</small>
        </span>
      </button>
    </header>
  );
}
