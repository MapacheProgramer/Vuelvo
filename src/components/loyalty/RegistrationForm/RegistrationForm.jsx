import { Button } from "../../ui/Button/Button";
import "./RegistrationForm.css";

export default function RegistrationForm({ form, setForm, consentText, onSubmit, submitting, error }) {
  return (
    <form onSubmit={onSubmit} className="registration-form">
      <label className="form-field">
        Nombre
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          autoComplete="given-name"
          required
        />
      </label>

      <label className="form-field">
        WhatsApp
        <input
          type="tel"
          inputMode="tel"
          placeholder="3001234567"
          value={form.whatsapp}
          onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
          autoComplete="tel"
          required
        />
      </label>

      <label className="form-field">
        Cumpleaños · opcional
        <input
          type="date"
          value={form.birthday}
          onChange={(event) => setForm({ ...form, birthday: event.target.value })}
        />
      </label>

      <label className="consent-row">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(event) => setForm({ ...form, consent: event.target.checked })}
          required
        />
        <span>{consentText}</span>
      </label>

      {error && <p className="error-text registration-form__error">{error}</p>}

      <Button type="submit" variant="sticker" fullWidth disabled={submitting}>
        {submitting ? "Guardando…" : "Unirme y sumar mi primer sello"}
      </Button>
    </form>
  );
}
