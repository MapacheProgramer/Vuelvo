import {
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "../../features/auth/hooks/useAuth.js";

import {
  getDashboardData,
} from "../../features/dashboard/api/dashboardApi.js";

import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout.jsx";
import StatCard from "../../components/ui/StatCard/StatCard.jsx";

import "./DashboardPage.css";

export default function DashboardPage() {
  const {
    businessId,
    user,
    role,
  } = useAuth();

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const result =
          await getDashboardData(
            businessId,
          );

        if (!cancelled) {
          setData(result);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setError(
            error.message ||
              "No pudimos cargar el dashboard.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (businessId) {
      loadDashboard();
    }

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="dashboard-state">
          <p className="eyebrow">
            VUELVO
          </p>

          <h1>
            CARGANDO PANEL...
          </h1>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="dashboard-state">
          <p className="eyebrow">
            ERROR
          </p>

          <h1>
            NO PUDIMOS CARGAR
            EL PANEL
          </h1>

          <p>
            {error}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const {
    business,
    stats,
    recentCustomers,
  } = data;

  return (
    <DashboardLayout>

      <section className="dashboard-hero">

        <div>
          <p className="eyebrow">
            PANEL DEL NEGOCIO
          </p>

          <h1>
            {business.name}
          </h1>

          <p className="dashboard-intro">
            Resumen de actividad,
            clientes y recompensas.
          </p>
        </div>

        <div className="dashboard-user">
          <span>
            {role === "owner"
              ? "PROPIETARIO"
              : "STAFF"}
          </span>

          <strong>
            {user?.email}
          </strong>
        </div>

      </section>

      <section className="dashboard-stats">

        <StatCard
          value={stats.customers}
          label="Clientes"
        />

        <StatCard
          value={stats.visits}
          label="Visitas"
        />

        <StatCard
          value={
            stats.pendingRewards
          }
          label="Recompensas pendientes"
          emphasis={
            stats.pendingRewards > 0
          }
        />

      </section>

      <section className="dashboard-section">

        <div className="dashboard-section__heading">

          <div>
            <p className="eyebrow">
              ACTIVIDAD
            </p>

            <h2>
              CLIENTES RECIENTES
            </h2>
          </div>

          <button
            className="dashboard-link"
            type="button"
          >
            VER TODOS
          </button>

        </div>

        {recentCustomers.length === 0 ? (
          <div className="dashboard-empty">
            <strong>
              TODAVÍA NO HAY CLIENTES
            </strong>

            <p>
              Los clientes aparecerán
              aquí después de registrarse.
            </p>
          </div>
        ) : (
          <div className="customer-list">

            {recentCustomers.map(
              (customer) => (
                <article
                  className="customer-row"
                  key={customer.id}
                >

                  <div className="customer-row__identity">
                    <span className="customer-avatar">
                      {customer.name
                        ?.charAt(0)
                        .toUpperCase() ||
                        "?"}
                    </span>

                    <div>
                      <strong>
                        {customer.name}
                      </strong>

                      <span>
                        {customer.whatsapp ||
                          "Sin WhatsApp"}
                      </span>
                    </div>
                  </div>

                  <div className="customer-row__date">
                    <span>
                      REGISTRO
                    </span>

                    <strong>
                      {new Date(
                        customer.created_at,
                      ).toLocaleDateString(
                        "es-CO",
                      )}
                    </strong>
                  </div>

                </article>
              ),
            )}

          </div>
        )}

      </section>

    </DashboardLayout>
  );
}