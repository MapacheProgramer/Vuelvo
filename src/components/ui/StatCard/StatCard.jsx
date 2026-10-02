import "./StatCard.css";

export default function StatCard({ value, label, note }) {
  return (
    <article className="stat-card">
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
      {note && <span className="stat-card__note">{note}</span>}
    </article>
  );
}
