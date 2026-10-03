import {
  Button,
} from "../../ui/Button/Button";

import "./RegistrationForm.css";


export default function RegistrationForm({
  form,
  setForm,
  consentText,
  onSubmit,
  submitting,
  error,
}) {
  // =========================================================
  // ACTUALIZAR CAMPO NORMAL
  // =========================================================

  function updateField(
    field,
    value,
  ) {
    setForm({
      ...form,

      [field]:
        value,
    });
  }


  // =========================================================
  // CÉDULA
  //
  // Solo permitimos números.
  // Máximo 15 dígitos, igual que la validación del backend.
  // =========================================================

  function handleCedulaChange(
    event,
  ) {
    const value =
      event.target.value
        .replace(
          /\D/g,
          "",
        )
        .slice(
          0,
          15,
        );


    updateField(
      "cedula",
      value,
    );
  }


  return (
    <form
      onSubmit={
        onSubmit
      }
      className="registration-form"
    >

      {/* =====================================================
          NOMBRE
          ===================================================== */}

      <label className="form-field">

        Nombre completo

        <input
          type="text"
          value={
            form.name
          }
          onChange={(
            event,
          ) =>
            updateField(
              "name",
              event.target
                .value,
            )
          }
          autoComplete="name"
          placeholder="Tu nombre"
          maxLength={60}
          required
        />

      </label>


      {/* =====================================================
          CÉDULA
          ===================================================== */}

      <label className="form-field">

        Cédula de ciudadanía

        <input
          type="text"
          inputMode="numeric"
          value={
            form.cedula
          }
          onChange={
            handleCedulaChange
          }
          placeholder="1234567890"
          pattern="[0-9]{5,15}"
          minLength={5}
          maxLength={15}
          autoComplete="off"
          required
        />

      </label>


      {/* =====================================================
          WHATSAPP
          ===================================================== */}

      <label className="form-field">

        WhatsApp

        <input
          type="tel"
          inputMode="tel"
          placeholder="3001234567"
          value={
            form.whatsapp
          }
          onChange={(
            event,
          ) =>
            updateField(
              "whatsapp",
              event.target
                .value,
            )
          }
          autoComplete="tel"
          required
        />

      </label>


      {/* =====================================================
          CUMPLEAÑOS
          ===================================================== */}

      <label className="form-field">

        Cumpleaños · opcional

        <input
          type="date"
          value={
            form.birthday
          }
          onChange={(
            event,
          ) =>
            updateField(
              "birthday",
              event.target
                .value,
            )
          }
        />

      </label>


      {/* =====================================================
          CONSENTIMIENTO
          ===================================================== */}

      <label className="consent-row">

        <input
          type="checkbox"
          checked={
            form.consent
          }
          onChange={(
            event,
          ) =>
            updateField(
              "consent",
              event.target
                .checked,
            )
          }
          required
        />


        <span>
          {consentText}
        </span>

      </label>


      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <p className="error-text registration-form__error">
          {error}
        </p>
      )}


      {/* =====================================================
          ENVIAR
          ===================================================== */}

      <Button
        type="submit"
        variant="sticker"
        fullWidth
        disabled={
          submitting
        }
      >
        {submitting
          ? "Guardando…"
          : "Unirme y sumar mi primer sello"}
      </Button>

    </form>
  );
}