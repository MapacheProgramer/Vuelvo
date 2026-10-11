import "./StampCard.css";

function getContrastColor(hexColor) {
  const cleanHex = hexColor.replace("#", "");

  const red = parseInt(cleanHex.slice(0, 2), 16);
  const green = parseInt(cleanHex.slice(2, 4), 16);
  const blue = parseInt(cleanHex.slice(4, 6), 16);

  const luminance =
    (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#000000" : "#ffffff";
}

export default function StampCard({
  stamps = 0,
  required = 8,
  pendingVisit = false,
  rewardAvailable = false,
  rewardNeedsSelection = false,
  brandColor = "#f05a28",
}) {
  const safeRequired = Number(required) > 0 ? Number(required) : 8;
  const safeStamps = Math.max(0, Math.min(Number(stamps) || 0, safeRequired));
  const remaining = Math.max(safeRequired - safeStamps, 0);
  const pendingStampNumber =
    pendingVisit && safeStamps < safeRequired ? safeStamps + 1 : null;
  const stampItems = Array.from({ length: safeRequired }, (_, index) => index + 1);

  const safeBrandColor =
    typeof brandColor === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(brandColor.trim())
      ? brandColor.trim()
      : "#f05a28";

  const brandContrast =
    getContrastColor(safeBrandColor);

  function getRewardTitle() {
    if (rewardAvailable && rewardNeedsSelection) {
      return "YA PUEDES ELEGIR UNA RECOMPENSA";
    }
    if (rewardAvailable) {
      return "TIENES UNA RECOMPENSA PENDIENTE";
    }
    return "DESBLOQUEAS RECOMPENSAS";
  }

  function getRewardDescription() {
    if (rewardAvailable && rewardNeedsSelection) {
      return "Completaste una tarjeta. Elige una de las recompensas disponibles.";
    }
    if (rewardAvailable) {
      return "Tu recompensa ya fue elegida y está pendiente de canje en el negocio.";
    }
    if (pendingVisit) {
      return "Tienes un sello en espera de aprobación. Cuando el negocio lo apruebe, se sumará a tu tarjeta.";
    }
    if (remaining === 0) {
      return "Completaste tu tarjeta. Ya puedes desbloquear una recompensa.";
    }
    return `Te faltan ${remaining} ${remaining === 1 ? "sello" : "sellos"} para desbloquear una recompensa.`;
  }

  return (
    <section
      className="stamp-card"
      style={{
        "--stamp-brand-color": safeBrandColor,
        "--stamp-brand-contrast": brandContrast,
      }}
    >
      <div className="stamp-card__header">
        <div className="stamp-card__count">
          {safeStamps} / {safeRequired}
        </div>
        <div className="stamp-card__label">SELLOS</div>
      </div>

      <div className="stamp-card__grid">
        {stampItems.map((stampNumber) => {
          const active = stampNumber <= safeStamps;
          const pending = stampNumber === pendingStampNumber;

          return (
            <div
              key={stampNumber}
              className={[
                "stamp-card__stamp",
                active ? "stamp-card__stamp--active" : "",
                pending ? "stamp-card__stamp--pending" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {active ? "✓" : pending ? "EN ESPERA" : stampNumber}
            </div>
          );
        })}
      </div>

      <div className="stamp-card__divider" />

      <div className="stamp-card__reward-block">
        <p className="stamp-card__reward-kicker">
          {rewardAvailable ? "RECOMPENSA DESBLOQUEADA" : "AL COMPLETAR TU TARJETA"}
        </p>
        <h3 className="stamp-card__reward-name">{getRewardTitle()}</h3>
        <p className="stamp-card__reward-note">{getRewardDescription()}</p>
      </div>

      {rewardAvailable && (
        <div className="stamp-card__available">
          <p className="stamp-card__available-title">RECOMPENSA DESBLOQUEADA</p>
          <strong className="stamp-card__available-name">
            {rewardNeedsSelection ? "ELIGE TU PREMIO" : "PENDIENTE DE CANJE"}
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
