import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAuth } from "../../features/auth/hooks/useAuth.js";
import {
  getDashboardData,
  getPendingRewards,
  getPendingVisitRequests,
  redeemReward,
  reviewVisitRequest,
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

  const [data, setData] = useState(null);
  const [pendingRewards, setPendingRewards] = useState([]);
  const [pendingVisits, setPendingVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redeemingRewardId, setRedeemingRewardId] = useState(null);
  const [rewardMessage, setRewardMessage] = useState("");
  const [rewardToRedeem, setRewardToRedeem] = useState(null);
  const [reviewingVisitId, setReviewingVisitId] = useState(null);
  const [visitMessage, setVisitMessage] = useState("");

  // =========================================================
  // CARGAR DASHBOARD
  // =========================================================
  const loadDashboard = useCallback(
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
          pendingVisitsResult,
        ] = await Promise.all([
          getDashboardData(businessId),
          getPendingRewards(businessId),
          getPendingVisitRequests(businessId),
        ]);

        setData(dashboardResult);
        setPendingRewards(pendingRewardsResult);
        setPendingVisits(pendingVisitsResult);
      } catch (loadError) {
        console.error("dashboard:", loadError);

        setError(
          loadError?.message ||
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
  // ACTUALIZAR SOLICITUDES AUTOMÁTICAMENTE
  // =========================================================
  useEffect(() => {
    if (!businessId) {
      return undefined;
    }

    let active = true;
    let refreshing = false;

    async function refreshPendingVisits() {
      if (
        !active ||
        refreshing ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      refreshing = true;

      try {
        const requests =
          await getPendingVisitRequests(
            businessId,
          );

        if (active) {
          setPendingVisits(
            requests,
          );
        }
      } catch (refreshError) {
        console.error(
          "refresh pending visits:",
          refreshError,
        );
      } finally {
        refreshing = false;
      }
    }

    const intervalId =
      window.setInterval(
        refreshPendingVisits,
        4000,
      );

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        refreshPendingVisits();
      }
    }

    function handleFocus() {
      refreshPendingVisits();
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      active = false;

      window.clearInterval(
        intervalId,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [
    businessId,
  ]);

  // =========================================================
  // APROBAR / RECHAZAR SOLICITUD DE SELLO
  // =========================================================
  async function handleReviewVisit(
    request,
    action,
  ) {
    if (!request?.request_id) {
      return;
    }

    try {
      setReviewingVisitId(
        request.request_id,
      );

      setVisitMessage("");

      await reviewVisitRequest(
        request.request_id,
        action,
      );

      setVisitMessage(
        action === "approve"
          ? `El sello de ${
              request.customer_name ||
              "el cliente"
            } fue aprobado correctamente.`
          : `La solicitud de ${
              request.customer_name ||
              "el cliente"
            } fue rechazada.`,
      );

      await loadDashboard();
    } catch (reviewError) {
      console.error(
        "review visit request:",
        reviewError,
      );

      setVisitMessage(
        reviewError?.message ||
          "No pudimos revisar la solicitud.",
      );
    } finally {
      setReviewingVisitId(
        null,
      );
    }
  }

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
    if (
      redeemingRewardId
    ) {
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
    } catch (redeemError) {
      console.error(
        "redeem reward:",
        redeemError,
      );

      setRewardMessage(
        redeemError?.message ||
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
  if (
    error ||
    !data
  ) {
    return (
      <DashboardLayout>
        <div className="dashboard-state">
          <p className="eyebrow">
            ERROR
          </p>

          <h1>
            NO PUDIMOS CARGAR EL PANEL
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
            Resumen de actividad, clientes y recompensas.
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
            pendingVisits.length
          }
          label="Solicitudes de sello"
          emphasis={
            pendingVisits.length >
            0
          }
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
              SOLICITUDES DE SELLO
            </h2>
          </div>

          <span className="dashboard-section__count">
            {
              pendingVisits.length
            }{" "}
            {pendingVisits.length ===
            1
              ? "PENDIENTE"
              : "PENDIENTES"}
          </span>
        </div>

        {visitMessage && (
          <div className="reward-dashboard-message">
            {
              visitMessage
            }
          </div>
        )}

        {pendingVisits.length ===
        0 ? (
          <div className="dashboard-empty">
            <strong>
              NO HAY SOLICITUDES PENDIENTES
            </strong>

            <p>
              Cuando un cliente solicite un sello,
              aparecerá aquí para que el equipo lo revise.
            </p>
          </div>
        ) : (
          <div className="dashboard-rewards">
            {pendingVisits.map(
              (request) => {
                const isReviewing =
                  reviewingVisitId ===
                  request.request_id;

                return (
                  <article
                    className="dashboard-reward visit-request-card"
                    key={
                      request.request_id
                    }
                  >
                    <div className="visit-request-card__content">
                      <div className="dashboard-reward__customer">
                        <span className="customer-avatar">
                          {request.customer_name
                            ?.charAt(0)
                            .toUpperCase() ||
                            "?"}
                        </span>

                        <div>
                          <span className="dashboard-reward__label">
                            CLIENTE
                          </span>

                          <strong className="dashboard-reward__customer-name">
                            {request.customer_name ||
                              "Cliente"}
                          </strong>

                          <span className="dashboard-reward__phone">
                            {request.customer_whatsapp ||
                              "Sin WhatsApp"}
                          </span>
                        </div>
                      </div>

                      <div className="visit-request-card__date">
                        <span>
                          SOLICITADA
                        </span>

                        <strong>
                          {new Date(
                            request.requested_at,
                          ).toLocaleString(
                            "es-CO",
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="visit-request__actions">
                      <button
                        type="button"
                        className="visit-request__button visit-request__button--reject"
                        disabled={
                          Boolean(
                            reviewingVisitId,
                          )
                        }
                        onClick={() =>
                          handleReviewVisit(
                            request,
                            "reject",
                          )
                        }
                      >
                        {isReviewing
                          ? "PROCESANDO..."
                          : "RECHAZAR"}
                      </button>

                      <button
                        type="button"
                        className="visit-request__button visit-request__button--approve"
                        disabled={
                          Boolean(
                            reviewingVisitId,
                          )
                        }
                        onClick={() =>
                          handleReviewVisit(
                            request,
                            "approve",
                          )
                        }
                      >
                        {isReviewing
                          ? "PROCESANDO..."
                          : "APROBAR"}
                      </button>
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
            {
              rewardMessage
            }
          </div>
        )}

        {pendingRewards.length ===
        0 ? (
          <div className="dashboard-empty">
            <strong>
              NO HAY RECOMPENSAS PENDIENTES
            </strong>

            <p>
              Cuando un cliente complete una tarjeta,
              su recompensa aparecerá aquí.
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
                              ESPERANDO SELECCIÓN
                            </strong>

                            <p className="dashboard-reward__description">
                              El cliente todavía no ha elegido
                              qué recompensa quiere reclamar.
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
              TODAVÍA NO HAY CLIENTES
            </strong>

            <p>
              Los clientes aparecerán aquí después
              de registrarse.
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
              Vas a marcar como canjeada la recompensa de{" "}
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
                {rewardToRedeem
                  .selected_reward
                  ?.name}
              </strong>

              {rewardToRedeem
                .selected_reward
                ?.description && (
                <small>
                  {rewardToRedeem
                    .selected_reward
                    .description}
                </small>
              )}
            </div>

            <p className="redeem-confirmation__warning">
              Una vez confirmado, esta recompensa dejará
              de aparecer como pendiente.
            </p>
          </div>
        )}
      </ConfirmModal>
    </DashboardLayout>
  );
}