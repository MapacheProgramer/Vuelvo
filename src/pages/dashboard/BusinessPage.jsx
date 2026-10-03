import {
  useEffect,
  useState,
} from "react";

import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout.jsx";

import {
  useAuth,
} from "../../features/auth/hooks/useAuth.js";

import {
  getBusiness,
  removeBusinessLogo,
  updateBusiness,
  uploadBusinessLogo,
} from "../../features/business/api/businessApi.js";

import "./BusinessPage.css";


const BUSINESS_TYPES = [
  {
    value:
      "tienda",

    label:
      "Tienda",
  },
  {
    value:
      "restaurante",

    label:
      "Restaurante",
  },
  {
    value:
      "cafeteria",

    label:
      "Cafetería",
  },
  {
    value:
      "belleza",

    label:
      "Belleza",
  },
  {
    value:
      "salud",

    label:
      "Salud",
  },
  {
    value:
      "veterinaria",

    label:
      "Veterinaria",
  },
  {
    value:
      "automotriz",

    label:
      "Automotriz",
  },
  {
    value:
      "fitness",

    label:
      "Gimnasio / Fitness",
  },
  {
    value:
      "servicios",

    label:
      "Servicios profesionales",
  },
  {
    value:
      "entretenimiento",

    label:
      "Entretenimiento",
  },
  {
    value:
      "otro",

    label:
      "Otro",
  },
];


const EMPTY_FORM = {
  name:
    "",

  slug:
    "",

  type:
    "",

  logoUrl:
    "",

  brandColor:
    "#000000",

  googleReviewUrl:
    "",

  stampsRequired:
    8,

  minHoursBetweenVisits:
    12,

  birthdayDaysBefore:
    7,

  reactivationDays:
    30,

  reviewDelayMinutes:
    60,
};


export default function BusinessPage() {
  const {
    businessId,
  } = useAuth();


  const [
    business,
    setBusiness,
  ] = useState(null);


  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM,
  );


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    saving,
    setSaving,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    success,
    setSuccess,
  ] = useState("");


  const [
    pendingLogoFile,
    setPendingLogoFile,
  ] = useState(null);


  const [
    logoPreview,
    setLogoPreview,
  ] = useState("");


  const [
    logoRemoved,
    setLogoRemoved,
  ] = useState(false);


  // =========================================================
  // CARGAR NEGOCIO
  // =========================================================

  useEffect(() => {
    let active =
      true;


    async function loadBusiness() {
      if (!businessId) {
        return;
      }


      try {
        setLoading(
          true,
        );


        setError(
          "",
        );


        const data =
          await getBusiness(
            businessId,
          );


        if (!active) {
          return;
        }


        setBusiness(
          data,
        );


        setForm(
          mapBusinessToForm(
            data,
          ),
        );


        setLogoPreview(
          data.logo_url ||
            "",
        );
      } catch (
        loadError
      ) {
        console.error(
          "business page:",
          loadError,
        );


        if (!active) {
          return;
        }


        setError(
          loadError?.message ||
            "No pudimos cargar el negocio.",
        );
      } finally {
        if (active) {
          setLoading(
            false,
          );
        }
      }
    }


    loadBusiness();


    return () => {
      active =
        false;
    };
  }, [
    businessId,
  ]);


  // =========================================================
  // CAMBIAR CAMPO
  // =========================================================

  function updateField(
    field,
    value,
  ) {
    setSuccess(
      "",
    );


    setError(
      "",
    );


    setForm(
      (
        current,
      ) => ({
        ...current,

        [field]:
          value,
      }),
    );
  }


  // =========================================================
  // SELECCIONAR LOGO
  // =========================================================

  function handleLogoChange(
    event,
  ) {
    const file =
      event.target
        .files?.[0];


    if (!file) {
      return;
    }


    setSuccess(
      "",
    );


    setError(
      "",
    );


    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];


    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setError(
        "El logo debe ser JPG, PNG o WEBP.",
      );


      event.target.value =
        "";

      return;
    }


    if (
      file.size >
      2 * 1024 * 1024
    ) {
      setError(
        "El logo no puede superar los 2 MB.",
      );


      event.target.value =
        "";

      return;
    }


    const reader =
      new FileReader();


    reader.onload = () => {
      setLogoPreview(
        typeof reader.result ===
          "string"
          ? reader.result
          : "",
      );
    };


    reader.readAsDataURL(
      file,
    );


    setPendingLogoFile(
      file,
    );


    setLogoRemoved(
      false,
    );
  }


  // =========================================================
  // QUITAR LOGO
  // =========================================================

  function handleRemoveLogo() {
    if (saving) {
      return;
    }


    setPendingLogoFile(
      null,
    );


    setLogoPreview(
      "",
    );


    setLogoRemoved(
      Boolean(
        business?.logo_url,
      ),
    );


    setSuccess(
      "",
    );


    setError(
      "",
    );
  }


  // =========================================================
  // RESTAURAR
  // =========================================================

  function handleReset() {
    if (
      !business ||
      saving
    ) {
      return;
    }


    setForm(
      mapBusinessToForm(
        business,
      ),
    );


    setPendingLogoFile(
      null,
    );


    setLogoRemoved(
      false,
    );


    setLogoPreview(
      business.logo_url ||
        "",
    );


    setError(
      "",
    );


    setSuccess(
      "",
    );
  }


  // =========================================================
  // GUARDAR
  // =========================================================

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();


    if (
      saving ||
      !business
    ) {
      return;
    }


    setError(
      "",
    );


    setSuccess(
      "",
    );


    try {
      validateForm(
        form,
      );


      setSaving(
        true,
      );


      let finalLogoUrl =
        logoRemoved
          ? ""
          : business.logo_url ||
            "";


      // =====================================================
      // SUBIR NUEVO LOGO
      // =====================================================

      if (
        pendingLogoFile
      ) {
        const uploadedLogo =
          await uploadBusinessLogo({
            businessId,

            file:
              pendingLogoFile,
          });


        finalLogoUrl =
          uploadedLogo.publicUrl;
      }


      // =====================================================
      // SETTINGS
      // =====================================================

      const nextSettings = {
        ...(
          business.settings ||
          {}
        ),

        stamps_required:
          Number(
            form.stampsRequired,
          ),

        min_hours_between_visits:
          Number(
            form.minHoursBetweenVisits,
          ),

        birthday_days_before:
          Number(
            form.birthdayDaysBefore,
          ),

        reactivation_days:
          Number(
            form.reactivationDays,
          ),

        review_delay_minutes:
          Number(
            form.reviewDelayMinutes,
          ),
      };


      // =====================================================
      // ACTUALIZAR NEGOCIO
      // =====================================================

      const updated =
        await updateBusiness({
          businessId,

          name:
            form.name,

          type:
            form.type,

          logoUrl:
            finalLogoUrl,

          brandColor:
            form.brandColor,

          googleReviewUrl:
            form.googleReviewUrl,

          settings:
            nextSettings,
        });


      // =====================================================
      // LIMPIAR LOGO ELIMINADO
      // =====================================================

      if (
        logoRemoved &&
        business.logo_url
      ) {
        try {
          await removeBusinessLogo(
            businessId,
          );
        } catch (
          cleanupError
        ) {
          console.warn(
            "logo cleanup:",
            cleanupError,
          );
        }
      }


      setBusiness(
        updated,
      );


      setForm(
        mapBusinessToForm(
          updated,
        ),
      );


      setPendingLogoFile(
        null,
      );


      setLogoRemoved(
        false,
      );


      setLogoPreview(
        updated.logo_url ||
          "",
      );


      setSuccess(
        "La configuración del negocio fue guardada correctamente.",
      );
    } catch (
      saveError
    ) {
      console.error(
        "save business:",
        saveError,
      );


      setError(
        saveError?.message ||
          "No pudimos guardar la configuración.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }


  // =========================================================
  // CARGANDO
  // =========================================================

  if (loading) {
    return (
      <DashboardLayout>

        <section className="business-page">

          <BusinessState
            title="CARGANDO NEGOCIO..."
            text="Estamos consultando la configuración."
          />

        </section>

      </DashboardLayout>
    );
  }


  // =========================================================
  // ERROR DE CARGA
  // =========================================================

  if (
    error &&
    !business
  ) {
    return (
      <DashboardLayout>

        <section className="business-page">

          <BusinessState
            title="NO PUDIMOS CARGAR EL NEGOCIO"
            text={
              error
            }
            error
          />

        </section>

      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>

      <form
        className="business-page"
        onSubmit={
          handleSubmit
        }
      >

        {/* ===================================================
            HERO
            =================================================== */}

        <header className="business-page__hero">

          <div>

            <p className="eyebrow">
              CONFIGURACIÓN
            </p>


            <h1>
              NEGOCIO
            </h1>


            <p className="business-page__intro">
              Administra la identidad, fidelización y
              automatizaciones del negocio.
            </p>

          </div>


          <div className="business-page__actions">

            <button
              type="button"
              className="business-page__reset"
              disabled={
                saving
              }
              onClick={
                handleReset
              }
            >
              RESTAURAR
            </button>


            <button
              type="submit"
              className="business-page__save"
              disabled={
                saving
              }
            >
              {saving
                ? "GUARDANDO..."
                : "GUARDAR CAMBIOS"}
            </button>

          </div>

        </header>


        {/* ===================================================
            FEEDBACK
            =================================================== */}

        {success && (
          <div className="business-feedback business-feedback--success">

            <strong>
              CAMBIOS GUARDADOS
            </strong>


            <p>
              {success}
            </p>

          </div>
        )}


        {error && (
          <div className="business-feedback business-feedback--error">

            <strong>
              REVISAR CONFIGURACIÓN
            </strong>


            <p>
              {error}
            </p>

          </div>
        )}


        {/* ===================================================
            INFORMACIÓN
            =================================================== */}

        <BusinessSection
          eyebrow="GENERAL"
          title="INFORMACIÓN DEL NEGOCIO"
          description="Información principal utilizada para identificar el establecimiento."
        >

          <div className="business-form-grid">

            <BusinessField
              label="NOMBRE"
              hint="Nombre visible del negocio."
            >

              <input
                type="text"
                value={
                  form.name
                }
                maxLength={100}
                disabled={
                  saving
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
                required
              />

            </BusinessField>


            <BusinessField
              label="TIPO DE NEGOCIO"
              hint="Selecciona la categoría que mejor representa el establecimiento."
            >

              <select
                value={
                  form.type
                }
                disabled={
                  saving
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "type",
                    event.target
                      .value,
                  )
                }
                required
              >

                <option value="">
                  Seleccionar
                </option>


                {BUSINESS_TYPES.map(
                  (
                    option,
                  ) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  ),
                )}

              </select>

            </BusinessField>


            <BusinessField
              label="IDENTIFICADOR INTERNO"
              hint="Es administrado por Vuelvo y no puede modificarse desde el panel."
              wide
            >

              <div className="business-readonly">

                <strong>
                  {form.slug}
                </strong>


                <span>
                  BLOQUEADO
                </span>

              </div>

            </BusinessField>

          </div>

        </BusinessSection>


        {/* ===================================================
            IDENTIDAD
            =================================================== */}

        <BusinessSection
          eyebrow="MARCA"
          title="IDENTIDAD VISUAL"
          description="Personaliza la apariencia con el logo y el color principal del negocio."
        >

          <div className="business-identity-grid">

            <div className="business-logo">

              <span className="business-field__label">
                LOGO
              </span>


              <div className="business-logo__preview">

                {logoPreview ? (
                  <img
                    src={
                      logoPreview
                    }
                    alt={`Logo de ${form.name}`}
                  />
                ) : (
                  <div className="business-logo__empty">

                    <strong>
                      {getInitials(
                        form.name,
                      )}
                    </strong>


                    <span>
                      SIN LOGO
                    </span>

                  </div>
                )}

              </div>


              <div className="business-logo__actions">

                <label
                  className={[
                    "business-logo__upload",

                    saving
                      ? "business-logo__upload--disabled"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >

                  {logoPreview
                    ? "CAMBIAR LOGO"
                    : "SUBIR LOGO"}


                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={
                      saving
                    }
                    onChange={
                      handleLogoChange
                    }
                  />

                </label>


                {logoPreview && (
                  <button
                    type="button"
                    className="business-logo__remove"
                    disabled={
                      saving
                    }
                    onClick={
                      handleRemoveLogo
                    }
                  >
                    QUITAR
                  </button>
                )}

              </div>


              <small>
                JPG, PNG o WEBP. Máximo 2 MB.
              </small>

            </div>


            <div className="business-identity__color">

              <BusinessField
                label="COLOR DE MARCA"
                hint="Color principal utilizado para personalizar la experiencia del negocio."
              >

                <div className="business-color-field">

                  <input
                    type="color"
                    value={
                      validColor(
                        form.brandColor,
                      )
                    }
                    disabled={
                      saving
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "brandColor",
                        event.target
                          .value,
                      )
                    }
                  />


                  <input
                    type="text"
                    value={
                      form.brandColor
                    }
                    placeholder="#7c3aed"
                    maxLength={7}
                    disabled={
                      saving
                    }
                    onChange={(
                      event,
                    ) =>
                      updateField(
                        "brandColor",
                        event.target
                          .value,
                      )
                    }
                  />

                </div>

              </BusinessField>


              <div className="business-brand-preview">

                <span>
                  VISTA PREVIA
                </span>


                <div
                  className="business-brand-preview__color"
                  style={{
                    backgroundColor:
                      validColor(
                        form.brandColor,
                      ),
                  }}
                />


                <strong>
                  {form.brandColor}
                </strong>

              </div>

            </div>

          </div>

        </BusinessSection>


        {/* ===================================================
            FIDELIZACIÓN
            =================================================== */}

        <BusinessSection
          eyebrow="PROGRAMA"
          title="FIDELIZACIÓN"
          description="Define las reglas principales para la acumulación de sellos."
        >

          <div className="business-form-grid">

            <BusinessField
              label="SELLOS NECESARIOS"
              hint="Cantidad de visitas necesarias para completar una tarjeta."
            >

              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={
                  form.stampsRequired
                }
                disabled={
                  saving
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "stampsRequired",
                    event.target
                      .value,
                  )
                }
                required
              />

            </BusinessField>


            <BusinessField
              label="HORAS ENTRE VISITAS"
              hint="Tiempo mínimo que debe pasar antes de permitir otro sello."
            >

              <div className="business-input-unit">

                <input
                  type="number"
                  min="0"
                  max="8760"
                  step="1"
                  value={
                    form.minHoursBetweenVisits
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "minHoursBetweenVisits",
                      event.target
                        .value,
                    )
                  }
                  required
                />


                <span>
                  HORAS
                </span>

              </div>

            </BusinessField>

          </div>

        </BusinessSection>


        {/* ===================================================
            AUTOMATIZACIONES
            =================================================== */}

        <BusinessSection
          eyebrow="REGLAS"
          title="AUTOMATIZACIONES"
          description="Configura los tiempos utilizados por las acciones automáticas del programa."
        >

          <div className="business-form-grid">

            <BusinessField
              label="CUMPLEAÑOS"
              hint="Cuántos días antes del cumpleaños debe comenzar la acción."
            >

              <div className="business-input-unit">

                <input
                  type="number"
                  min="0"
                  max="365"
                  step="1"
                  value={
                    form.birthdayDaysBefore
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "birthdayDaysBefore",
                      event.target
                        .value,
                    )
                  }
                  required
                />


                <span>
                  DÍAS
                </span>

              </div>

            </BusinessField>


            <BusinessField
              label="REACTIVACIÓN"
              hint="Días sin actividad antes de considerar al cliente inactivo."
            >

              <div className="business-input-unit">

                <input
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  value={
                    form.reactivationDays
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "reactivationDays",
                      event.target
                        .value,
                    )
                  }
                  required
                />


                <span>
                  DÍAS
                </span>

              </div>

            </BusinessField>


            <BusinessField
              label="SOLICITUD DE RESEÑA"
              hint="Tiempo de espera antes de solicitar una reseña al cliente."
              wide
            >

              <div className="business-input-unit">

                <input
                  type="number"
                  min="0"
                  max="525600"
                  step="1"
                  value={
                    form.reviewDelayMinutes
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event,
                  ) =>
                    updateField(
                      "reviewDelayMinutes",
                      event.target
                        .value,
                    )
                  }
                  required
                />


                <span>
                  MIN
                </span>

              </div>

            </BusinessField>

          </div>

        </BusinessSection>


        {/* ===================================================
            RESEÑAS
            =================================================== */}

        <BusinessSection
          eyebrow="REPUTACIÓN"
          title="RESEÑAS"
          description="Configura el destino al que enviaremos al cliente cuando quiera dejar una reseña."
        >

          <div className="business-form-grid">

            <BusinessField
              label="ENLACE DE GOOGLE REVIEWS"
              hint="Enlace directo de Google para publicar una reseña."
              wide
            >

              <input
                type="url"
                value={
                  form.googleReviewUrl
                }
                placeholder="https://g.page/..."
                disabled={
                  saving
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "googleReviewUrl",
                    event.target
                      .value,
                  )
                }
              />

            </BusinessField>

          </div>

        </BusinessSection>


        {/* ===================================================
            PIE
            =================================================== */}

        <footer className="business-page__footer">

          <button
            type="button"
            className="business-page__reset"
            disabled={
              saving
            }
            onClick={
              handleReset
            }
          >
            RESTAURAR
          </button>


          <button
            type="submit"
            className="business-page__save"
            disabled={
              saving
            }
          >
            {saving
              ? "GUARDANDO..."
              : "GUARDAR CAMBIOS"}
          </button>

        </footer>

      </form>

    </DashboardLayout>
  );
}


// ===========================================================
// SECCIÓN
// ===========================================================

function BusinessSection({
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <section className="business-section">

      <header className="business-section__header">

        <p className="eyebrow">
          {eyebrow}
        </p>


        <h2>
          {title}
        </h2>


        <p>
          {description}
        </p>

      </header>


      <div className="business-section__content">
        {children}
      </div>

    </section>
  );
}


// ===========================================================
// CAMPO
// ===========================================================

function BusinessField({
  label,
  hint,
  children,
  wide = false,
}) {
  return (
    <label
      className={[
        "business-field",

        wide
          ? "business-field--wide"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      <span className="business-field__label">
        {label}
      </span>


      {children}


      {hint && (
        <small>
          {hint}
        </small>
      )}

    </label>
  );
}


// ===========================================================
// ESTADO
// ===========================================================

function BusinessState({
  title,
  text,
  error = false,
}) {
  return (
    <div
      className={[
        "business-state",

        error
          ? "business-state--error"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      <strong>
        {title}
      </strong>


      <p>
        {text}
      </p>

    </div>
  );
}


// ===========================================================
// MAPEAR DATOS
// ===========================================================

function mapBusinessToForm(
  business,
) {
  const settings =
    business?.settings ||
    {};


  return {
    name:
      business?.name ??
      "",

    slug:
      business?.slug ??
      "",

    type:
      business?.type ??
      "",

    logoUrl:
      business?.logo_url ??
      "",

    brandColor:
      business?.brand_color ||
      "#000000",

    googleReviewUrl:
      business?.google_review_url ??
      "",

    stampsRequired:
      settings.stamps_required ??
      8,

    minHoursBetweenVisits:
      settings.min_hours_between_visits ??
      12,

    birthdayDaysBefore:
      settings.birthday_days_before ??
      7,

    reactivationDays:
      settings.reactivation_days ??
      30,

    reviewDelayMinutes:
      settings.review_delay_minutes ??
      60,
  };
}


// ===========================================================
// VALIDACIÓN
// ===========================================================

function validateForm(
  form,
) {
  if (
    !form.name.trim()
  ) {
    throw new Error(
      "El nombre del negocio es obligatorio.",
    );
  }


  if (
    !BUSINESS_TYPES.some(
      (
        option,
      ) =>
        option.value ===
        form.type,
    )
  ) {
    throw new Error(
      "Selecciona un tipo de negocio válido.",
    );
  }


  if (
    !/^#[0-9a-fA-F]{6}$/.test(
      form.brandColor,
    )
  ) {
    throw new Error(
      "El color de marca debe tener formato hexadecimal.",
    );
  }


  validateInteger(
    form.stampsRequired,
    1,
    100,
    "Los sellos necesarios",
  );


  validateInteger(
    form.minHoursBetweenVisits,
    0,
    8760,
    "Las horas entre visitas",
  );


  validateInteger(
    form.birthdayDaysBefore,
    0,
    365,
    "Los días de cumpleaños",
  );


  validateInteger(
    form.reactivationDays,
    1,
    3650,
    "Los días de reactivación",
  );


  validateInteger(
    form.reviewDelayMinutes,
    0,
    525600,
    "Los minutos para solicitar reseña",
  );
}


function validateInteger(
  value,
  min,
  max,
  label,
) {
  const number =
    Number(
      value,
    );


  if (
    !Number.isInteger(
      number,
    ) ||
    number <
      min ||
    number >
      max
  ) {
    throw new Error(
      `${label} deben estar entre ${min} y ${max}.`,
    );
  }
}


// ===========================================================
// COLOR
// ===========================================================

function validColor(
  value,
) {
  if (
    /^#[0-9a-fA-F]{6}$/.test(
      value ||
        "",
    )
  ) {
    return value;
  }


  return "#000000";
}


// ===========================================================
// INICIALES
// ===========================================================

function getInitials(
  name,
) {
  const words =
    name
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ||
    [];


  if (
    words.length ===
    0
  ) {
    return "?";
  }


  return words
    .slice(
      0,
      2,
    )
    .map(
      (
        word,
      ) =>
        word
          .charAt(0)
          .toUpperCase(),
    )
    .join("");
}