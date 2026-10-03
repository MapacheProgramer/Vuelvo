import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout.jsx";

import ConfirmModal from "../../components/ui/ConfirmModal/ConfirmModal.jsx";

import {
  useAuth,
} from "../../features/auth/hooks/useAuth.js";

import {
  addBusinessTeamMember,
  getBusinessTeam,
  getCurrentTeamUser,
  removeBusinessTeamMember,
} from "../../features/team/api/teamApi.js";

import "./TeamPage.css";


export default function TeamPage() {
  const {
    businessId,
    isOwner,
  } = useAuth();


  const [
    members,
    setMembers,
  ] = useState([]);


  const [
    currentUserId,
    setCurrentUserId,
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
    feedback,
    setFeedback,
  ] = useState(null);


  // =========================================================
  // INVITAR
  // =========================================================

  const [
    inviteOpen,
    setInviteOpen,
  ] = useState(false);


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    inviteError,
    setInviteError,
  ] = useState("");


  const [
    form,
    setForm,
  ] = useState({
    displayName:
      "",

    email:
      "",
  });


  // =========================================================
  // ELIMINAR
  // =========================================================

  const [
    removingMember,
    setRemovingMember,
  ] = useState(null);


  const [
    removing,
    setRemoving,
  ] = useState(false);


  const [
    removeError,
    setRemoveError,
  ] = useState("");


  // =========================================================
  // CARGAR EQUIPO
  // =========================================================

  const loadTeam =
    useCallback(
      async ({
        showLoading = false,
      } = {}) => {
        if (
          !businessId
        ) {
          return;
        }


        if (
          showLoading
        ) {
          setLoading(
            true,
          );
        }


        setError(
          "",
        );


        try {
          const [
            team,
            currentUser,
          ] =
            await Promise.all([
              getBusinessTeam(
                businessId,
              ),

              getCurrentTeamUser(),
            ]);


          setMembers(
            team,
          );


          setCurrentUserId(
            currentUser.id,
          );
        } catch (
          loadError
        ) {
          console.error(
            "team:",
            loadError,
          );


          setError(
            loadError?.message ||
              "No pudimos cargar el equipo.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        businessId,
      ],
    );


  useEffect(() => {
    loadTeam({
      showLoading:
        true,
    });
  }, [
    loadTeam,
  ]);


  // =========================================================
  // RESUMEN
  // =========================================================

  const summary =
    useMemo(
      () => {
        const owners =
          members.filter(
            (
              member,
            ) =>
              member.role ===
              "owner",
          ).length;


        const staff =
          members.filter(
            (
              member,
            ) =>
              member.role ===
              "staff",
          ).length;


        return {
          total:
            members.length,

          owners,

          staff,
        };
      },
      [
        members,
      ],
    );


  // =========================================================
  // ABRIR INVITACIÓN
  // =========================================================

  function openInvite() {
    if (
      !isOwner
    ) {
      return;
    }


    setForm({
      displayName:
        "",

      email:
        "",
    });


    setInviteError(
      "",
    );


    setFeedback(
      null,
    );


    setInviteOpen(
      true,
    );
  }


  // =========================================================
  // CERRAR INVITACIÓN
  // =========================================================

  function closeInvite() {
    if (
      submitting
    ) {
      return;
    }


    setInviteOpen(
      false,
    );


    setInviteError(
      "",
    );
  }


  // =========================================================
  // ACTUALIZAR FORMULARIO
  // =========================================================

  function updateField(
    field,
    value,
  ) {
    if (
      !isOwner
    ) {
      return;
    }


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
  // INVITAR MIEMBRO
  // =========================================================

  async function handleInvite() {
    if (
      !isOwner
    ) {
      return;
    }


    setInviteError(
      "",
    );


    const displayName =
      form.displayName
        .trim();


    const email =
      form.email
        .trim()
        .toLowerCase();


    if (
      displayName.length <
      2
    ) {
      setInviteError(
        "Escribe el nombre del miembro.",
      );

      return;
    }


    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      setInviteError(
        "Escribe un correo electrónico válido.",
      );

      return;
    }


    try {
      setSubmitting(
        true,
      );


      const result =
        await addBusinessTeamMember({
          businessId,

          displayName,

          email,
        });


      await loadTeam();


      setInviteOpen(
        false,
      );


      setFeedback({
        title:
          "INVITACIÓN ENVIADA",

        text:
          result?.message ||
          "La invitación fue enviada correctamente.",
      });


      setForm({
        displayName:
          "",

        email:
          "",
      });
    } catch (
      inviteRequestError
    ) {
      console.error(
        "invite member:",
        inviteRequestError,
      );


      setInviteError(
        inviteRequestError?.message ||
          "No pudimos enviar la invitación.",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }


  // =========================================================
  // ABRIR ELIMINACIÓN
  // =========================================================

  function openRemove(
    member,
  ) {
    if (
      !isOwner ||
      !member ||
      member.role !==
        "staff"
    ) {
      return;
    }


    setFeedback(
      null,
    );


    setRemoveError(
      "",
    );


    setRemovingMember(
      member,
    );
  }


  // =========================================================
  // CERRAR ELIMINACIÓN
  // =========================================================

  function closeRemove() {
    if (
      removing
    ) {
      return;
    }


    setRemovingMember(
      null,
    );


    setRemoveError(
      "",
    );
  }


  // =========================================================
  // ELIMINAR MIEMBRO
  // =========================================================

  async function handleRemove() {
    if (
      !isOwner ||
      !removingMember
    ) {
      return;
    }


    setRemoveError(
      "",
    );


    try {
      setRemoving(
        true,
      );


      const result =
        await removeBusinessTeamMember({
          businessId,

          userId:
            removingMember.user_id,
        });


      const removedName =
        getDisplayName(
          removingMember,
        );


      await loadTeam();


      setRemovingMember(
        null,
      );


      setFeedback({
        title:
          "MIEMBRO ELIMINADO",

        text:
          result?.message ||
          `${removedName} fue eliminado del equipo.`,
      });
    } catch (
      removeRequestError
    ) {
      console.error(
        "remove member:",
        removeRequestError,
      );


      setRemoveError(
        removeRequestError?.message ||
          "No pudimos eliminar el miembro.",
      );
    } finally {
      setRemoving(
        false,
      );
    }
  }


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <DashboardLayout>

      <section className="team-page">

        {/* ===================================================
            HERO
            =================================================== */}

        <header className="team-page__hero">

          <div>

            <p className="eyebrow">
              ADMINISTRACIÓN
            </p>


            <h1>
              EQUIPO
            </h1>


            <p className="team-page__intro">
              Administra las personas que tienen acceso
              al panel de este negocio.
            </p>

          </div>


          {!loading &&
            !error &&
            isOwner && (
              <button
                type="button"
                className="team-page__add"
                onClick={
                  openInvite
                }
              >
                + AGREGAR MIEMBRO
              </button>
            )}

        </header>


        {/* ===================================================
            FEEDBACK
            =================================================== */}

        {feedback && (
          <div className="team-feedback team-feedback--success">

            <strong>
              {feedback.title}
            </strong>


            <p>
              {feedback.text}
            </p>

          </div>
        )}


        {/* ===================================================
            RESUMEN
            =================================================== */}

        {!loading &&
          !error && (
            <section className="team-summary">

              <SummaryCard
                label="MIEMBROS"
                value={
                  summary.total
                }
              />


              <SummaryCard
                label="PROPIETARIOS"
                value={
                  summary.owners
                }
              />


              <SummaryCard
                label="PERSONAL"
                value={
                  summary.staff
                }
              />

            </section>
          )}


        {/* ===================================================
            EQUIPO
            =================================================== */}

        <section className="team-section">

          <div className="team-section__heading">

            <div>

              <p className="eyebrow">
                ACCESOS
              </p>


              <h2>
                MIEMBROS DEL NEGOCIO
              </h2>

            </div>


            {!loading &&
              !error && (
                <span className="team-section__count">
                  {members.length}{" "}
                  {members.length ===
                  1
                    ? "MIEMBRO"
                    : "MIEMBROS"}
                </span>
              )}

          </div>


          {/* =================================================
              STAFF
              ================================================= */}

          {!loading &&
            !error &&
            !isOwner && (
              <div className="team-permission-note">

                <strong>
                  ACCESO DE PERSONAL
                </strong>


                <p>
                  Puedes consultar el equipo, pero solo el
                  propietario puede administrar miembros.
                </p>

              </div>
            )}


          {/* =================================================
              CARGANDO
              ================================================= */}

          {loading && (
            <StateBox
              title="CARGANDO EQUIPO..."
              text="Estamos consultando los accesos del negocio."
            />
          )}


          {/* =================================================
              ERROR
              ================================================= */}

          {!loading &&
            error && (
              <StateBox
                title="NO PUDIMOS CARGAR EL EQUIPO"
                text={
                  error
                }
                error
              />
            )}


          {/* =================================================
              VACÍO
              ================================================= */}

          {!loading &&
            !error &&
            members.length ===
              0 && (
              <StateBox
                title="NO HAY MIEMBROS"
                text="Todavía no hay miembros asociados a este negocio."
              />
            )}


          {/* =================================================
              LISTA
              ================================================= */}

          {!loading &&
            !error &&
            members.length >
              0 && (
              <div className="team-list">

                {members.map(
                  (
                    member,
                  ) => (
                    <TeamMember
                      key={
                        member.user_id
                      }
                      member={
                        member
                      }
                      current={
                        member.user_id ===
                        currentUserId
                      }
                      canRemove={
                        Boolean(
                          isOwner &&
                          member.role ===
                            "staff" &&
                          member.user_id !==
                            currentUserId,
                        )
                      }
                      onRemove={
                        openRemove
                      }
                    />
                  ),
                )}

              </div>
            )}

        </section>

      </section>


      {/* =====================================================
          MODAL INVITACIÓN
          ===================================================== */}

      {isOwner && (
        <ConfirmModal
          open={
            inviteOpen
          }
          eyebrow="EQUIPO"
          title="AGREGAR MIEMBRO"
          confirmText={
            submitting
              ? "ENVIANDO..."
              : "ENVIAR INVITACIÓN"
          }
          cancelText="CANCELAR"
          loading={
            submitting
          }
          onConfirm={
            handleInvite
          }
          onClose={
            closeInvite
          }
        >

          <div className="team-invite">

            <p className="team-invite__intro">
              La persona recibirá un correo para crear
              su contraseña y acceder al negocio como personal.
            </p>


            <label className="team-invite__field">

              <span>
                NOMBRE
              </span>


              <input
                type="text"
                value={
                  form.displayName
                }
                placeholder="Nombre del miembro"
                autoComplete="name"
                maxLength={60}
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "displayName",
                    event.target
                      .value,
                  )
                }
              />

            </label>


            <label className="team-invite__field">

              <span>
                CORREO ELECTRÓNICO
              </span>


              <input
                type="email"
                value={
                  form.email
                }
                placeholder="persona@correo.com"
                autoComplete="email"
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "email",
                    event.target
                      .value,
                  )
                }
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                      "Enter" &&
                    !submitting
                  ) {
                    event.preventDefault();

                    handleInvite();
                  }
                }}
              />

            </label>


            <div className="team-invite__role">

              <span>
                ROL ASIGNADO
              </span>


              <strong>
                PERSONAL
              </strong>

            </div>


            {inviteError && (
              <p className="team-invite__error">
                {inviteError}
              </p>
            )}

          </div>

        </ConfirmModal>
      )}


      {/* =====================================================
          MODAL ELIMINAR
          ===================================================== */}

      {isOwner && (
        <ConfirmModal
          open={
            Boolean(
              removingMember,
            )
          }
          eyebrow="EQUIPO"
          title="ELIMINAR MIEMBRO"
          confirmText={
            removing
              ? "ELIMINANDO..."
              : "ELIMINAR MIEMBRO"
          }
          cancelText="CANCELAR"
          loading={
            removing
          }
          danger
          onConfirm={
            handleRemove
          }
          onClose={
            closeRemove
          }
        >

          <div className="team-remove">

            <p className="team-remove__warning">
              Esta acción eliminará el acceso del miembro
              y también su cuenta de inicio de sesión.
            </p>


            {removingMember && (
              <div className="team-remove__member">

                <span>
                  MIEMBRO
                </span>


                <strong>
                  {getDisplayName(
                    removingMember,
                  )}
                </strong>


                <small>
                  {removingMember.email}
                </small>

              </div>
            )}


            <p className="team-remove__copy">
              Si esta persona necesita acceso nuevamente,
              tendrás que volver a invitarla.
            </p>


            {removeError && (
              <p className="team-remove__error">
                {removeError}
              </p>
            )}

          </div>

        </ConfirmModal>
      )}

    </DashboardLayout>
  );
}


// ===========================================================
// MIEMBRO
// ===========================================================

function TeamMember({
  member,
  current,
  canRemove,
  onRemove,
}) {
  const displayName =
    getDisplayName(
      member,
    );


  const owner =
    member.role ===
    "owner";


  return (
    <article className="team-member">

      <div className="team-member__identity">

        <span className="team-member__avatar">
          {getInitial(
            displayName,
          )}
        </span>


        <div>

          <span className="team-member__label">
            {current
              ? "TÚ"
              : "MIEMBRO"}
          </span>


          <strong>
            {displayName}
          </strong>


          <small>
            {member.email ||
              "Sin correo"}
          </small>

        </div>

      </div>


      <div className="team-member__role">

        <span>
          ROL
        </span>


        <strong
          className={[
            "team-role-badge",

            owner
              ? "team-role-badge--owner"
              : "team-role-badge--staff",
          ].join(" ")}
        >
          {owner
            ? "PROPIETARIO"
            : "PERSONAL"}
        </strong>

      </div>


      <div className="team-member__date">

        <span>
          DESDE
        </span>


        <strong>
          {formatDate(
            member.created_at,
          )}
        </strong>

      </div>


      <div className="team-member__actions">

        {canRemove ? (
          <button
            type="button"
            className="team-member__remove"
            onClick={() =>
              onRemove(
                member,
              )
            }
          >
            ELIMINAR
          </button>
        ) : (
          <span className="team-member__protected">
            {owner
              ? "PROTEGIDO"
              : ""}
          </span>
        )}

      </div>

    </article>
  );
}


// ===========================================================
// RESUMEN
// ===========================================================

function SummaryCard({
  label,
  value,
}) {
  return (
    <article className="team-summary__card">

      <span>
        {label}
      </span>


      <strong>
        {value}
      </strong>

    </article>
  );
}


// ===========================================================
// ESTADO
// ===========================================================

function StateBox({
  title,
  text,
  error = false,
}) {
  return (
    <div
      className={[
        "team-state",

        error
          ? "team-state--error"
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
// NOMBRE
// ===========================================================

function getDisplayName(
  member,
) {
  const storedName =
    member.display_name
      ?.trim();


  if (
    storedName
  ) {
    return storedName;
  }


  const emailName =
    member.email
      ?.split("@")[0]
      ?.trim();


  if (
    emailName
  ) {
    return emailName
      .replace(
        /[._-]+/g,
        " ",
      )
      .replace(
        /\b\w/g,
        (
          letter,
        ) =>
          letter.toUpperCase(),
      );
  }


  return "Miembro";
}


// ===========================================================
// INICIAL
// ===========================================================

function getInitial(
  name,
) {
  return (
    name
      ?.charAt(0)
      .toUpperCase() ||
    "?"
  );
}


// ===========================================================
// FECHA
// ===========================================================

function formatDate(
  value,
) {
  if (
    !value
  ) {
    return "—";
  }


  return new Date(
    value,
  ).toLocaleDateString(
    "es-CO",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    },
  );
}