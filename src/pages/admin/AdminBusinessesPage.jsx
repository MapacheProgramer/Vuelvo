import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getAdminBusinesses,
} from "../../features/admin/api/adminApi.js";


export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    let active = true;

    async function loadBusinesses() {
      try {
        const data = await getAdminBusinesses();

        if (active) {
          setBusinesses(data);
        }
      } catch (loadError) {
        console.error(
          "Error cargando negocios:",
          loadError,
        );

        if (active) {
          setError(
            "No pudimos cargar los negocios.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadBusinesses();

    return () => {
      active = false;
    };
  }, []);


  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        background: "var(--color-bg, #050505)",
        color: "var(--color-text, #ffffff)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <Link
          to="/admin"
          style={{
            color: "var(--color-accent, #f05a28)",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          ← VOLVER AL PANEL
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
            marginTop: "28px",
            marginBottom: "28px",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 8px",
                fontWeight: 900,
                letterSpacing: "0.08em",
              }}
            >
              ADMINISTRACIÓN DE VUELVO
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2rem, 6vw, 3.5rem)",
              }}
            >
              Negocios
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                opacity: 0.72,
              }}
            >
              Consulta los negocios registrados en la plataforma.
            </p>
          </div>

          <Link
            to="/admin/negocios/nuevo"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "44px",
              padding: "0 18px",
              borderRadius: "8px",
              background: "var(--color-accent, #f05a28)",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 900,
            }}
          >
            NUEVO NEGOCIO
          </Link>
        </div>

        {loading && (
          <p>
            Cargando negocios...
          </p>
        )}

        {!loading && error && (
          <p
            style={{
              padding: "14px",
              border: "1px solid #b42318",
              borderRadius: "8px",
              color: "#ffb4ab",
            }}
          >
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          businesses.length === 0 && (
            <p
              style={{
                padding: "24px",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                opacity: 0.72,
              }}
            >
              Todavía no hay negocios registrados.
            </p>
          )}

        {!loading &&
          !error &&
          businesses.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                gap: "16px",
              }}
            >
              {businesses.map(
                (business) => (
                  <article
                    key={business.id}
                    style={{
                      padding: "20px",
                      border:
                        "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      background:
                        "rgba(255,255,255,0.03)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        marginBottom: "16px",
                      }}
                    >
                      {business.logo_url ? (
                        <img
                          src={business.logo_url}
                          alt=""
                          style={{
                            width: "54px",
                            height: "54px",
                            objectFit: "contain",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          style={{
                            width: "54px",
                            height: "54px",
                            borderRadius: "10px",
                            flexShrink: 0,
                            background:
                              business.brand_color ||
                              "var(--color-accent, #f05a28)",
                          }}
                        />
                      )}

                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <h2
                          style={{
                            margin: 0,
                            fontSize: "1.2rem",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {business.name}
                        </h2>

                        <p
                          style={{
                            margin: "4px 0 0",
                            opacity: 0.65,
                          }}
                        >
                          {business.type}
                        </p>
                      </div>
                    </div>

                    <p
                      style={{
                        margin: "0 0 8px",
                        opacity: 0.75,
                        overflowWrap: "anywhere",
                      }}
                    >
                      Código: {business.slug}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          background:
                            business.brand_color ||
                            "#7c3aed",
                          border:
                            "1px solid rgba(255,255,255,0.28)",
                        }}
                      />

                      <span
                        style={{
                          opacity: 0.75,
                        }}
                      >
                        {business.brand_color || "#7c3aed"}
                      </span>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
      </div>
    </main>
  );
}
