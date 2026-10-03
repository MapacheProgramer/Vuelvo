import "./StatCard.css";

export default function StatCard({
  value,
  label,
  note,
  emphasis = false,
}) {
  return (
    <article
      className={[
        "stat-card",
        emphasis
          ? "stat-card--emphasis"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="stat-card__label">
        {label}
      </span>

      <strong className="stat-card__value">
        {value}
      </strong>

      {note && (
        <span className="stat-card__note">
          {note}
        </span>
      )}
    </article>
  );
}