import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabase.js";
import "./InvitePage.css";

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && session?.user && event === "PASSWORD_RECOVERY") {
        setReady(true);
        setLoading(false);
        setError("");
      }
    });
    // Solo se acepta una sesion normal si proviene de un enlace de recuperacion.
    // La sesion sin enlace no debe habilitar esta pantalla.
    const fromRecoveryLink = /(?:[?#&])type=recovery(?:[&#]|$)/.test(window.location.href);
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError("No pudimos validar la sesión.");
      setReady((previous) => previous || Boolean(fromRecoveryLink && data?.session?.user));
      setLoading(false);
    }).catch(() => {
      if (active) { setError("No pudimos validar la sesión."); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || "No pudimos guardar la contraseña.");
    } else {
      setPassword("");
      setConfirmPassword("");
      await supabase.auth.signOut();
      setDone(true);
    }
    setSubmitting(false);
  }

  const fieldStyle = {
    width: "100%", boxSizing: "border-box", padding: "13px 14px",
    border: "1px solid rgba(255,255,255,0.22)", borderRadius: "8px",
    background: "rgba(255,255,255,0.05)", color: "inherit",
  };
  return (
    <main className="invite-page">
      <section className="invite-card">
        <p className="invite-page__eyebrow">VUELVO</p>
        <h1>Restablecer contraseña</h1>
        {done ? (
          <p>Contraseña actualizada. <Link to="/login">Iniciar sesión</Link></p>
        ) : loading ? (
          <p>Verificando el enlace...</p>
        ) : !ready ? (
          <p>El enlace no es válido o ha caducado. Solicita uno nuevo al administrador.</p>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: "16px" }}>
            <label style={{ display: "grid", gap: "7px" }}>
              Nueva contraseña
              <input type="password" minLength={8} required autoComplete="new-password"
                value={password} onChange={(event) => setPassword(event.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: "7px" }}>
              Confirmar contraseña
              <input type="password" minLength={8} required autoComplete="new-password"
                value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} style={fieldStyle} />
            </label>
            {error && <p role="alert" style={{ color: "#ffb4ab" }}>{error}</p>}
            <button type="submit" disabled={submitting} className="invite-form__submit">
              {submitting ? "GUARDANDO..." : "GUARDAR CONTRASEÑA"}
            </button>
          </form>
        )}
        {!done && error && !ready && <p role="alert">{error}</p>}
      </section>
    </main>
  );
}
