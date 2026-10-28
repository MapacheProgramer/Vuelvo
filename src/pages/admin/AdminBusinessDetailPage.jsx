import {
  useEffect,
  useState,
} from "react";

import QRCode from "qrcode";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getAdminBusinessDetail,
  updateAdminBusinessActive,
  resetAdminUserPassword,
  deleteEmptyAdminBusiness,
} from "../../features/admin/api/adminApi.js";

import {
  addBusinessTeamMember,
  removeBusinessTeamMember,
} from "../../features/team/api/teamApi.js";


export default function AdminBusinessDetailPage() {
  const {
    businessId,
  } = useParams();
  const navigate = useNavigate();

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

  const [
    memberName,
    setMemberName,
  ] = useState("");

  const [
    memberEmail,
    setMemberEmail,
  ] = useState("");

  const [
    teamBusy,
    setTeamBusy,
  ] = useState("");

  const [
    teamError,
    setTeamError,
  ] = useState("");

  const [
    teamSuccess,
    setTeamSuccess,
  ] = useState("");

  const [qrImage, setQrImage] = useState("");
  const [qrError, setQrError] = useState("");
  const [linkStatus, setLinkStatus] = useState("");
  const [businessBusy, setBusinessBusy] = useState(false);
  const [businessMessage, setBusinessMessage] = useState("");


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


  const tagCode = data?.stampTag?.code ?? "";
  const tagUrl = tagCode
    ? `${window.location.origin}/t/${tagCode}`
    : "";

  useEffect(() => {
    let active = true;
    setQrImage("");
    setQrError("");

    if (!tagUrl) {
      return undefined;
    }

    QRCode.toDataURL(tagUrl, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#111827", light: "#FFFFFF" },
    })
      .then((image) => {
        if (active) setQrImage(image);
      })
      .catch((error) => {
        console.error("admin business QR:", error);
        if (active) setQrError("No fue posible generar la imagen QR.");
      });

    return () => { active = false; };
  }, [tagUrl]);

  async function handleCopyTagUrl() {
    if (!tagUrl) return;
    try {
      await navigator.clipboard.writeText(tagUrl);
      setLinkStatus("Enlace copiado.");
    } catch {
      setLinkStatus("Selecciona la URL y copiala manualmente.");
    }
  }

  async function handleToggleBusiness() {
    if (businessBusy || !data?.business) return;
    const current = data.business;
    const nextActive = current.active === false;
    const verb = nextActive ? "reactivar" : "desactivar";
    if (!window.confirm(`¿Quieres ${verb} el negocio ${current.name}?`)) return;
    setBusinessBusy(true);
    setBusinessMessage("");
    try {
      const updated = await updateAdminBusinessActive({ businessId, active: nextActive });
      setData((previous) => previous ? { ...previous, business: { ...previous.business, ...updated } } : previous);
      setBusinessMessage(nextActive ? "Negocio reactivado." : "Negocio desactivado. Sus datos se conservan.");
    } catch (actionError) {
      setBusinessMessage(actionError?.message || "No se pudo cambiar el estado.");
    } finally {
      setBusinessBusy(false);
    }
  }

  async function handleDeleteBusiness() {
    if (businessBusy || !data?.business || data.business.active !== false) return;
    const business = data.business;
    const confirmation = window.prompt(
      `ELIMINACIÓN PERMANENTE de ${business.name}. Solo funciona si NO tiene clientes, visitas ni recompensas. Escribe exactamente: ${business.slug}`,
    );
    if (confirmation !== business.slug) return;
    if (!window.confirm("Última confirmación: se eliminarán el negocio, su QR y las cuentas de sus usuarios sin otros negocios ni permisos globales. Esta acción es irreversible. ¿Continuar?")) return;
    setBusinessBusy(true);
    setBusinessMessage("");
    try {
      const result = await deleteEmptyAdminBusiness({ businessId, confirmedSlug: confirmation });
      window.alert(result.message || "Negocio de prueba eliminado.");
      navigate("/admin/negocios", { replace: true });
    } catch (actionError) {
      setBusinessMessage(actionError?.message || "No se pudo eliminar el negocio.");
    } finally {
      setBusinessBusy(false);
    }
  }

  async function handleResetPassword(member) {
    if (teamBusy || !member?.user_id) return;
    if (!window.confirm(`¿Enviar un correo para restablecer la contraseña de ${member.display_name || "este usuario"}?`)) return;
    setTeamError("");
    setTeamSuccess("");
    setTeamBusy(`reset-${member.user_id}`);
    try {
      await resetAdminUserPassword({ businessId, userId: member.user_id });
      setTeamSuccess("Correo de restablecimiento enviado. El usuario establece su propia contraseña.");
    } catch (actionError) {
      setTeamError(actionError?.message || "No se pudo enviar el correo.");
    } finally {
      setTeamBusy("");
    }
  }

  async function refreshBusiness() {
    const result =
      await getAdminBusinessDetail(
        businessId,
      );

    setData(result);
  }


  async function handleAddMember(
    event,
  ) {
    event.preventDefault();

    if (teamBusy) {
      return;
    }

    setTeamError("");
    setTeamSuccess("");
    setTeamBusy("add");

    try {
      await addBusinessTeamMember({
        businessId,
        displayName:
          memberName,
        email:
          memberEmail,
      });

      await refreshBusiness();

      setMemberName("");
      setMemberEmail("");

      setTeamSuccess(
        "Invitación enviada correctamente.",
      );
    } catch (addError) {
      console.error(
        "admin add team member:",
        addError,
      );

      setTeamError(
        addError?.message ||
        "No pudimos agregar el miembro.",
      );
    } finally {
      setTeamBusy("");
    }
  }


  async function handleRemoveMember(
    member,
  ) {
    if (
      teamBusy ||
      member.role ===
        "owner"
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `¿Eliminar a ${
          member.display_name ||
          "este miembro"
        } del negocio?`,
      );

    if (!confirmed) {
      return;
    }

    setTeamError("");
    setTeamSuccess("");
    setTeamBusy(
      member.user_id,
    );

    try {
      await removeBusinessTeamMember({
        businessId,
        userId:
          member.user_id,
      });

      await refreshBusiness();

      setTeamSuccess(
        "Miembro eliminado correctamente.",
      );
    } catch (removeError) {
      console.error(
        "admin remove team member:",
        removeError,
      );

      setTeamError(
        removeError?.message ||
        "No pudimos eliminar el miembro.",
      );
    } finally {
      setTeamBusy("");
    }
  }


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

  const privacyFields = [
    business.privacy_legal_name,
    business.privacy_contact_email,
    business.privacy_contact_phone,
    business.privacy_contact_address,
    business.privacy_policy_url,
  ];
  const privacyFilled = privacyFields.filter((value) => typeof value === "string" && value.trim()).length;
  const privacyStatus = privacyFilled === 0
    ? "SIN CONFIGURAR"
    : privacyFilled < privacyFields.length
      ? "INCOMPLETA"
      : "DATOS CARGADOS · SIN VALIDAR";
  const policyUrl = typeof business.privacy_policy_url === "string" &&
    business.privacy_policy_url.trim().startsWith("https://")
      ? business.privacy_policy_url.trim()
      : "";


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
          <h2 style={sectionTitleStyle}>Administración del negocio</h2>
          <p style={{ opacity: 0.75 }}>
            Estado actual: <strong>{business.active === false ? "DESACTIVADO" : "ACTIVO"}</strong>
          </p>
          <p style={{ opacity: 0.75 }}>
            Desactivar conserva los datos y suspende las operaciones de fidelización.
            Eliminar es irreversible y solo se permite en negocios sin clientes ni actividad.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" disabled={businessBusy} onClick={handleToggleBusiness}
              style={primaryButtonStyle}>
              {businessBusy ? "PROCESANDO..." : (business.active === false ? "REACTIVAR NEGOCIO" : "DESACTIVAR NEGOCIO")}
            </button>
            {business.active === false && (
              <button type="button" disabled={businessBusy} onClick={handleDeleteBusiness}
                style={dangerButtonStyle}>ELIMINAR NEGOCIO VACÍO</button>
            )}
          </div>
          {businessMessage && <p role="status" style={{ marginBottom: 0 }}>{businessMessage}</p>}
        </section>

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
          <h2 style={sectionTitleStyle}>Privacidad y datos legales</h2>
          <p style={{ opacity: 0.85 }}>
            Estado: <strong>{privacyStatus}</strong>
          </p>
          <p style={{ opacity: 0.72 }}>
            Información registrada por el negocio. Su presencia no garantiza que la política sea válida,
            vigente ni que su contenido haya sido revisado jurídicamente.
          </p>
          <InfoRow label="Responsable del tratamiento" value={business.privacy_legal_name || "No configurado"} />
          <InfoRow label="Correo de privacidad" value={business.privacy_contact_email || "No configurado"} />
          <InfoRow label="Teléfono de privacidad" value={business.privacy_contact_phone || "No configurado"} />
          <InfoRow label="Dirección del responsable" value={business.privacy_contact_address || "No configurado"} />
          <InfoRow label="Enlace de política" value={business.privacy_policy_url || "No configurado"} />
          {policyUrl && (
            <p style={{ marginTop: "16px" }}>
              <a href={policyUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--color-accent, #f05a28)", fontWeight: 800 }}>
                ABRIR POLÍTICA DE PRIVACIDAD
              </a>
            </p>
          )}
          <p style={{ opacity: 0.7, marginBottom: 0 }}>
            Estos datos se administran desde el panel del propietario: Negocio → Privacidad.
          </p>
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>
            QR de fidelización
          </h2>

          {data.stampTag ? (
            <div style={{ display: "grid", gap: "14px" }}>
              <p style={{ margin: 0, opacity: 0.75 }}>
                Comparte este QR con los clientes para registrar sus visitas.
              </p>
              <div style={{
                padding: "12px 14px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "8px",
                overflowWrap: "anywhere",
              }}>
                {tagUrl}
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleCopyTagUrl}
                  style={primaryButtonStyle}
                >
                  COPIAR URL
                </button>
                {qrImage && (
                  <a
                    href={qrImage}
                    download={`vuelvo-${business.slug}-qr.png`}
                    style={{
                      ...primaryButtonStyle,
                      display: "inline-flex",
                      alignItems: "center",
                      textDecoration: "none",
                      color: "#ffffff",
                    }}
                  >
                    DESCARGAR QR PNG
                  </a>
                )}
              </div>
              {linkStatus && <p role="status" style={{ margin: 0 }}>{linkStatus}</p>}
              {qrError && <p role="alert" style={{ color: "#ffb4ab" }}>{qrError}</p>}
              {qrImage && (
                <img
                  src={qrImage}
                  alt={`QR de fidelización de ${business.name}`}
                  width="240"
                  height="240"
                  style={{
                    display: "block",
                    padding: "8px",
                    background: "#ffffff",
                    borderRadius: "10px",
                    maxWidth: "100%",
                    height: "auto",
                  }}
                />
              )}
            </div>
          ) : (
            <p style={{ margin: 0, opacity: 0.75 }}>
              Este negocio no tiene un código de sellos activo.
              Los códigos existentes no se modifican automáticamente.
            </p>
          )}
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
          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              alignItems:
                "center",

              gap:
                "16px",

              flexWrap:
                "wrap",

              marginBottom:
                "18px",
            }}
          >
            <div>
              <h2
                style={{
                  ...sectionTitleStyle,
                  marginBottom:
                    "5px",
                }}
              >
                Equipo
              </h2>

              <p
                style={{
                  margin:
                    0,

                  opacity:
                    0.65,
                }}
              >
                Administra los miembros del negocio.
              </p>
            </div>
          </div>


          <form
            onSubmit={
              handleAddMember
            }
            style={teamFormStyle}
          >
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>
                NOMBRE
              </span>

              <input
                type="text"
                value={
                  memberName
                }
                placeholder="Nombre del miembro"
                maxLength={60}
                disabled={
                  Boolean(
                    teamBusy,
                  )
                }
                onChange={(
                  event,
                ) =>
                  setMemberName(
                    event.target.value,
                  )
                }
                required
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>
                CORREO
              </span>

              <input
                type="email"
                value={
                  memberEmail
                }
                placeholder="correo@ejemplo.com"
                disabled={
                  Boolean(
                    teamBusy,
                  )
                }
                onChange={(
                  event,
                ) =>
                  setMemberEmail(
                    event.target.value,
                  )
                }
                required
                style={inputStyle}
              />
            </label>

            <button
              type="submit"
              disabled={
                Boolean(
                  teamBusy,
                )
              }
              style={{
                ...primaryButtonStyle,

                opacity:
                  teamBusy
                    ? 0.6
                    : 1,
              }}
            >
              {teamBusy === "add"
                ? "ENVIANDO..."
                : "AGREGAR MIEMBRO"}
            </button>
          </form>


          {teamSuccess && (
            <p
              style={{
                margin:
                  "16px 0 0",

                color:
                  "#9be9a8",

                fontWeight:
                  700,
              }}
            >
              {teamSuccess}
            </p>
          )}


          {teamError && (
            <p
              style={{
                margin:
                  "16px 0 0",

                color:
                  "#ffb4ab",

                fontWeight:
                  700,
              }}
            >
              {teamError}
            </p>
          )}


          <div
            style={{
              marginTop:
                "22px",
            }}
          >
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
                    display:
                      "flex",

                    alignItems:
                      "center",

                    justifyContent:
                      "space-between",

                    gap:
                      "16px",

                    padding:
                      "14px 0",

                    borderBottom:
                      "1px solid rgba(255,255,255,0.1)",

                    flexWrap:
                      "wrap",
                  }}
                >
                  <div>
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
                  </div>


                  <button
                    type="button"
                    disabled={Boolean(teamBusy)}
                    onClick={() => handleResetPassword(member)}
                    style={{ ...primaryButtonStyle, opacity: teamBusy ? 0.6 : 1 }}
                  >
                    {teamBusy === `reset-${member.user_id}` ? "ENVIANDO..." : "RESTABLECER CONTRASEÑA"}
                  </button>

                  {member.role ===
                    "staff" && (
                    <button
                      type="button"
                      disabled={
                        Boolean(
                          teamBusy,
                        )
                      }
                      onClick={() =>
                        handleRemoveMember(
                          member,
                        )
                      }
                      style={{
                        ...dangerButtonStyle,

                        opacity:
                          teamBusy
                            ? 0.6
                            : 1,
                      }}
                    >
                      {teamBusy ===
                      member.user_id
                        ? "ELIMINANDO..."
                        : "ELIMINAR"}
                    </button>
                  )}


                  {member.role ===
                    "owner" && (
                    <span
                      style={{
                        opacity:
                          0.55,

                        fontSize:
                          "0.85rem",

                        fontWeight:
                          800,
                      }}
                    >
                      PROTEGIDO
                    </span>
                  )}
                </article>
              ),
            )}
          </div>
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


const teamFormStyle = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",

  gap:
    "14px",

  alignItems:
    "end",
};


const fieldStyle = {
  display:
    "grid",

  gap:
    "7px",
};


const fieldLabelStyle = {
  fontSize:
    "0.78rem",

  fontWeight:
    900,

  letterSpacing:
    "0.08em",

  opacity:
    0.7,
};


const inputStyle = {
  width:
    "100%",

  minHeight:
    "44px",

  padding:
    "0 12px",

  boxSizing:
    "border-box",

  border:
    "1px solid rgba(255,255,255,0.16)",

  borderRadius:
    "8px",

  background:
    "rgba(255,255,255,0.05)",

  color:
    "inherit",
};


const primaryButtonStyle = {
  minHeight:
    "44px",

  padding:
    "0 18px",

  border:
    0,

  borderRadius:
    "8px",

  background:
    "var(--color-accent, #f05a28)",

  color:
    "#ffffff",

  fontWeight:
    900,

  cursor:
    "pointer",
};


const dangerButtonStyle = {
  minHeight:
    "38px",

  padding:
    "0 14px",

  border:
    "1px solid rgba(255,120,120,0.45)",

  borderRadius:
    "8px",

  background:
    "rgba(255,80,80,0.08)",

  color:
    "#ffb4ab",

  fontWeight:
    900,

  cursor:
    "pointer",
};