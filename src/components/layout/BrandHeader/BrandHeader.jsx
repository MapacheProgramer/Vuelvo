import ThemeToggle from "../../ui/ThemeToggle/ThemeToggle";
import "./BrandHeader.css";

export default function BrandHeader({ business }) {
  return (
    <header className="brand-bar">
      <div className="brand-bar__identity">
        {business?.logo_url && (
          <img
            src={business.logo_url}
            alt=""
            className="brand-logo"
          />
        )}

        <p className="brand-name">
          {business?.name || "Vuelvo"}
        </p>
      </div>

      <ThemeToggle />
    </header>
  );
}