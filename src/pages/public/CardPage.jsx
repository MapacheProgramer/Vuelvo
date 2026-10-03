import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import BrandHeader from "../../components/layout/BrandHeader/BrandHeader";
import StampCard from "../../components/loyalty/StampCard/StampCard";

import {
  ButtonLink,
} from "../../components/ui/Button/Button";

import {
  getCardStatus,
  selectCustomerReward,
} from "../../features/loyalty/api/cardApi";

import {
  getDeviceToken,
} from "../../hooks/useDeviceToken";

import "./public-pages.css";

export default function CardPage() {
  const { code } = useParams();

  const [state, setState] = useState({
    loading: true,
    error: null,
    data: null,
  });

  const [
    selectingKey,
    setSelectingKey,
  ] = useState(null);

  const [
    selectionMessage,
    setSelectionMessage,
  ] = useState("");

  // ---------------------------------------------------------
  // Cargar tarjeta
  // ---------------------------------------------------------

  const loadCard =
    useCallback(
      async ({
        showLoading = false,
      } = {}) => {
        if (showLoading) {
          setState((current) => ({
            ...current,
            loading: true,
            error: null,
          }));
        }

        const deviceToken =
          getDeviceToken({
            create: false,
          });

        if (!deviceToken) {
          setState({
            loading: false,
            error: null,
            data: {
              status:
                "not_registered",
            },
          });

          return;
        }

        try {
          const data =
            await getCardStatus({
              code,
              deviceToken,
            });

          setState({
            loading: false,
            error: null,
            data,
          });
        } catch (error) {
          console.error(
            "card-status:",
            error,
          );

          setState({
            loading: false,
            error:
              "No pudimos cargar tu tarjeta.",
            data: null,
          });
        }
      },
      [code],
    );

  // ---------------------------------------------------------
  // Primera carga
  // ---------------------------------------------------------

  useEffect(() => {
    loadCard({
      showLoading: true,
    });
  }, [loadCard]);

  // ---------------------------------------------------------
  // Elegir recompensa
  // ---------------------------------------------------------

  async function handleSelectReward(
    earnedRewardId,
    catalogRewardId,
  ) {
    const deviceToken =
      getDeviceToken({
        create: false,
      });

    if (!deviceToken) {
      setSelectionMessage(
        "No encontramos el dispositivo actual.",
      );

      return;
    }

    const actionKey =
      `${earnedRewardId}:${catalogRewardId}`;

    try {
      setSelectingKey(actionKey);

      setSelectionMessage("");

      await selectCustomerReward({
        code,
        deviceToken,
        earnedRewardId,
        catalogRewardId,
      });

      // Volvemos a consultar Supabase para
      // mostrar el estado real guardado.
      await loadCard();

      setSelectionMessage(
        "Recompensa seleccionada correctamente.",
      );
    } catch (error) {
      console.error(
        "select-reward:",
        error,
      );

      setSelectionMessage(
        error?.data?.message ||
          error?.message ||
          "No pudimos seleccionar la recompensa.",
      );
    } finally {
      setSelectingKey(null);
    }
  }

  // ---------------------------------------------------------
  // Cargando
  // ---------------------------------------------------------

  if (state.loading) {
    return (
      <PublicState
        title="Cargando..."
        text="Estamos consultando tu progreso."
      />
    );
  }

  // ---------------------------------------------------------
  // Error
  // ---------------------------------------------------------

  if (state.error) {
    return (
      <PublicState
        eyebrow="Vuelvo"
        title="Algo salió mal"
        text={state.error}
      />
    );
  }

  const data =
    state.data;

  // ---------------------------------------------------------
  // No registrado
  // ---------------------------------------------------------

  if (
    data?.status ===
      "not_registered" ||
    !data
  ) {
    return (
      <main className="loyalty-page">
        <div className="loyalty-shell">
          <BrandHeader
            business={
              data?.business
            }
          />

          <section className="loyalty-content">
            <p className="eyebrow">
              Tu tarjeta
            </p>

            <h1 className="display-title">
              Aún no tienes tarjeta
            </h1>

            <p className="body-copy">
              Escanea el código del
              negocio para registrarte y
              obtener tu primer sello.
            </p>

            <ButtonLink
              to={`/t/${code}`}
              variant="sticker"
              fullWidth
              className="public-page__primary-action"
            >
              Escanear código
            </ButtonLink>
          </section>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // Código inexistente
  // ---------------------------------------------------------

  if (
    data.status ===
    "not_found"
  ) {
    return (
      <PublicState
        eyebrow="Código"
        title="No encontramos este negocio"
      />
    );
  }

  // ---------------------------------------------------------
  // Datos
  // ---------------------------------------------------------

  const required =
    Number(data.required) || 0;

  const stamps =
    Math.max(
      0,
      Math.min(
        Number(data.stamps) || 0,
        required || Infinity,
      ),
    );

  const rewardName =
    data.business?.reward_name ||
    "Premio de la casa";

  const pendingRewards =
    Array.isArray(
      data.pending_rewards,
    )
      ? data.pending_rewards
      : [];

  const rewardCatalog =
    Array.isArray(
      data.reward_catalog,
    )
      ? data.reward_catalog
      : [];

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <main className="loyalty-page">
      <div className="loyalty-shell">
        <BrandHeader
          business={data.business}
        />

        <section className="loyalty-content">
          <p className="eyebrow">
            Tu tarjeta
          </p>

          <h1 className="display-title">
            Hola
            {data.customer?.name
              ? `, ${data.customer.name}`
              : ""}
          </h1>

          <p className="body-copy">
            Consulta tu progreso sin
            registrar una nueva visita.
          </p>

          <StampCard
            stamps={stamps}
            required={required}
            rewardName={rewardName}
            rewardAvailable={Boolean(
              data.reward_available,
            )}
          />

          {pendingRewards.length >
            0 && (
            <section className="reward-selector">
              <p className="reward-selector__eyebrow">
                Tus recompensas
              </p>

              <h2 className="reward-selector__title">
                Tienes{" "}
                {
                  pendingRewards.length
                }{" "}
                {pendingRewards.length ===
                1
                  ? "recompensa pendiente"
                  : "recompensas pendientes"}
              </h2>

              <div className="reward-selector__list">
                {pendingRewards.map(
                  (
                    pendingReward,
                    index,
                  ) => {
                    const selectedReward =
                      pendingReward
                        .selected_reward;

                    return (
                      <article
                        key={
                          pendingReward.id
                        }
                        className="reward-selector__pending-card"
                      >
                        <p className="reward-selector__pending-index">
                          Recompensa{" "}
                          {index + 1}
                        </p>

                        <p className="reward-selector__pending-status">
                          {selectedReward
                            ? "RECOMPENSA ELEGIDA"
                            : "PREMIO DESBLOQUEADO"}
                        </p>

                        {selectedReward ? (
                          <>
                            <h3 className="reward-selector__subtitle">
                              {
                                selectedReward.name
                              }
                            </h3>

                            {selectedReward.description && (
                              <p className="reward-selector__copy">
                                {
                                  selectedReward.description
                                }
                              </p>
                            )}

                            <div className="reward-selector__chosen">
                              Pendiente de canje
                            </div>

                            <p className="reward-selector__copy">
                              Presenta esta
                              recompensa en el
                              negocio para
                              reclamarla.
                            </p>
                          </>
                        ) : (
                          <>
                            <h3 className="reward-selector__subtitle">
                              Elige tu
                              recompensa
                            </h3>

                            <p className="reward-selector__copy">
                              Completaste tu
                              tarjeta. Selecciona
                              el premio que
                              quieres reclamar.
                            </p>

                            {rewardCatalog.length >
                            0 ? (
                              <div className="reward-options">
                                {rewardCatalog.map(
                                  (
                                    rewardOption,
                                  ) => {
                                    const actionKey =
                                      `${pendingReward.id}:${rewardOption.id}`;

                                    const isSelecting =
                                      selectingKey ===
                                      actionKey;

                                    return (
                                      <div
                                        key={
                                          rewardOption.id
                                        }
                                        className="reward-option"
                                      >
                                        <div className="reward-option__content">
                                          <h4 className="reward-option__title">
                                            {
                                              rewardOption.name
                                            }
                                          </h4>

                                          {rewardOption.description && (
                                            <p className="reward-option__description">
                                              {
                                                rewardOption.description
                                              }
                                            </p>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          className="reward-option__button"
                                          disabled={
                                            Boolean(
                                              selectingKey,
                                            )
                                          }
                                          onClick={() =>
                                            handleSelectReward(
                                              pendingReward.id,
                                              rewardOption.id,
                                            )
                                          }
                                        >
                                          {isSelecting
                                            ? "Eligiendo..."
                                            : "Elegir"}
                                        </button>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            ) : (
                              <p className="reward-selector__copy">
                                No hay
                                recompensas
                                disponibles en
                                este momento.
                              </p>
                            )}
                          </>
                        )}
                      </article>
                    );
                  },
                )}
              </div>

              {selectionMessage && (
                <p className="reward-selector__feedback">
                  {
                    selectionMessage
                  }
                </p>
              )}
            </section>
          )}

          {data.last_visit && (
            <p className="snapshot-note">
              Última visita:{" "}
              {new Date(
                data.last_visit,
              ).toLocaleString(
                "es-CO",
              )}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

// -----------------------------------------------------------
// Estado genérico
// -----------------------------------------------------------

function PublicState({
  eyebrow = "Tu tarjeta",
  title,
  text,
}) {
  return (
    <main className="loyalty-page">
      <div className="loyalty-shell">
        <BrandHeader />

        <section className="loyalty-content">
          <p className="eyebrow">
            {eyebrow}
          </p>

          <h1 className="display-title">
            {title}
          </h1>

          {text && (
            <p className="body-copy">
              {text}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}