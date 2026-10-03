import "./StampCard.css";

export default function StampCard({
  stamps = 0,
  required = 8,
  rewardName = "Premio de la casa",
  rewardAvailable = false,
}) {
  const safeRequired = Number(required) > 0 ? Number(required) : 8;
  const safeStamps = Math.max(
    0,
    Math.min(Number(stamps) || 0, safeRequired),
  );

  const remaining = Math.max(safeRequired - safeStamps, 0);

  const stampItems = Array.from(
    { length: safeRequired },
    (_, index) => index + 1,
  );

  return (
    <section className="stamp-card">
      <div className="stamp-card__header">
        <div className="stamp-card__count">
          {safeStamps} / {safeRequired}
        </div>

        <div className="stamp-card__label">
          SELLOS
        </div>
      </div>

      <div className="stamp-card__grid">
        {stampItems.map((number) => {
          const active = number <= safeStamps;

          return (
            <div
              key={number}
              className={`stamp-card__stamp ${
                active ? "stamp-card__stamp--active" : ""
              }`}
            >
              {active ? "✓" : number}
            </div>
          );
        })}
      </div>

      <div className="stamp-card__divider" />

      <div className="stamp-card__reward-block">
        <p className="stamp-card__eyebrow">
          TU RECOMPENSA
        </p>

        <h3 className="stamp-card__reward-title">
          {rewardName}
        </h3>

        {!rewardAvailable ? (
          <p className="stamp-card__reward-copy">
            {remaining === 0
              ? "Ya completaste tu tarjeta."
              : `Te faltan ${remaining} sello${
                  remaining === 1 ? "" : "s"
                } para tu próxima recompensa.`}
          </p>
        ) : (
          <p className="stamp-card__reward-copy">
            Ya completaste una tarjeta.
          </p>
        )}
      </div>

      {rewardAvailable && (
        <div className="stamp-card__available">
          <p className="stamp-card__available-label">
            RECOMPENSA DISPONIBLE
          </p>

          <h4 className="stamp-card__available-title">
            {rewardName}
          </h4>

          <p className="stamp-card__available-copy">
            Ya completaste una tarjeta. Puedes reclamar esta
            recompensa en el negocio o elegir una opción si el
            comercio ofrece varias recompensas.
          </p>
        </div>
      )}
    </section>
  );
}