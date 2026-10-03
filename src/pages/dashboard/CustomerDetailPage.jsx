import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout.jsx";

import {
  useAuth,
} from "../../features/auth/hooks/useAuth.js";

import {
  getCustomerDetails,
} from "../../features/customers/api/customersApi.js";

import "./CustomerDetailPage.css";


export default function CustomerDetailPage() {
  const {
    customerId,
  } = useParams();


  const {
    businessId,
  } = useAuth();


  const [
    data,
    setData,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  // =========================================================
  // CARGAR CLIENTE
  // =========================================================

  useEffect(() => {
    let cancelled =
      false;


    async function loadCustomer() {
      if (
        !businessId ||
        !customerId
      ) {
        return;
      }


      setLoading(
        true,
      );

      setError(
        "",
      );


      try {
        const result =
          await getCustomerDetails(
            businessId,
            customerId,
          );


        if (
          cancelled
        ) {
          return;
        }


        setData(
          result,
        );
      } catch (
        loadError
      ) {
        if (
          cancelled
        ) {
          return;
        }


        console.error(
          "customer detail:",
          loadError,
        );


        setError(
          loadError?.message ||
            "No pudimos cargar el cliente.",
        );
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false,
          );
        }
      }
    }


    loadCustomer();


    return () => {
      cancelled =
        true;
    };
  }, [
    businessId,
    customerId,
  ]);


  // =========================================================
  // ESTADOS
  // =========================================================

  if (loading) {
    return (
      <DashboardLayout>
        <StateBox
          title="CARGANDO CLIENTE..."
          text="Estamos consultando la información del cliente."
        />
      </DashboardLayout>
    );
  }


  if (
    error ||
    !data
  ) {
    return (
      <DashboardLayout>

        <section className="customer-detail-page">

          <Link
            to="/dashboard/clientes"
            className="customer-detail__back"
          >
            ← VOLVER A CLIENTES
          </Link>


          <StateBox
            title="NO PUDIMOS CARGAR EL CLIENTE"
            text={
              error ||
              "No encontramos este cliente."
            }
            error
          />

        </section>

      </DashboardLayout>
    );
  }


  const {
    customer,
    progress,
    stats,
    visits,
    rewards,
  } = data;


  const progressPercent =
    progress.required > 0
      ? Math.min(
          100,
          (
            progress.stamps /
            progress.required
          ) * 100,
        )
      : 0;


  return (
    <DashboardLayout>

      <section className="customer-detail-page">

        {/* ===================================================
            VOLVER
            =================================================== */}

        <Link
          to="/dashboard/clientes"
          className="customer-detail__back"
        >
          ← VOLVER A CLIENTES
        </Link>


        {/* ===================================================
            HERO
            =================================================== */}

        <header className="customer-detail__hero">

          <div className="customer-detail__identity">

            <span className="customer-detail__avatar">
              {customer.name
                ?.charAt(0)
                .toUpperCase() ||
                "?"}
            </span>


            <div>

              <p className="eyebrow">
                CLIENTE
              </p>


              <h1>
                {customer.name ||
                  "Cliente"}
              </h1>


              <p>
                Cliente desde{" "}
                {formatDate(
                  customer.created_at,
                )}
              </p>

            </div>

          </div>

        </header>


        {/* ===================================================
            INFORMACIÓN PERSONAL
            =================================================== */}

        <section className="customer-detail__section">

          <SectionHeader
            eyebrow="INFORMACIÓN"
            title="DATOS DEL CLIENTE"
          />


          <div className="customer-info-grid">

            <InfoCard
              label="CÉDULA"
              value={
                customer.cedula
                  ? `C.C. ${customer.cedula}`
                  : "No disponible"
              }
            />


            <InfoCard
              label="WHATSAPP"
              value={
                customer.whatsapp ||
                "No disponible"
              }
            />


            <InfoCard
              label="CUMPLEAÑOS"
              value={
                customer.birthday
                  ? formatBirthday(
                      customer.birthday,
                    )
                  : "No registrado"
              }
            />


            <InfoCard
              label="REGISTRO"
              value={
                formatDateTime(
                  customer.created_at,
                )
              }
            />

          </div>

        </section>


        {/* ===================================================
            PROGRESO
            =================================================== */}

        <section className="customer-detail__section">

          <SectionHeader
            eyebrow="FIDELIZACIÓN"
            title="PROGRESO ACTUAL"
          />


          <article className="customer-progress">

            <div className="customer-progress__heading">

              <div>

                <span>
                  TARJETA ACTUAL
                </span>


                <strong>
                  {progress.stamps} /{" "}
                  {progress.required}
                </strong>

              </div>


              <span className="customer-progress__remaining">
                {Math.max(
                  progress.required -
                    progress.stamps,
                  0,
                )}{" "}
                SELLOS RESTANTES
              </span>

            </div>


            <div
              className="customer-progress__track"
              aria-label={`${progress.stamps} de ${progress.required} sellos`}
            >

              <div
                className="customer-progress__bar"
                style={{
                  width:
                    `${progressPercent}%`,
                }}
              />

            </div>

          </article>

        </section>


        {/* ===================================================
            RESUMEN
            =================================================== */}

        <section className="customer-detail__stats">

          <StatCard
            label="VISITAS"
            value={
              stats.visits
            }
          />


          <StatCard
            label="RECOMPENSAS"
            value={
              stats.rewards
            }
          />


          <StatCard
            label="PENDIENTES"
            value={
              stats.pendingRewards
            }
          />


          <StatCard
            label="CANJEADAS"
            value={
              stats.redeemedRewards
            }
          />

        </section>


        {/* ===================================================
            HISTORIA
            =================================================== */}

        <div className="customer-detail__history">

          {/* =================================================
              VISITAS
              ================================================= */}

          <section className="customer-detail__section">

            <SectionHeader
              eyebrow="ACTIVIDAD"
              title="HISTORIAL DE VISITAS"
              count={
                visits.length
              }
            />


            {visits.length >
            0 ? (
              <div className="customer-history-list">

                {visits.map(
                  (
                    visit,
                    index,
                  ) => (
                    <article
                      key={
                        visit.id
                      }
                      className="customer-history-item"
                    >

                      <div>

                        <span className="customer-history-item__label">
                          VISITA
                        </span>


                        <strong>
                          Visita{" "}
                          {visits.length -
                            index}
                        </strong>

                      </div>


                      <time>
                        {formatDateTime(
                          visit.created_at,
                        )}
                      </time>

                    </article>
                  ),
                )}

              </div>
            ) : (
              <EmptyState
                text="Este cliente todavía no tiene visitas registradas."
              />
            )}

          </section>


          {/* =================================================
              RECOMPENSAS
              ================================================= */}

          <section className="customer-detail__section">

            <SectionHeader
              eyebrow="PREMIOS"
              title="HISTORIAL DE RECOMPENSAS"
              count={
                rewards.length
              }
            />


            {rewards.length >
            0 ? (
              <div className="customer-history-list">

                {rewards.map(
                  (
                    reward,
                  ) => (
                    <RewardHistoryItem
                      key={
                        reward.id
                      }
                      reward={
                        reward
                      }
                    />
                  ),
                )}

              </div>
            ) : (
              <EmptyState
                text="Este cliente todavía no ha obtenido recompensas."
              />
            )}

          </section>

        </div>

      </section>

    </DashboardLayout>
  );
}


// ===========================================================
// RECOMPENSA
// ===========================================================

function RewardHistoryItem({
  reward,
}) {
  const redeemed =
    reward.status ===
    "redeemed";


  const rewardName =
    reward.selected_reward
      ?.name ||
    "Recompensa sin seleccionar";


  return (
    <article className="customer-history-item">

      <div>

        <span className="customer-history-item__label">
          RECOMPENSA
        </span>


        <strong>
          {rewardName}
        </strong>


        <small>
          Obtenida{" "}
          {formatDateTime(
            reward.earned_at,
          )}
        </small>

      </div>


      <div className="customer-history-item__right">

        <span
          className={[
            "customer-reward-status",

            redeemed
              ? "customer-reward-status--redeemed"
              : "customer-reward-status--pending",
          ].join(" ")}
        >
          {redeemed
            ? "CANJEADA"
            : "PENDIENTE"}
        </span>


        {reward.redeemed_at && (
          <small>
            {formatDateTime(
              reward.redeemed_at,
            )}
          </small>
        )}

      </div>

    </article>
  );
}


// ===========================================================
// HEADER DE SECCIÓN
// ===========================================================

function SectionHeader({
  eyebrow,
  title,
  count,
}) {
  return (
    <div className="customer-section-header">

      <div>

        <p className="eyebrow">
          {eyebrow}
        </p>


        <h2>
          {title}
        </h2>

      </div>


      {Number.isFinite(
        count,
      ) && (
        <span>
          {count}
        </span>
      )}

    </div>
  );
}


// ===========================================================
// INFO
// ===========================================================

function InfoCard({
  label,
  value,
}) {
  return (
    <article className="customer-info-card">

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
// ESTADÍSTICA
// ===========================================================

function StatCard({
  label,
  value,
}) {
  return (
    <article className="customer-detail-stat">

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
// VACÍO
// ===========================================================

function EmptyState({
  text,
}) {
  return (
    <div className="customer-history-empty">
      {text}
    </div>
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
        "customer-detail-state",

        error
          ? "customer-detail-state--error"
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
// FECHAS
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
      day:
        "2-digit",

      month:
        "long",

      year:
        "numeric",
    },
  );
}


function formatDateTime(
  value,
) {
  if (!value) {
    return "—";
  }


  return new Date(
    value,
  ).toLocaleString(
    "es-CO",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  );
}


function formatBirthday(
  value,
) {
  if (!value) {
    return "—";
  }


  const date =
    new Date(
      `${value}T00:00:00`,
    );


  return date.toLocaleDateString(
    "es-CO",
    {
      day:
        "2-digit",

      month:
        "long",
    },
  );
}