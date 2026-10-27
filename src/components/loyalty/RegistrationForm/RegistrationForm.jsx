import {
  useState,
} from "react";

import {
  Button,
} from "../../ui/Button/Button";

import "./RegistrationForm.css";


export default function RegistrationForm({
  form,
  setForm,
  consentText,
  marketingConsentText,
  privacyLegalName,
  privacyPolicyUrl,
  onSubmit,
  submitting,
  error,
}) {
  const [
    fieldErrors,
    setFieldErrors,
  ] = useState({});


  // =========================================================
  // LIMPIAR ERROR DE UN CAMPO
  // =========================================================

  function clearFieldError(
    field,
  ) {
    setFieldErrors(
      (current) => {
        if (!current[field]) {
          return current;
        }

        const next = {
          ...current,
        };

        delete next[field];

        return next;
      },
    );
  }


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


    clearFieldError(
      field,
    );
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


  // =========================================================
  // VALIDAR WHATSAPP
  // =========================================================

  function isValidWhatsapp(
    raw,
  ) {
    const digits =
      raw.replace(
        /\D/g,
        "",
      );


    if (
      digits.length === 10 &&
      digits.startsWith(
        "3",
      )
    ) {
      return true;
    }


    if (
      digits.length === 12 &&
      digits.startsWith(
        "57",
      )
    ) {
      return true;
    }


    return (
      digits.length >= 11 &&
      digits.length <= 15
    );
  }


  // =========================================================
  // VALIDACIÓN VISUAL DEL FORMULARIO
  // =========================================================

  function validateForm() {
    const nextErrors = {};


    if (
      !form.name.trim()
    ) {
      nextErrors.name =
        "Escribe tu nombre completo.";
    } else if (
      form.name.trim().length < 2
    ) {
      nextErrors.name =
        "El nombre es demasiado corto.";
    }


    if (
      !form.cedula
    ) {
      nextErrors.cedula =
        "Escribe tu número de cédula.";
    } else if (
      !/^[0-9]{5,15}$/.test(
        form.cedula,
      )
    ) {
      nextErrors.cedula =
        "La cédula debe tener entre 5 y 15 números.";
    }


    if (
      !form.whatsapp.trim()
    ) {
      nextErrors.whatsapp =
        "Escribe tu número de WhatsApp.";
    } else if (
      !isValidWhatsapp(
        form.whatsapp,
      )
    ) {
      nextErrors.whatsapp =
        "Escribe un número de WhatsApp válido.";
    }


    if (
      !form.consent
    ) {
      nextErrors.consent =
        "Debes autorizar el tratamiento de tus datos para continuar.";
    }


    setFieldErrors(
      nextErrors,
    );


    return (
      Object.keys(
        nextErrors,
      ).length === 0
    );
  }


  // =========================================================
  // ENVIAR
  // =========================================================

  function handleSubmit(
    event,
  ) {
    event.preventDefault();


    if (
      !validateForm()
    ) {
      return;
    }


    onSubmit(
      event,
    );
  }


  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="registration-form"
      noValidate
    >

      {/* =====================================================
          NOMBRE
          ===================================================== */}

      <label
        className={[
          "form-field",

          fieldErrors.name
            ? "form-field--error"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >

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
          aria-invalid={
            Boolean(
              fieldErrors.name,
            )
          }
        />


        {fieldErrors.name && (
          <span className="form-field__error">
            {fieldErrors.name}
          </span>
        )}

      </label>


      {/* =====================================================
          CÉDULA
          ===================================================== */}

      <label
        className={[
          "form-field",

          fieldErrors.cedula
            ? "form-field--error"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >

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
          aria-invalid={
            Boolean(
              fieldErrors.cedula,
            )
          }
        />


        {fieldErrors.cedula && (
          <span className="form-field__error">
            {fieldErrors.cedula}
          </span>
        )}

      </label>


      {/* =====================================================
          WHATSAPP
          ===================================================== */}

      <label
        className={[
          "form-field",

          fieldErrors.whatsapp
            ? "form-field--error"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >

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
          aria-invalid={
            Boolean(
              fieldErrors.whatsapp,
            )
          }
        />


        {fieldErrors.whatsapp && (
          <span className="form-field__error">
            {fieldErrors.whatsapp}
          </span>
        )}

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
          AVISO DE PRIVACIDAD DEL NEGOCIO
          ===================================================== */}

      <p className="registration-form__privacy-notice">
        Responsable del tratamiento:{" "}
        <strong>{privacyLegalName || "este negocio"}</strong>.
        {privacyPolicyUrl ? (
          <>
            {" "}Consulta su{" "}
            <a
              href={privacyPolicyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              política de tratamiento de datos personales
            </a>
            {" "}antes de autorizar el registro.
          </>
        ) : (
          <>
            {" "}El negocio aún no ha publicado el enlace
            a su política de tratamiento de datos.
          </>
        )}
      </p>


      {/* =====================================================
          CONSENTIMIENTO
          ===================================================== */}

      <label
        className={[
          "consent-row",

          fieldErrors.consent
            ? "consent-row--error"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >

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
          aria-invalid={
            Boolean(
              fieldErrors.consent,
            )
          }
        />


        <span>
          {consentText}
        </span>

      </label>


      {fieldErrors.consent && (
        <p
          className="form-consent-error"
          role="alert"
        >
          {fieldErrors.consent}
        </p>
      )}


      {/* =====================================================
          PROMOCIONES - OPCIONAL
          ===================================================== */}

      <label className="consent-row">

        <input
          type="checkbox"
          checked={form.marketing_consent === true}
          onChange={(event) =>
            updateField(
              "marketing_consent",
              event.target.checked,
            )
          }
        />

        <span>
          {marketingConsentText ||
            "Quiero recibir promociones por WhatsApp (opcional)."}
        </span>

      </label>


      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <p
          className="error-text registration-form__error"
          role="alert"
        >
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