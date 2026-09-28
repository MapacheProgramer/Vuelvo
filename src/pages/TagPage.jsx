import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/visit`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Token que identifica el dispositivo sin login
function newToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "d-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
}

function getDeviceToken() {
  try {
    let t = localStorage.getItem("device_token");
    if (!t) {
      t = newToken();
      localStorage.setItem("device_token", t);
    }
    return t;
  } catch {
    return newToken();
  }
}

async function callVisit(body) {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function TagPage() {
  const { code } = useParams();
  const [state, setState] = useState({ status: "loading" });
  const [form, setForm] = useState({ name: "", whatsapp: "", birthday: "", consent: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await callVisit({ code, device_token: getDeviceToken() });
      if (data.status === "redirect") {
        window.location.replace(data.url);
        return;
      }
      setState(data);
    } catch {
      setState({ status: "error", message: "No hay conexión. Intenta de nuevo." });
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await callVisit({
        code,
        device_token: getDeviceToken(),
        registration: form,
      });
      if (data.status === "error") setError(data.message);
      else setState(data);
    } catch {
      setError("No hay conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const brand = state.business?.brand_color || "#7c3aed";

  return (
    <main style={{ ...styles.page, "--brand": brand }}>
      <div style={styles.card}>
        {state.business && (
          <header style={styles.header}>
            {state.business.logo_url && (
              <img src={state.business.logo_url} alt="" style={styles.logo} />
            )}
            <h1 style={styles.bizName}>{state.business.name}</h1>
          </header>
        )}

        {state.status === "loading" && <p style={styles.muted}>Cargando…</p>}

        {state.status === "not_found" && (
          <p style={styles.muted}>Este código no está activo. Pídele al equipo que lo revise.</p>
        )}

        {state.status === "error" && <p style={styles.errorText}>{state.message}</p>}

        {state.status === "needs_registration" && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <h2 style={styles.title}>Únete y empieza a sumar sellos</h2>
            <p style={styles.muted}>
              Al completar {state.business.stamps_required} sellos ganas: {state.business.reward_name}.
            </p>

            <label style={styles.label}>
              Nombre
              <input
                style={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoComplete="given-name"
                required
              />
            </label>

            <label style={styles.label}>
              WhatsApp
              <input
                style={styles.input}
                type="tel"
                inputMode="tel"
                placeholder="3001234567"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                autoComplete="tel"
                required
              />
            </label>

            <label style={styles.label}>
              Cumpleaños (opcional)
              <input
                style={styles.input}
                type="date"
                value={form.birthday}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              />
            </label>

            <label style={styles.consent}>
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                required
              />
              <span>{state.consent_text}</span>
            </label>

            {error && <p style={styles.errorText}>{error}</p>}

            <button type="submit" style={styles.button} disabled={submitting}>
              {submitting ? "Guardando…" : "Unirme y sumar mi primer sello"}
            </button>
          </form>
        )}

        {state.status === "registered_ok" && (
          <Stamps
            name={state.customer.name}
            stamps={state.stamps}
            required={state.required}
            rewardEarned={state.reward_earned}
            rewardName={state.business.reward_name}
          />
        )}

        {state.status === "too_soon" && (
          <div>
            <h2 style={styles.title}>Hola, {state.customer.name}</h2>
            <p style={styles.muted}>
              Ya sumaste un sello hace poco. Vuelve en tu próxima visita para sumar otro.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Stamps({ name, stamps, required, rewardEarned, rewardName }) {
  const filled = rewardEarned ? required : stamps;
  return (
    <div>
      <h2 style={styles.title}>
        {rewardEarned ? `¡Lo lograste, ${name}!` : `Sello sumado, ${name}`}
      </h2>

      {rewardEarned ? (
        <p style={styles.reward}>
          Ganaste: {rewardName}. Muéstrale esta pantalla al equipo para canjearlo.
        </p>
      ) : (
        <p style={styles.muted}>
          Llevas {stamps} de {required}. Te faltan {required - stamps} para: {rewardName}.
        </p>
      )}

      <div style={styles.grid} aria-label={`${filled} de ${required} sellos`}>
        {Array.from({ length: required }).map((_, i) => (
          <span
            key={i}
            style={{ ...styles.stamp, ...(i < filled ? styles.stampOn : styles.stampOff) }}
          />
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    padding: "24px 16px",
    background: "#f6f5f3",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    color: "#1c1b1a",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 1px 2px rgba(0,0,0,.06)",
    borderTop: "6px solid var(--brand)",
  },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  logo: { width: 44, height: 44, borderRadius: 10, objectFit: "cover" },
  bizName: { fontSize: 20, margin: 0, fontWeight: 700 },
  title: { fontSize: 22, margin: "0 0 8px", lineHeight: 1.2 },
  muted: { color: "#6b6864", lineHeight: 1.5, margin: "0 0 16px" },
  errorText: { color: "#b3261e", margin: "0 0 12px" },
  reward: { color: "var(--brand)", fontWeight: 600, lineHeight: 1.5, margin: "0 0 16px" },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 },
  input: {
    font: "inherit",
    fontWeight: 400,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #d8d5d0",
    fontSize: 16,
  },
  consent: { display: "flex", gap: 10, fontSize: 12, color: "#6b6864", lineHeight: 1.4 },
  button: {
    font: "inherit",
    fontWeight: 700,
    padding: "14px 16px",
    borderRadius: 12,
    border: "none",
    background: "var(--brand)",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 8 },
  stamp: { aspectRatio: "1", borderRadius: "50%", display: "block" },
  stampOn: { background: "var(--brand)" },
  stampOff: { border: "2px dashed #cfcbc5" },
};
