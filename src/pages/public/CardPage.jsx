import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BrandHeader from "../../components/layout/BrandHeader/BrandHeader";
import StampCard from "../../components/loyalty/StampCard/StampCard";
import { ButtonLink } from "../../components/ui/Button/Button";
import { getCardStatus } from "../../features/loyalty/api/cardApi";
import { getDeviceToken } from "../../hooks/useDeviceToken";
import "./public-pages.css";

export default function CardPage() {
  const { code } = useParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;

    async function loadCard() {
      try {
        const deviceToken = getDeviceToken({ create: false });
        if (!deviceToken) {
          if (!cancelled) setState({ loading: false, error: null, data: { status: "not_registered" } });
          return;
        }

        const data = await getCardStatus({ code, deviceToken });
        if (!cancelled) setState({ loading: false, error: null, data });
      } catch (error) {
        console.error("card-status:", error);
        if (!cancelled) setState({ loading: false, error: "No pudimos cargar tu tarjeta.", data: null });
      }
    }

    loadCard();
    return () => { cancelled = true; };
  }, [code]);

  if (state.loading) {
    return <PublicState title="Cargando..." text="Estamos consultando tu progreso." />;
  }

  if (state.error) {
    return <PublicState eyebrow="Vuelvo" title="Algo salió mal" text={state.error} />;
  }

  const data = state.data;

  if (data?.status === "not_registered" || !data) {
    return (
      <main className="loyalty-page">
        <div className="loyalty-shell">
          <BrandHeader business={data?.business} />
          <section className="loyalty-content">
            <p className="eyebrow">Tu tarjeta</p>
            <h1 className="display-title">Aún no tienes tarjeta</h1>
            <p className="body-copy">Escanea el código del negocio para registrarte y obtener tu primer sello.</p>
            <ButtonLink to={`/t/${code}`} variant="sticker" fullWidth className="public-page__primary-action">
              Escanear código
            </ButtonLink>
          </section>
        </div>
      </main>
    );
  }

  if (data.status === "not_found") {
    return <PublicState eyebrow="Código" title="No encontramos este negocio" />;
  }

  const required = Number(data.required) || 0;
  const stamps = Math.max(0, Math.min(Number(data.stamps) || 0, required || Infinity));
  const rewardName = data.business?.reward_name || "Recompensa del negocio";

  return (
    <main className="loyalty-page">
      <div className="loyalty-shell">
        <BrandHeader business={data.business} />
        <section className="loyalty-content">
          <p className="eyebrow">Tu tarjeta</p>
          <h1 className="display-title">Hola{data.customer?.name ? `, ${data.customer.name}` : ""}</h1>
          <p className="body-copy">Consulta tu progreso sin registrar una nueva visita.</p>

          <StampCard
            stamps={stamps}
            required={required}
            rewardName={rewardName}
            rewardAvailable={Boolean(data.reward_available)}
          />

          {data.last_visit && (
            <p className="snapshot-note">
              Última visita: {new Date(data.last_visit).toLocaleString("es-CO")}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function PublicState({ eyebrow = "Tu tarjeta", title, text }) {
  return (
    <main className="loyalty-page">
      <div className="loyalty-shell">
        <BrandHeader />
        <section className="loyalty-content">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display-title">{title}</h1>
          {text && <p className="body-copy">{text}</p>}
        </section>
      </div>
    </main>
  );
}
