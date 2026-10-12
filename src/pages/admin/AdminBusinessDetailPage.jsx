import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getAdminBusinessDetail,
} from "../../features/admin/api/adminApi.js";


export default function AdminBusinessDetailPage() {
  const {
    businessId,
  } = useParams();

  const [
    data,
    setData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  useEffect(() => {
    let active = true;

    async function loadBusiness() {
      try {
        const result =
          await getAdminBusinessDetail(
            businessId,
          );

        if (active) {
          setData(result);
        }
      } catch (loadError) {
        console.error(
          "Error cargando negocio:",
          loadError,
        );

        if (active) {
          setError(
            "No pudimos cargar el negocio.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBusiness();

    return () => {
      active = false;
    };
  }, [
    businessId,
  ]);


  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>
          <p>
            Cargando negocio...
          </p>
        </div>
      </main>
    );
  }


  if (
    error ||
    !data?.business
  ) {
    return (
      <main style={pageStyle}>
        <div style={shellStyle}>
          <Link
            to="/admin/negocios"
            style={backLinkStyle}
          >
            ← VOLVER A NEGOCIOS
          </Link>

          <p
            style={{
              marginTop:
                "24px",

              color:
                "#ffb4ab",
            }}
          >
            {error ||
              "No encontramos este negocio."}
          </p>
        </div>
      </main>
    );
  }


  const {
    business,
    members,
  } = data;

  const settings =
    business.settings ?? {};


  return (
    <main style={pageStyle}>
      <div style={shellStyle}>
        <Link
          to="/admin/negocios"
          style={backLinkStyle}
        >
          ← VOLVER A NEGOCIOS
        </Link>


        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "18px",

            marginTop:
              "28px",

            marginBottom:
              "28px",

            flexWrap:
              "wrap",
          }}
        >
          {business.logo_url ? (
            <img
              src={
                business.logo_url
              }
              alt=""
              style={{
                width:
                  "82px",

                height:
                  "82px",

                objectFit:
                  "contain",
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width:
                  "82px",

                height:
                  "82px",

                borderRadius:
                  "14px",

                background:
                  business.brand_color ||
                  "#7c3aed",
              }}
            />
          )}


          <div>
            <p
              style={{
                margin:
                  "0 0 6px",

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
                margin:
                  0,

                fontSize:
                  "clamp(2rem, 6vw, 3.5rem)",
              }}
            >
              {business.name}
            </h1>

            <p
              style={{
                margin:
                  "8px 0 0",

                opacity:
                  0.7,
              }}
            >
              {business.type}
            </p>
          </div>
          <Link
            to={`/admin/negocios/${business.id}/editar`}
            style={{
                display:
                "inline-flex",

                alignItems:
                "center",

                justifyContent:
                "center",

                minHeight:
                "44px",

                padding:
                "0 18px",

                marginLeft:
                "auto",

                borderRadius:
                "8px",

                background:
                "var(--color-accent, #f05a28)",

                color:
                "#ffffff",

                textDecoration:
                "none",

                fontWeight:
                900,
            }}
            >
            EDITAR NEGOCIO
            </Link>
        </div>


        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>
            Información
          </h2>

          <InfoRow
            label="Identificador"
            value={
              business.slug
            }
          />

          <InfoRow
            label="Tipo"
            value={
              business.type
            }
          />

          <InfoRow
            label="Color"
            value={
              business.brand_color ||
              "#7c3aed"
            }
          />

          <InfoRow
            label="Google Reviews"
            value={
              business.google_review_url ||
              "No configurado"
            }
          />

          <InfoRow
            label="Creado"
            value={
              business.created_at
                ? new Date(
                    business.created_at,
                  ).toLocaleString(
                    "es-CO",
                  )
                : "—"
            }
          />
        </section>


        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>
            Configuración
          </h2>

          <InfoRow
            label="Sellos requeridos"
            value={
              settings.stamps_required ??
              "—"
            }
          />

          <InfoRow
            label="Horas entre visitas"
            value={
              settings.min_hours_between_visits ??
              "—"
            }
          />

          <InfoRow
            label="Días para cumpleaños"
            value={
              settings.birthday_days_before ??
              "—"
            }
          />

          <InfoRow
            label="Días de reactivación"
            value={
              settings.reactivation_days ??
              "—"
            }
          />

          <InfoRow
            label="Espera para reseña"
            value={
              settings.review_delay_minutes !=
              null
                ? `${settings.review_delay_minutes} min`
                : "—"
            }
          />
        </section>


        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>
            Equipo
          </h2>

          {members.length ===
            0 && (
            <p
              style={{
                opacity:
                  0.7,
              }}
            >
              No hay miembros registrados.
            </p>
          )}

          {members.map(
            (
              member,
            ) => (
              <article
                key={
                  member.user_id
                }
                style={{
                  padding:
                    "14px 0",

                  borderBottom:
                    "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <strong>
                  {member.display_name ||
                    "Sin nombre"}
                </strong>

                <p
                  style={{
                    margin:
                      "5px 0 0",

                    opacity:
                      0.7,
                  }}
                >
                  {member.role ===
                  "owner"
                    ? "Propietario"
                    : "Staff"}
                  {" · "}
                  {member.onboarding_completed
                    ? "Activo"
                    : "Onboarding pendiente"}
                </p>
              </article>
            ),
          )}
        </section>
      </div>
    </main>
  );
}


function InfoRow({
  label,
  value,
}) {
  return (
    <div
      style={{
        display:
          "flex",

        justifyContent:
          "space-between",

        gap:
          "20px",

        padding:
          "11px 0",

        borderBottom:
          "1px solid rgba(255,255,255,0.08)",

        flexWrap:
          "wrap",
      }}
    >
      <span
        style={{
          opacity:
            0.65,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          overflowWrap:
            "anywhere",

          textAlign:
            "right",
        }}
      >
        {value}
      </strong>
    </div>
  );
}


const pageStyle = {
  minHeight:
    "100vh",

  padding:
    "32px",

  background:
    "var(--color-bg, #050505)",

  color:
    "var(--color-text, #ffffff)",
};


const shellStyle = {
  width:
    "100%",

  maxWidth:
    "1000px",

  margin:
    "0 auto",
};


const backLinkStyle = {
  color:
    "var(--color-accent, #f05a28)",

  textDecoration:
    "none",

  fontWeight:
    800,
};


const cardStyle = {
  marginBottom:
    "20px",

  padding:
    "22px",

  border:
    "1px solid rgba(255,255,255,0.12)",

  borderRadius:
    "12px",

  background:
    "rgba(255,255,255,0.03)",
};


const sectionTitleStyle = {
  margin:
    "0 0 14px",

  fontSize:
    "1.35rem",
};