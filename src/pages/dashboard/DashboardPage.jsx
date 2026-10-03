import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "../../features/auth/hooks/useAuth.js";

import {
  getDashboardData,
  getPendingRewards,
  redeemReward,
} from "../../features/dashboard/api/dashboardApi.js";

import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout.jsx";
import StatCard from "../../components/ui/StatCard/StatCard.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal/ConfirmModal.jsx";

import "./DashboardPage.css";

export default function DashboardPage() {
  const {
    businessId,
    user,
    role,
  } = useAuth();

  const [data, setData] =
    useState(null);

  const [
    pendingRewards,
    setPendingRewards,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    redeemingRewardId,
    setRedeemingRewardId,
  ] = useState(null);

  const [
    rewardMessage,
    setRewardMessage,
  ] = useState("");

  const [
    rewardToRedeem,
    setRewardToRedeem,
  ] = useState(null);

  // =========================================================
  // CARGAR DASHBOARD
  // =========================================================

  const loadDashboard =
    useCallback(
      async ({
        showLoading = false,
      } = {}) => {
        if (!businessId) {
          return;
        }

        if (showLoading) {
          setLoading(true);
        }

        setError("");

        try {
          const [
            dashboardResult,
            pendingRewardsResult,
          ] = await Promise.all([
            getDashboardData(
              businessId,
            ),

            getPendingRewards(
              businessId,
            ),
          ]);

          setData(
            dashboardResult,
          );

          setPendingRewards(
            pendingRewardsResult,
          );
        } catch (error) {
          console.error(
            "dashboard:",
            error,
          );

          setError(
            error?.message ||
              "No pudimos cargar el dashboard.",
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [businessId],
    );

  // =========================================================
  // PRIMERA CARGA
  // =========================================================

  useEffect(() => {
    if (!businessId) {
      return;
    }

    loadDashboard({
      showLoading: true,
    });
  }, [
    businessId,
    loadDashboard,
  ]);

  // =========================================================
  // ABRIR MODAL DE CANJE
  // =========================================================

  function handleRequestRedeem(
    reward,
  ) {
    if (
      !reward?.selected_reward
    ) {
      setRewardMessage(
        "El cliente todavía no ha elegido su recompensa.",
      );

      return;
    }

    setRewardMessage("");

    setRewardToRedeem(
      reward,
    );
  }

  // =========================================================
  // CERRAR MODAL
  // =========================================================

  function handleCloseRedeemModal() {
    if (redeemingRewardId) {
      return;
    }

    setRewardToRedeem(
      null,
    );
  }

  // =========================================================
  // CONFIRMAR CANJE
  // =========================================================

  async function handleConfirmRedeem() {
    if (
      !rewardToRedeem
    ) {
      return;
    }

    const reward =
      rewardToRedeem;

    try {
      setRedeemingRewardId(
        reward.id,
      );

      setRewardMessage("");

      await redeemReward(
        reward.id,
      );

      setRewardToRedeem(
        null,
      );

      setRewardMessage(
        `La recompensa de ${
          reward.customer?.name ||
          "el cliente"
        } fue canjeada correctamente.`,
      );

      await loadDashboard();
    } catch (error) {
      console.error(
        "redeem reward:",
        error,
      );

      setRewardMessage(
        error?.message ||
          "No pudimos canjear la recompensa.",
      );
    } finally {
      setRedeemingRewardId(
        null,
      );
    }
  }

  // =========================================================
  // LOADING
  // =========================================================

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

  // =========================================================
  // ERROR
  // =========================================================

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
          value={
            stats.customers
          }
          label="Clientes"
        />

        <StatCard
          value={
            stats.visits
          }
          label="Visitas"
        />

        <StatCard
          value={
            stats.pendingRewards
          }
          label="Recompensas pendientes"
          emphasis={
            stats.pendingRewards >
            0
          }
        />
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section__heading">
          <div>
            <p className="eyebrow">
              FIDELIZACIÓN
            </p>

            <h2>
              RECOMPENSAS PENDIENTES
            </h2>
          </div>

          <span className="dashboard-section__count">
            {
              pendingRewards.length
            }{" "}
            {pendingRewards.length ===
            1
              ? "PENDIENTE"
              : "PENDIENTES"}
          </span>
        </div>

        {rewardMessage && (
          <div className="reward-dashboard-message">
            {rewardMessage}
          </div>
        )}

        {pendingRewards.length ===
        0 ? (
          <div className="dashboard-empty">
            <strong>
              NO HAY RECOMPENSAS
              PENDIENTES
            </strong>

            <p>
              Cuando un cliente
              complete una tarjeta,
              su recompensa aparecerá
              aquí.
            </p>
          </div>
        ) : (
          <div className="dashboard-rewards">
            {pendingRewards.map(
              (reward) => {
                const customer =
                  reward.customer;

                const selectedReward =
                  reward.selected_reward;

                const isRedeeming =
                  redeemingRewardId ===
                  reward.id;

                return (
                  <article
                    className="dashboard-reward"
                    key={
                      reward.id
                    }
                  >
                    <div className="dashboard-reward__main">
                      <div className="dashboard-reward__customer">
                        <span className="customer-avatar">
                          {customer?.name
                            ?.charAt(0)
                            .toUpperCase() ||
                            "?"}
                        </span>

                        <div>
                          <span className="dashboard-reward__label">
                            CLIENTE
                          </span>

                          <strong className="dashboard-reward__customer-name">
                            {customer?.name ||
                              "Cliente"}
                          </strong>

                          <span className="dashboard-reward__phone">
                            {customer?.whatsapp ||
                              "Sin WhatsApp"}
                          </span>
                        </div>
                      </div>

                      <div className="dashboard-reward__details">
                        {selectedReward ? (
                          <>
                            <span className="dashboard-reward__label">
                              RECOMPENSA
                            </span>

                            <strong className="dashboard-reward__name">
                              {
                                selectedReward.name
                              }
                            </strong>

                            {selectedReward.description && (
                              <p className="dashboard-reward__description">
                                {
                                  selectedReward.description
                                }
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="dashboard-reward__label">
                              RECOMPENSA
                            </span>

                            <strong className="dashboard-reward__waiting">
                              ESPERANDO
                              SELECCIÓN
                            </strong>

                            <p className="dashboard-reward__description">
                              El cliente
                              todavía no ha
                              elegido qué
                              recompensa
                              quiere reclamar.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="dashboard-reward__footer">
                      <div className="dashboard-reward__date">
                        <span>
                          OBTENIDA
                        </span>

                        <strong>
                          {new Date(
                            reward.earned_at,
                          ).toLocaleDateString(
                            "es-CO",
                          )}
                        </strong>
                      </div>

                      {selectedReward ? (
                        <button
                          type="button"
                          className="dashboard-reward__redeem"
                          disabled={
                            Boolean(
                              redeemingRewardId,
                            )
                          }
                          onClick={() =>
                            handleRequestRedeem(
                              reward,
                            )
                          }
                        >
                          {isRedeeming
                            ? "CANJEANDO..."
                            : "CANJEAR"}
                        </button>
                      ) : (
                        <span className="dashboard-reward__pending-badge">
                          PENDIENTE
                        </span>
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
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

        {recentCustomers.length ===
        0 ? (
          <div className="dashboard-empty">
            <strong>
              TODAVÍA NO HAY
              CLIENTES
            </strong>

            <p>
              Los clientes aparecerán
              aquí después de
              registrarse.
            </p>
          </div>
        ) : (
          <div className="customer-list">
            {recentCustomers.map(
              (customer) => (
                <article
                  className="customer-row"
                  key={
                    customer.id
                  }
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
                        {
                          customer.name
                        }
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

      <ConfirmModal
        open={
          Boolean(
            rewardToRedeem,
          )
        }
        eyebrow="Confirmar canje"
        title="Canjear recompensa"
        confirmText="Confirmar canje"
        loading={
          Boolean(
            redeemingRewardId,
          )
        }
        onClose={
          handleCloseRedeemModal
        }
        onConfirm={
          handleConfirmRedeem
        }
      >
        {rewardToRedeem && (
          <div className="redeem-confirmation">
            <p>
              Vas a marcar como
              canjeada la recompensa de{" "}
              <strong>
                {rewardToRedeem
                  .customer?.name ||
                  "este cliente"}
              </strong>
              .
            </p>

            <div className="redeem-confirmation__reward">
              <span>
                RECOMPENSA
              </span>

              <strong>
                {
                  rewardToRedeem
                    .selected_reward
                    ?.name
                }
              </strong>

              {rewardToRedeem
                .selected_reward
                ?.description && (
                <small>
                  {
                    rewardToRedeem
                      .selected_reward
                      .description
                  }
                </small>
              )}
            </div>

            <p className="redeem-confirmation__warning">
              Una vez confirmado,
              esta recompensa dejará
              de aparecer como
              pendiente.
            </p>
          </div>
        )}
      </ConfirmModal>
    </DashboardLayout>
  );
}