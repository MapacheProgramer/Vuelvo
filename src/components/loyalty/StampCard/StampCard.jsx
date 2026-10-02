import Panel from "../../ui/Panel/Panel";
import "./StampCard.css";

export default function StampCard({
  stamps,
  required,
  rewardName = "Recompensa del negocio",
  rewardAvailable = false,
  rewardEarned = false,
}) {
  const hasProgress = Number.isFinite(Number(stamps)) && Number.isFinite(Number(required)) && Number(required) > 0;
  const total = hasProgress ? Number(required) : 0;
  const current = hasProgress ? Math.min(Math.max(Number(stamps), 0), total) : 0;
  const filled = rewardEarned && hasProgress ? total : current;
  const remaining = hasProgress ? Math.max(total - current, 0) : null;

  return (
    <Panel className="stamp-card" aria-label="Progreso de sellos">
      <div className="stamp-card__heading">
        <strong>{hasProgress ? `${filled} / ${total}` : "—"}</strong>
        <span>{hasProgress ? "sellos" : "progreso guardado"}</span>
      </div>

      {hasProgress ? (
        <div className="stamp-grid" aria-label={`${filled} de ${total} sellos`}>
          {Array.from({ length: total }).map((_, index) => (
            <span
              key={index}
              className={`stamp ${index < filled ? "stamp--on" : "stamp--off"}`}
              aria-hidden="true"
            >
              {index < filled ? "✓" : index + 1}
            </span>
          ))}
        </div>
      ) : (
        <p className="body-copy">
          Tu tarjeta está activa. El servidor todavía no devolvió el contador de sellos para esta consulta.
        </p>
      )}

      <div className="reward-panel">
        <p className="reward-label">Tu recompensa</p>
        <p className="reward-name">{rewardName}</p>
        {remaining !== null && (
          <p className="body-copy">
            {remaining === 0
              ? "Tarjeta completada."
              : remaining === 1
                ? "Te falta 1 sello para tu próxima recompensa."
                : `Te faltan ${remaining} sellos para tu próxima recompensa.`}
          </p>
        )}
      </div>

      {(rewardAvailable || rewardEarned) && (
        <div className="reward-earned">
          <p className="reward-label">RECOMPENSA DISPONIBLE</p>
          <strong>{rewardName}</strong>
          {rewardAvailable && (
            <p className="reward-earned__copy">
              Ya completaste una tarjeta. Puedes reclamar esta recompensa en el negocio.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
