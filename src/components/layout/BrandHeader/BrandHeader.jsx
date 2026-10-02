import "./BrandHeader.css";

export default function BrandHeader({ business }) {
  return (
    <header className="brand-bar">
      {business?.logo_url && (
        <img src={business.logo_url} alt="" className="brand-logo" />
      )}
      <p className="brand-name">{business?.name || "Vuelvo"}</p>
    </header>
  );
}
