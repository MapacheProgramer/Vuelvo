import ThemeToggle from "../../ui/ThemeToggle/ThemeToggle";
import "./DashboardHeader.css";

export default function DashboardHeader({
  onMenu,
  businessName,
  accountName,
  role,
}) {
  const initials = accountName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase("es-CO"))
    .join("") || "U";

  return (
    <header className="dashboard-header">
      <button
        className="dashboard-header__menu"
        type="button"
        onClick={onMenu}
        aria-label="Abrir menú"
      >
        <span />
        <span />
        <span />
      </button>

      <div className="dashboard-header__context">
        <span>
          Panel del negocio
        </span>

        <strong>
          {businessName}
        </strong>
      </div>

      <div className="dashboard-header__actions">
        <ThemeToggle />

        <button
          className="dashboard-header__account"
          type="button"
        >
          <span
            className="dashboard-header__avatar"
            aria-hidden="true"
          >
            {initials}
          </span>

          <span className="dashboard-header__account-copy">
            <strong>
              {accountName}
            </strong>

            <small>
              {role === "owner" ? "Propietario" : role === "staff" ? "Personal" : "Usuario"}
            </small>
          </span>
        </button>
      </div>
    </header>
  );
}