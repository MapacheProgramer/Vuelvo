import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout.jsx";

import {
  useAuth,
} from "../../features/auth/hooks/useAuth.js";

import {
  getBusinessCustomers,
} from "../../features/customers/api/customersApi.js";

import "./CustomersPage.css";


export default function CustomersPage() {
  const {
    businessId,
  } = useAuth();


  const [
    customers,
    setCustomers,
  ] = useState([]);


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  // =========================================================
  // CARGAR CLIENTES
  // =========================================================

  useEffect(() => {
    let cancelled = false;


    async function loadCustomers() {
      if (!businessId) {
        return;
      }


      setLoading(true);
      setError("");


      try {
        const data =
          await getBusinessCustomers(
            businessId,
          );


        if (cancelled) {
          return;
        }


        setCustomers(
          data,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }


        console.error(
          "customers:",
          error,
        );


        setError(
          error?.message ||
            "No pudimos cargar los clientes.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }


    loadCustomers();


    return () => {
      cancelled = true;
    };
  }, [
    businessId,
  ]);


  // =========================================================
  // FILTRO
  // =========================================================

  const filteredCustomers =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();


        if (!query) {
          return customers;
        }


        return customers.filter(
          (customer) => {
            const name =
              customer.name
                ?.toLowerCase() ||
              "";

            const whatsapp =
              customer.whatsapp
                ?.toLowerCase() ||
              "";


            return (
              name.includes(
                query,
              ) ||
              whatsapp.includes(
                query,
              )
            );
          },
        );
      },
      [
        customers,
        search,
      ],
    );


  // =========================================================
  // ESTADÍSTICAS
  // =========================================================

  const summary =
    useMemo(
      () => ({
        customers:
          customers.length,

        visits:
          customers.reduce(
            (
              total,
              customer,
            ) =>
              total +
              customer.stats
                .visits,
            0,
          ),

        rewards:
          customers.reduce(
            (
              total,
              customer,
            ) =>
              total +
              customer.stats
                .rewards,
            0,
          ),
      }),
      [
        customers,
      ],
    );


  return (
    <DashboardLayout>

      <section className="customers-page">

        {/* ===================================================
            HERO
            =================================================== */}

        <header className="customers-page__hero">

          <div>

            <p className="eyebrow">
              COMUNIDAD
            </p>


            <h1>
              CLIENTES
            </h1>


            <p className="customers-page__intro">
              Consulta el progreso, actividad y
              recompensas de tus clientes.
            </p>

          </div>

        </header>


        {/* ===================================================
            RESUMEN
            =================================================== */}

        {!loading &&
          !error && (
            <section className="customers-summary">

              <SummaryCard
                label="CLIENTES"
                value={
                  summary.customers
                }
              />


              <SummaryCard
                label="VISITAS"
                value={
                  summary.visits
                }
              />


              <SummaryCard
                label="RECOMPENSAS"
                value={
                  summary.rewards
                }
              />

            </section>
          )}


        {/* ===================================================
            LISTADO
            =================================================== */}

        <section className="customers-section">

          <div className="customers-section__heading">

            <div>

              <p className="eyebrow">
                DIRECTORIO
              </p>


              <h2>
                CLIENTES DEL NEGOCIO
              </h2>

            </div>


            <span className="customers-section__count">
              {filteredCustomers.length}{" "}
              {filteredCustomers.length ===
              1
                ? "CLIENTE"
                : "CLIENTES"}
            </span>

          </div>


          {/* =================================================
              BUSCADOR
              ================================================= */}

          {!loading &&
            !error &&
            customers.length >
              0 && (
              <div className="customer-search">

                <span
                  className="customer-search__icon"
                  aria-hidden="true"
                >
                  ⌕
                </span>


                <input
                  type="search"
                  value={
                    search
                  }
                  placeholder="Buscar por nombre o WhatsApp..."
                  aria-label="Buscar clientes"
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                />


                {search && (
                  <button
                    type="button"
                    className="customer-search__clear"
                    onClick={() =>
                      setSearch(
                        "",
                      )
                    }
                  >
                    LIMPIAR
                  </button>
                )}

              </div>
            )}


          {/* =================================================
              ESTADOS
              ================================================= */}

          {loading && (
            <StateBox
              title="CARGANDO CLIENTES..."
              text="Estamos consultando los clientes del negocio."
            />
          )}


          {!loading &&
            error && (
              <StateBox
                title="NO PUDIMOS CARGAR LOS CLIENTES"
                text={
                  error
                }
                error
              />
            )}


          {!loading &&
            !error &&
            customers.length ===
              0 && (
              <StateBox
                title="TODAVÍA NO HAY CLIENTES"
                text="Los clientes aparecerán aquí después de registrar su primera visita."
              />
            )}


          {!loading &&
            !error &&
            customers.length >
              0 &&
            filteredCustomers.length ===
              0 && (
              <StateBox
                title="NO ENCONTRAMOS RESULTADOS"
                text="Prueba con otro nombre o número de WhatsApp."
              />
            )}


          {/* =================================================
              CLIENTES
              ================================================= */}

          {!loading &&
            !error &&
            filteredCustomers.length >
              0 && (
              <div className="customers-list">

                {filteredCustomers.map(
                  (
                    customer,
                  ) => (
                    <CustomerRow
                      key={
                        customer.id
                      }
                      customer={
                        customer
                      }
                    />
                  ),
                )}

              </div>
            )}

        </section>

      </section>

    </DashboardLayout>
  );
}


// ===========================================================
// CLIENTE
// ===========================================================

function CustomerRow({
  customer,
}) {
  const {
    stats,
  } = customer;


  return (
    <article className="customer-entry">

      {/* =====================================================
          IDENTIDAD
          ===================================================== */}

      <div className="customer-entry__identity">

        <span className="customer-entry__avatar">
          {customer.name
            ?.charAt(0)
            .toUpperCase() ||
            "?"}
        </span>


        <div>

          <span className="customer-entry__label">
            CLIENTE
          </span>


          <strong>
            {customer.name ||
              "Cliente"}
          </strong>


          <small>
            {customer.whatsapp ||
              "Sin WhatsApp"}
          </small>

        </div>

      </div>


      {/* =====================================================
          SELLOS
          ===================================================== */}

      <CustomerMetric
        label="SELLOS ACTUALES"
        value={
          stats.currentStamps
        }
      />


      {/* =====================================================
          VISITAS
          ===================================================== */}

      <CustomerMetric
        label="VISITAS"
        value={
          stats.visits
        }
      />


      {/* =====================================================
          RECOMPENSAS
          ===================================================== */}

      <CustomerMetric
        label="RECOMPENSAS"
        value={
          stats.rewards
        }
        secondary={
          stats.pendingRewards >
          0
            ? `${stats.pendingRewards} pendiente${
                stats.pendingRewards ===
                1
                  ? ""
                  : "s"
              }`
            : null
        }
      />


      {/* =====================================================
          ÚLTIMA VISITA
          ===================================================== */}

      <div className="customer-entry__last">

        <span>
          ÚLTIMA VISITA
        </span>


        <strong>
          {stats.lastVisit
            ? formatDate(
                stats.lastVisit,
              )
            : "Sin visitas"}
        </strong>

      </div>


      {/* =====================================================
          ACCIÓN
          ===================================================== */}

      <button
        type="button"
        className="customer-entry__view"
      >
        VER CLIENTE
      </button>

    </article>
  );
}


// ===========================================================
// MÉTRICA
// ===========================================================

function CustomerMetric({
  label,
  value,
  secondary,
}) {
  return (
    <div className="customer-entry__metric">

      <span>
        {label}
      </span>


      <strong>
        {value}
      </strong>


      {secondary && (
        <small>
          {secondary}
        </small>
      )}

    </div>
  );
}


// ===========================================================
// RESUMEN
// ===========================================================

function SummaryCard({
  label,
  value,
}) {
  return (
    <article className="customers-summary__card">

      <span>
        {label}
      </span>


      <strong>
        {value}
      </strong>

    </article>
  );
}


// ===========================================================
// ESTADO
// ===========================================================

function StateBox({
  title,
  text,
  error = false,
}) {
  return (
    <div
      className={[
        "customers-state",

        error
          ? "customers-state--error"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      <strong>
        {title}
      </strong>


      <p>
        {text}
      </p>

    </div>
  );
}


// ===========================================================
// FECHA
// ===========================================================

function formatDate(
  value,
) {
  if (!value) {
    return "—";
  }


  return new Date(
    value,
  ).toLocaleDateString(
    "es-CO",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}