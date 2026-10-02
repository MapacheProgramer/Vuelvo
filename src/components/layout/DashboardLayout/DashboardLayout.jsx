import { useState } from "react";
import DashboardHeader from "../DashboardHeader/DashboardHeader";
import DashboardSidebar from "../DashboardSidebar/DashboardSidebar";
import "./DashboardLayout.css";

export default function DashboardLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="dashboard-shell">
      <DashboardSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      {menuOpen && (
        <button
          className="dashboard-backdrop"
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="dashboard-workspace">
        <DashboardHeader onMenu={() => setMenuOpen(true)} />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
