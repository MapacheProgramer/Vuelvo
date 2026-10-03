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
  getBusinessRewards,
} from "../../features/rewards/api/rewardsApi.js";

import "./RewardsPage.css";


const FILTERS = {
  ALL: "all",
  EARNED: "earned",
  REDEEMED: "redeemed",
};


export default function RewardsPage() {
  const {
    businessId,
  } = useAuth();

  const [
    rewards,
    setRewards,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState(
    FILTERS.ALL,
  );


  // =========================================================
  // CARGAR RECOMPENSAS
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadRewards() {
      if (!businessId) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data =
          await getBusinessRewards(
            businessId,
          );

        if (cancelled) {
          return;
        }

        setRewards(data);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "rewards:",
          error,
        );

        setError(
          error?.message ||
            "No pudimos cargar las recompensas.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRewards();

    return () => {
      cancelled = true;
    };
  }, [
    businessId,
  ]);


  // =========================================================
  // CONTADORES
  // =========================================================

  const counts =
    useMemo(
      () => {
        const pending =
          rewards.filter(
            (reward) =>
              reward.status ===
              "earned",
          ).length;

        const redeemed =
          rewards.filter(
            (reward) =>
              reward.status ===
              "redeemed",
          ).length;

        return {
          all:
            rewards.length,

          pending,

          redeemed,
        };
      },
      [
        rewards,
      ],
    );


  // =========================================================
  // FILTRO
  // =========================================================

  const filteredRewards =
    useMemo(
      () => {
        if (
          filter ===
          FILTERS.EARNED
        ) {
          return rewards.filter(
            (reward) =>
              reward.status ===
              "earned",
          );
        }

        if (
          filter ===
          FILTERS.REDEEMED
        ) {
          return rewards.filter(
            (reward) =>
              reward.status ===
              "redeemed",
          );
        }

        return rewards;
      },
      [
        filter,
        rewards,
      ],
    );


  return (
    <DashboardLayout>

      <section className="rewards-page">

        {/* ===================================================
            HERO
            =================================================== */}

        <header className="rewards-page__hero">
          <div>
            <p className="eyebrow">
              FIDELIZACIÓN
            </p>

            <h1>
              RECOMPENSAS
            </h1>

            <p className="rewards-page__intro">
              Consulta las recompensas obtenidas por tus
              clientes y su estado de canje.
            </p>
          </div>
        </header>


        {/* ===================================================
            RESUMEN
            =================================================== */}

        {!loading &&
          !error && (
            <section className="rewards-summary">

              <article className="rewards-summary__item">
                <span>
                  TOTAL
                </span>

                <strong>
                  {
                    counts.all
                  }
                </strong>
              </article>

              <article className="rewards-summary__item">
                <span>
                  PENDIENTES
                </span>

                <strong>
                  {
                    counts.pending
                  }
                </strong>
              </article>

              <article className="rewards-summary__item">
                <span>
                  CANJEADAS
                </span>

                <strong>
                  {
                    counts.redeemed
                  }
                </strong>
              </article>

            </section>
          )}


        {/* ===================================================
            LISTADO
            =================================================== */}

        <section className="rewards-page__section">

          <div className="rewards-page__heading">

            <div>
              <p className="eyebrow">
                HISTORIAL
              </p>

              <h2>
                RECOMPENSAS DEL NEGOCIO
              </h2>
            </div>


            <div
              className="rewards-filters"
              role="group"
              aria-label="Filtrar recompensas"
            >

              <FilterButton
                active={
                  filter ===
                  FILTERS.ALL
                }
                onClick={() =>
                  setFilter(
                    FILTERS.ALL,
                  )
                }
              >
                TODAS
              </FilterButton>

              <FilterButton
                active={
                  filter ===
                  FILTERS.EARNED
                }
                onClick={() =>
                  setFilter(
                    FILTERS.EARNED,
                  )
                }
              >
                PENDIENTES
              </FilterButton>

              <FilterButton
                active={
                  filter ===
                  FILTERS.REDEEMED
                }
                onClick={() =>
                  setFilter(
                    FILTERS.REDEEMED,
                  )
                }
              >
                CANJEADAS
              </FilterButton>

            </div>

          </div>


          {loading && (
            <StateBox
              title="CARGANDO RECOMPENSAS..."
              text="Estamos consultando el historial del negocio."
            />
          )}


          {!loading &&
            error && (
              <StateBox
                title="NO PUDIMOS CARGAR LAS RECOMPENSAS"
                text={
                  error
                }
                error
              />
            )}


          {!loading &&
            !error &&
            filteredRewards.length ===
              0 && (
              <StateBox
                title="NO HAY RECOMPENSAS"
                text={
                  filter ===
                  FILTERS.ALL
                    ? "Todavía no hay recompensas registradas."
                    : filter ===
                        FILTERS.EARNED
                      ? "No hay recompensas pendientes por canjear."
                      : "Todavía no hay recompensas canjeadas."
                }
              />
            )}


          {!loading &&
            !error &&
            filteredRewards.length >
              0 && (
              <div className="rewards-list">

                {filteredRewards.map(
                  (reward) => (
                    <RewardRow
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
            )}

        </section>

      </section>

    </DashboardLayout>
  );
}


function FilterButton({
  active,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      className={[
        "rewards-filter",

        active
          ? "is-active"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={
        onClick
      }
    >
      {children}
    </button>
  );
}


function RewardRow({
  reward,
}) {
  const isRedeemed =
    reward.status ===
    "redeemed";

  const customer =
    reward.customer;

  const selectedReward =
    reward.selected_reward;

  return (
    <article className="reward-history">

      <div className="reward-history__customer">

        <span className="reward-history__avatar">
          {customer?.name
            ?.charAt(0)
            .toUpperCase() ||
            "?"}
        </span>

        <div>
          <span className="reward-history__label">
            CLIENTE
          </span>

          <strong>
            {customer?.name ||
              "Cliente"}
          </strong>

          <small>
            {customer?.whatsapp ||
              "Sin WhatsApp"}
          </small>
        </div>

      </div>


      <div className="reward-history__reward">

        <span className="reward-history__label">
          RECOMPENSA
        </span>

        <strong>
          {selectedReward?.name ||
            "Sin seleccionar"}
        </strong>

        {selectedReward?.description && (
          <small>
            {
              selectedReward.description
            }
          </small>
        )}

      </div>


      <div className="reward-history__dates">

        <div>
          <span>
            OBTENIDA
          </span>

          <strong>
            {formatDate(
              reward.earned_at,
            )}
          </strong>
        </div>

        {isRedeemed &&
          reward.redeemed_at && (
            <div>
              <span>
                CANJEADA
              </span>

              <strong>
                {formatDate(
                  reward.redeemed_at,
                )}
              </strong>
            </div>
          )}

      </div>


      <div className="reward-history__status">

        <span
          className={[
            "reward-status",

            isRedeemed
              ? "reward-status--redeemed"
              : "reward-status--pending",
          ].join(" ")}
        >
          {isRedeemed
            ? "CANJEADA"
            : "PENDIENTE"}
        </span>

      </div>

    </article>
  );
}


function StateBox({
  title,
  text,
  error = false,
}) {
  return (
    <div
      className={[
        "rewards-state",

        error
          ? "rewards-state--error"
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