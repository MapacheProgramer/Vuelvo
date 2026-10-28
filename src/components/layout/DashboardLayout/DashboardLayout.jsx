import { useEffect, useState } from "react";
import { supabase } from "../../../services/supabase.js";
import { useAuth } from "../../../features/auth/hooks/useAuth.js";
import DashboardHeader from "../DashboardHeader/DashboardHeader";
import DashboardSidebar from "../DashboardSidebar/DashboardSidebar";
import "./DashboardLayout.css";

export default function DashboardLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { businessId, membership, user, role } = useAuth();
  const [currentBusiness, setCurrentBusiness] = useState(null);

  useEffect(() => {
    if (!businessId) return undefined;

    let active = true;
    supabase
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error cargando nombre del negocio:", error);
        }
        setCurrentBusiness({
          id: businessId,
          name: error ? "Negocio no disponible" : (data?.name || "Negocio sin nombre"),
        });
      });

    return () => { active = false; };
  }, [businessId]);

  const businessName = currentBusiness?.id === businessId
    ? currentBusiness.name
    : "Cargando negocio...";
  const accountName =
    membership?.display_name?.trim() ||
    user?.user_metadata?.display_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email ||
    "Usuario";

  return (
    <div className="dashboard-shell">
      <DashboardSidebar open={menuOpen} onClose={() => setMenuOpen(false)} businessName={businessName} />

      {menuOpen && (
        <button
          className="dashboard-backdrop"
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="dashboard-workspace">
        <DashboardHeader onMenu={() => setMenuOpen(true)} businessName={businessName} accountName={accountName} role={role} />
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  );
}
