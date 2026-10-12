import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  createAdminBusiness,
} from "../../features/admin/api/adminApi.js";


const INITIAL_FORM = {
  name: "",
  slug: "",
  type: "general",
  ownerDisplayName: "",
  ownerEmail: "",
};


function makeSlug(
  value,
) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}


export default function AdminCreateBusinessPage() {
  const navigate =
    useNavigate();

  const [
    form,
    setForm,
  ] = useState(
    INITIAL_FORM,
  );

  const [
    slugEdited,
    setSlugEdited,
  ] = useState(
    false,
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(
    false,
  );

  const [
    error,
    setError,
  ] = useState(
    "",
  );


  function updateField(
    field,
    value,
  ) {
    setForm(
      (current) => {
        const next = {
          ...current,
          [field]:
            value,
        };

        if (
          field === "name" &&
          !slugEdited
        ) {
          next.slug =
            makeSlug(
              value,
            );
        }

        return next;
      },
    );
  }


  function handleSlugChange(
    value,
  ) {
    setSlugEdited(
      true,
    );

    setForm(
      (current) => ({
        ...current,
        slug:
          makeSlug(
            value,
          ),
      }),
    );
  }


  async function handleSubmit(
    event,
  ) {
    event.preventDefault();

    if (
      submitting
    ) {
      return;
    }

    setError(
      "",
    );

    try {
      setSubmitting(
        true,
      );

      await createAdminBusiness({
        name:
          form.name,

        slug:
          form.slug,

        type:
          form.type,

        ownerDisplayName:
          form.ownerDisplayName,

        ownerEmail:
          form.ownerEmail,
      });

      navigate(
        "/admin/negocios",
        {
          replace:
            true,
        },
      );
    } catch (
      submitError
    ) {
      console.error(
        "create business:",
        submitError,
      );

      setError(
        submitError?.message ||
        "No pudimos crear el negocio.",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }


  return (
    <main
      style={{
        minHeight:
          "100vh",

        padding:
          "32px",

        background:
          "var(--color-bg, #050505)",

        color:
          "var(--color-text, #ffffff)",
      }}
    >
      <div
        style={{
          width:
            "100%",

          maxWidth:
            "720px",

          margin:
            "0 auto",
        }}
      >
        <Link
          to="/admin/negocios"
          style={{
            color:
              "var(--color-accent, #f05a28)",

            textDecoration:
              "none",

            fontWeight:
              800,
          }}
        >
          ← VOLVER A NEGOCIOS
        </Link>


        <p
          style={{
            marginTop:
              "28px",

            marginBottom:
              "8px",

            fontWeight:
              900,

            letterSpacing:
              "0.08em",
          }}
        >
          ADMINISTRACIÓN DE VUELVO
        </p>


        <h1
          style={{
            marginTop:
              0,

            fontSize:
              "clamp(2rem, 6vw, 3.5rem)",
          }}
        >
          Nuevo negocio
        </h1>


        <p
          style={{
            marginBottom:
              "28px",

            opacity:
              0.72,
          }}
        >
          Crea el negocio y envía la invitación
          a su propietario.
        </p>


        <form
          onSubmit={
            handleSubmit
          }
          style={{
            display:
              "flex",

            flexDirection:
              "column",

            gap:
              "20px",
          }}
        >
          <Field
            label="Nombre del negocio"
            value={
              form.name
            }
            placeholder="Ej. Café Central"
            disabled={
              submitting
            }
            onChange={(
              value,
            ) =>
              updateField(
                "name",
                value,
              )
            }
          />


          <Field
            label="Identificador"
            value={
              form.slug
            }
            placeholder="cafe-central"
            disabled={
              submitting
            }
            onChange={
              handleSlugChange
            }
          />


          <Field
            label="Tipo de negocio"
            value={
              form.type
            }
            placeholder="Ej. cafetería"
            disabled={
              submitting
            }
            onChange={(
              value,
            ) =>
              updateField(
                "type",
                value,
              )
            }
          />


          <div
            style={{
              height:
                "1px",

              background:
                "rgba(255,255,255,0.12)",

              margin:
                "8px 0",
            }}
          />


          <h2
            style={{
              margin:
                0,
            }}
          >
            Propietario
          </h2>


          <Field
            label="Nombre del propietario"
            value={
              form.ownerDisplayName
            }
            placeholder="Nombre completo"
            disabled={
              submitting
            }
            onChange={(
              value,
            ) =>
              updateField(
                "ownerDisplayName",
                value,
              )
            }
          />


          <Field
            label="Correo del propietario"
            value={
              form.ownerEmail
            }
            type="email"
            placeholder="propietario@correo.com"
            disabled={
              submitting
            }
            onChange={(
              value,
            ) =>
              updateField(
                "ownerEmail",
                value,
              )
            }
          />


          {error && (
            <p
              style={{
                margin:
                  0,

                padding:
                  "12px 14px",

                border:
                  "1px solid #b42318",

                borderRadius:
                  "8px",

                color:
                  "#ffb4ab",
              }}
            >
              {error}
            </p>
          )}


          <button
            type="submit"
            disabled={
              submitting
            }
            style={{
              border:
                "none",

              borderRadius:
                "8px",

              padding:
                "14px 18px",

              background:
                "var(--color-accent, #f05a28)",

              color:
                "#ffffff",

              fontWeight:
                900,

              cursor:
                submitting
                  ? "not-allowed"
                  : "pointer",

              opacity:
                submitting
                  ? 0.65
                  : 1,
            }}
          >
            {submitting
              ? "CREANDO..."
              : "CREAR NEGOCIO"}
          </button>
        </form>
      </div>
    </main>
  );
}


function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}) {
  return (
    <label
      style={{
        display:
          "flex",

        flexDirection:
          "column",

        gap:
          "8px",

        fontWeight:
          700,
      }}
    >
      {label}


      <input
        type={
          type
        }
        value={
          value
        }
        placeholder={
          placeholder
        }
        disabled={
          disabled
        }
        required
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        style={{
          width:
            "100%",

          boxSizing:
            "border-box",

          padding:
            "13px 14px",

          border:
            "1px solid rgba(255,255,255,0.18)",

          borderRadius:
            "8px",

          background:
            "rgba(255,255,255,0.04)",

          color:
            "inherit",

          font:
            "inherit",
        }}
      />
    </label>
  );
}
