import "./StampCard.css";


export default function StampCard({
  stamps = 0,
  required = 8,
  rewardAvailable = false,
  rewardNeedsSelection = false,
}) {
  const safeRequired =
    Number(required) > 0
      ? Number(required)
      : 8;

  const safeStamps =
    Math.max(
      0,
      Math.min(
        Number(stamps) || 0,
        safeRequired,
      ),
    );

  const remaining =
    Math.max(
      safeRequired -
        safeStamps,
      0,
    );

  const stampItems =
    Array.from(
      {
        length:
          safeRequired,
      },
      (_, index) =>
        index + 1,
    );


  function getRewardTitle() {
    if (
      rewardAvailable &&
      rewardNeedsSelection
    ) {
      return "YA PUEDES ELEGIR UNA RECOMPENSA";
    }

    if (rewardAvailable) {
      return "TIENES UNA RECOMPENSA PENDIENTE";
    }

    return "DESBLOQUEAS RECOMPENSAS";
  }


  function getRewardDescription() {
    if (
      rewardAvailable &&
      rewardNeedsSelection
    ) {
      return "Completaste una tarjeta. Elige una de las recompensas disponibles.";
    }

    if (rewardAvailable) {
      return "Tu recompensa ya fue elegida y está pendiente de canje en el negocio.";
    }

    if (remaining === 0) {
      return "Completaste tu tarjeta. Ya puedes desbloquear una recompensa.";
    }

    return `Te faltan ${remaining} ${
      remaining === 1
        ? "sello"
        : "sellos"
    } para desbloquear una recompensa.`;
  }


  return (
    <section className="stamp-card">

      <div className="stamp-card__header">

        <div className="stamp-card__count">
          {safeStamps} /{" "}
          {safeRequired}
        </div>

        <div className="stamp-card__label">
          SELLOS
        </div>

      </div>


      <div className="stamp-card__grid">

        {stampItems.map(
          (stampNumber) => {
            const active =
              stampNumber <=
              safeStamps;

            return (
              <div
                key={
                  stampNumber
                }
                className={[
                  "stamp-card__stamp",

                  active
                    ? "stamp-card__stamp--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {active
                  ? "✓"
                  : stampNumber}
              </div>
            );
          },
        )}

      </div>


      <div className="stamp-card__divider" />


      <div className="stamp-card__reward-block">

        <p className="stamp-card__reward-kicker">
          {rewardAvailable
            ? "RECOMPENSA DESBLOQUEADA"
            : "AL COMPLETAR TU TARJETA"}
        </p>


        <h3 className="stamp-card__reward-name">
          {getRewardTitle()}
        </h3>


        <p className="stamp-card__reward-note">
          {getRewardDescription()}
        </p>

      </div>


      {rewardAvailable && (
        <div className="stamp-card__available">

          <p className="stamp-card__available-title">
            RECOMPENSA DESBLOQUEADA
          </p>


          <strong className="stamp-card__available-name">
            {rewardNeedsSelection
              ? "ELIGE TU PREMIO"
              : "PENDIENTE DE CANJE"}
          </strong>


          <p className="stamp-card__available-note">
            {rewardNeedsSelection
              ? "Consulta las opciones disponibles y selecciona la que prefieras."
              : "Tu recompensa ya está elegida. Preséntala en el negocio para reclamarla."}
          </p>

        </div>
      )}

    </section>
  );
}