import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BrandHeader from "../../components/layout/BrandHeader/BrandHeader";
import RegistrationForm from "../../components/loyalty/RegistrationForm/RegistrationForm";
import StampCard from "../../components/loyalty/StampCard/StampCard";
import { ButtonLink } from "../../components/ui/Button/Button";
import { registerVisit } from "../../features/loyalty/api/visitApi";
import { readLoyaltySnapshot, saveLoyaltySnapshot } from "../../features/loyalty/storage/loyaltyStorage";
import { getDeviceToken } from "../../hooks/useDeviceToken";
import "./public-pages.css";

function cacheProgress(code, data) {
  const cached = readLoyaltySnapshot(code);
  saveLoyaltySnapshot(code, {
    business: data.business ?? cached?.business,
    customerName: data.customer?.name ?? cached?.customerName,
    stamps: data.stamps ?? cached?.stamps,
    required: data.required ?? data.business?.stamps_required ?? cached?.required,
    rewardEarned: data.reward_earned ?? cached?.rewardEarned ?? false,
    rewardName: data.business?.reward_name ?? cached?.rewardName,
  });
}

export default function TagPage() {
  const { code } = useParams();
  const [state, setState] = useState({ status: "loading" });
  const [form, setForm] = useState({ name: "", whatsapp: "", birthday: "", consent: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const data = await registerVisit({ code, device_token: getDeviceToken() });
        if (cancelled) return;
        if (data.status === "redirect") {
          window.location.replace(data.url);
          return;
        }
        if (data.status === "registered_ok" || data.status === "too_soon") cacheProgress(code, data);
        setState(data);
      } catch {
        if (!cancelled) setState({ status: "error", message: "No hay conexión. Intenta de nuevo." });
      }
    }

    start();
    return () => { cancelled = true; };
  }, [code]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const data = await registerVisit({
        code,
        device_token: getDeviceToken(),
        registration: form,
      });

      if (data.status === "error") {
        setError(data.message);
        return;
      }

      if (data.status === "registered_ok" || data.status === "too_soon") cacheProgress(code, data);
      setState(data);
    } catch {
      setError("No hay conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="loyalty-page">
      <div className="loyalty-shell">
        <BrandHeader business={state.business} />
        <section className="loyalty-content">
          {state.status === "loading" && <LoadingState />}
          {state.status === "not_found" && <SimpleState title="Código no disponible" text="Este código no está activo. Pídele al equipo que lo revise." />}
          {state.status === "error" && <SimpleState title="Algo salió mal" text={state.message} error />}

          {state.status === "needs_registration" && (
            <Registration
              state={state}
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
            />
          )}

          {state.status === "registered_ok" && (
            <VisitResult state={state} code={code} justStamped />
          )}

          {state.status === "too_soon" && (
            <VisitResult state={state} code={code} justStamped={false} />
          )}
        </section>
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="status-box">
      <div className="loading-mark" aria-hidden="true" />
      <p className="eyebrow">Vuelvo</p>
      <h1 className="display-title">Cargando tu tarjeta</h1>
    </div>
  );
}

function SimpleState({ title, text, error = false }) {
  return (
    <div className="status-box">
      <p className="eyebrow">Vuelvo</p>
      <h1 className="display-title">{title}</h1>
      <p className={`body-copy${error ? " error-text" : ""}`}>{text}</p>
    </div>
  );
}

function Registration({ state, form, setForm, onSubmit, submitting, error }) {
  return (
    <>
      <p className="eyebrow">Tu tarjeta digital</p>
      <h1 className="display-title">Empieza a sumar sellos</h1>
      <p className="body-copy">
        Completa {state.business?.stamps_required} sellos y recibe {state.business?.reward_name}.
      </p>
      <RegistrationForm
        form={form}
        setForm={setForm}
        consentText={state.consent_text}
        onSubmit={onSubmit}
        submitting={submitting}
        error={error}
      />
    </>
  );
}

function VisitResult({ state, code, justStamped }) {
  const rewardEarned = Boolean(state.reward_earned);
  const name = state.customer?.name;

  return (
    <>
      <p className="eyebrow">Tu tarjeta</p>
      <h1 className="display-title">
        {rewardEarned
          ? `Recompensa desbloqueada${name ? `, ${name}` : ""}`
          : `Hola${name ? `, ${name}` : ""}`}
      </h1>
      <p className="body-copy">
        {rewardEarned
          ? "Completaste tu tarjeta. Tu recompensa ya está disponible."
          : justStamped
            ? "Tu visita quedó registrada. Este es tu progreso actual."
            : "Ya habías sumado un sello hace poco. Tu progreso sigue guardado."}
      </p>

      <StampCard
        stamps={state.stamps}
        required={state.required ?? state.business?.stamps_required}
        rewardName={state.business?.reward_name || "Recompensa del negocio"}
        rewardEarned={rewardEarned}
      />

      <ButtonLink to={`/card/${code}`} variant="outline" fullWidth className="public-page__secondary-action">
        Ver mi tarjeta sin sumar otro sello
      </ButtonLink>
    </>
  );
}
