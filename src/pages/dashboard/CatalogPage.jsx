import {
  useEffect,
  useState,
} from "react";

import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal/ConfirmModal.jsx";

import {
  useAuth,
} from "../../features/auth/hooks/useAuth.js";

import {
  createReward,
  getRewardCatalog,
  updateReward,
} from "../../features/catalog/api/catalogApi.js";

import "./CatalogPage.css";


const EMPTY_FORM = {
  name: "",
  description: "",
  active: true,
};


function sortRewards(
  rewards,
) {
  return [...rewards].sort(
    (a, b) =>
      a.name.localeCompare(
        b.name,
        "es",
        {
          sensitivity:
            "base",
        },
      ),
  );
}


export default function CatalogPage() {
  const {
    businessId,
    isOwner,
  } = useAuth();


  // =========================================================
  // CATÁLOGO
  // =========================================================

  const [
    rewards,
    setRewards,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const [
    message,
    setMessage,
  ] = useState("");


  // =========================================================
  // CREAR
  // =========================================================

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);


  const [
    createForm,
    setCreateForm,
  ] = useState(
    EMPTY_FORM,
  );


  const [
    creating,
    setCreating,
  ] = useState(false);


  const [
    createError,
    setCreateError,
  ] = useState("");


  // =========================================================
  // EDITAR
  // =========================================================

  const [
    editingReward,
    setEditingReward,
  ] = useState(null);


  const [
    editForm,
    setEditForm,
  ] = useState(
    EMPTY_FORM,
  );


  const [
    updating,
    setUpdating,
  ] = useState(false);


  const [
    editError,
    setEditError,
  ] = useState("");


  // =========================================================
  // CARGAR CATÁLOGO
  // =========================================================

  useEffect(() => {
    let cancelled =
      false;


    async function loadCatalog() {
      if (
        !businessId
      ) {
        return;
      }


      setLoading(
        true,
      );

      setError(
        "",
      );


      try {
        const data =
          await getRewardCatalog(
            businessId,
          );


        if (
          cancelled
        ) {
          return;
        }


        setRewards(
          data,
        );
      } catch (
        error
      ) {
        if (
          cancelled
        ) {
          return;
        }


        console.error(
          "catalog:",
          error,
        );


        setError(
          error?.message ||
            "No pudimos cargar el catálogo.",
        );
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false,
          );
        }
      }
    }


    loadCatalog();


    return () => {
      cancelled =
        true;
    };
  }, [
    businessId,
  ]);


  // =========================================================
  // CREAR — ABRIR
  // =========================================================

  function handleOpenCreate() {
    if (
      !isOwner
    ) {
      return;
    }


    setCreateForm(
      EMPTY_FORM,
    );


    setCreateError(
      "",
    );

    setMessage(
      "",
    );


    setCreateOpen(
      true,
    );
  }


  // =========================================================
  // CREAR — CERRAR
  // =========================================================

  function handleCloseCreate() {
    if (
      creating
    ) {
      return;
    }


    setCreateOpen(
      false,
    );

    setCreateError(
      "",
    );
  }


  // =========================================================
  // CREAR — CAMBIAR CAMPO
  // =========================================================

  function updateCreateField(
    field,
    value,
  ) {
    if (
      !isOwner
    ) {
      return;
    }


    setCreateForm(
      (current) => ({
        ...current,

        [field]:
          value,
      }),
    );
  }


  // =========================================================
  // CREAR — GUARDAR
  // =========================================================

  async function handleCreateReward() {
    if (
      !isOwner
    ) {
      setCreateError(
        "No tienes permisos para crear recompensas.",
      );

      return;
    }


    setCreateError(
      "",
    );


    if (
      !createForm.name.trim()
    ) {
      setCreateError(
        "Escribe el nombre de la recompensa.",
      );


      return;
    }


    try {
      setCreating(
        true,
      );


      const reward =
        await createReward({
          businessId,

          name:
            createForm.name,

          description:
            createForm.description,

          active:
            createForm.active,
        });


      setRewards(
        (current) =>
          sortRewards([
            ...current,
            reward,
          ]),
      );


      setCreateOpen(
        false,
      );


      setCreateForm(
        EMPTY_FORM,
      );


      setMessage(
        `"${reward.name}" fue agregada al catálogo correctamente.`,
      );
    } catch (
      error
    ) {
      console.error(
        "create reward:",
        error,
      );


      setCreateError(
        error?.message ||
          "No pudimos crear la recompensa.",
      );
    } finally {
      setCreating(
        false,
      );
    }
  }


  // =========================================================
  // EDITAR — ABRIR
  // =========================================================

  function handleOpenEdit(
    reward,
  ) {
    if (
      !isOwner
    ) {
      return;
    }


    setMessage(
      "",
    );

    setEditError(
      "",
    );


    setEditingReward(
      reward,
    );


    setEditForm({
      name:
        reward.name ||
        "",

      description:
        reward.description ||
        "",

      active:
        Boolean(
          reward.active,
        ),
    });
  }


  // =========================================================
  // EDITAR — CERRAR
  // =========================================================

  function handleCloseEdit() {
    if (
      updating
    ) {
      return;
    }


    setEditingReward(
      null,
    );


    setEditError(
      "",
    );
  }


  // =========================================================
  // EDITAR — CAMBIAR CAMPO
  // =========================================================

  function updateEditField(
    field,
    value,
  ) {
    if (
      !isOwner
    ) {
      return;
    }


    setEditForm(
      (current) => ({
        ...current,

        [field]:
          value,
      }),
    );
  }


  // =========================================================
  // EDITAR — GUARDAR
  // =========================================================

  async function handleUpdateReward() {
    if (
      !isOwner
    ) {
      setEditError(
        "No tienes permisos para modificar recompensas.",
      );

      return;
    }


    if (
      !editingReward
    ) {
      return;
    }


    setEditError(
      "",
    );


    if (
      !editForm.name.trim()
    ) {
      setEditError(
        "Escribe el nombre de la recompensa.",
      );


      return;
    }


    try {
      setUpdating(
        true,
      );


      const updatedReward =
        await updateReward({
          businessId,

          rewardId:
            editingReward.id,

          name:
            editForm.name,

          description:
            editForm.description,

          active:
            editForm.active,
        });


      setRewards(
        (current) =>
          sortRewards(
            current.map(
              (reward) =>
                reward.id ===
                updatedReward.id
                  ? updatedReward
                  : reward,
            ),
          ),
      );


      setEditingReward(
        null,
      );


      setMessage(
        `"${updatedReward.name}" fue actualizada correctamente.`,
      );
    } catch (
      error
    ) {
      console.error(
        "update reward:",
        error,
      );


      setEditError(
        error?.message ||
          "No pudimos actualizar la recompensa.",
      );
    } finally {
      setUpdating(
        false,
      );
    }
  }


  // =========================================================
  // UI
  // =========================================================

  return (
    <DashboardLayout>

      <section className="catalog-page">

        {/* ===================================================
            HERO
            =================================================== */}

        <div className="catalog-page__hero">

          <div>

            <p className="eyebrow">
              FIDELIZACIÓN
            </p>


            <h1>
              CATÁLOGO DE RECOMPENSAS
            </h1>


            <p className="catalog-page__intro">

              {isOwner
                ? (
                  <>
                    Administra las recompensas que tus clientes
                    pueden elegir cuando completan su tarjeta.
                  </>
                )
                : (
                  <>
                    Consulta las recompensas disponibles para los
                    clientes de este negocio.
                  </>
                )}

            </p>

          </div>


          {isOwner && (
            <button
              type="button"
              className="catalog-page__create"
              onClick={
                handleOpenCreate
              }
            >
              + NUEVA RECOMPENSA
            </button>
          )}

        </div>


        {/* ===================================================
            CATÁLOGO
            =================================================== */}

        <section className="catalog-page__section">

          <div className="catalog-page__section-heading">

            <div>

              <p className="eyebrow">
                RECOMPENSAS
              </p>


              <h2>
                TU CATÁLOGO
              </h2>

            </div>


            {!loading && (
              <span className="catalog-page__count">

                {rewards.length}{" "}

                {rewards.length ===
                1
                  ? "RECOMPENSA"
                  : "RECOMPENSAS"}

              </span>
            )}

          </div>


          {/* =================================================
              AVISO STAFF
              ================================================= */}

          {!isOwner && (
            <div className="catalog-page__message">
              Tienes acceso de consulta. Solo el propietario puede
              crear o modificar recompensas.
            </div>
          )}


          {/* =================================================
              MENSAJES
              ================================================= */}

          {message && (
            <div className="catalog-page__message">
              {message}
            </div>
          )}


          {/* =================================================
              CARGANDO
              ================================================= */}

          {loading && (
            <div className="catalog-page__empty">

              <strong>
                CARGANDO CATÁLOGO...
              </strong>


              <p>
                Estamos consultando las recompensas
                configuradas para tu negocio.
              </p>

            </div>
          )}


          {/* =================================================
              ERROR
              ================================================= */}

          {!loading &&
            error && (
              <div className="catalog-page__empty catalog-page__empty--error">

                <strong>
                  NO PUDIMOS CARGAR EL CATÁLOGO
                </strong>


                <p>
                  {error}
                </p>

              </div>
            )}


          {/* =================================================
              VACÍO
              ================================================= */}

          {!loading &&
            !error &&
            rewards.length ===
              0 && (
              <div className="catalog-page__empty">

                <strong>
                  TODAVÍA NO HAY RECOMPENSAS
                </strong>


                <p>

                  {isOwner
                    ? (
                      <>
                        Crea tu primera recompensa para que
                        tus clientes puedan elegirla al
                        completar su tarjeta.
                      </>
                    )
                    : (
                      <>
                        El propietario todavía no ha configurado
                        recompensas para este negocio.
                      </>
                    )}

                </p>

              </div>
            )}


          {/* =================================================
              LISTA
              ================================================= */}

          {!loading &&
            !error &&
            rewards.length >
              0 && (
              <div className="catalog-grid">

                {rewards.map(
                  (reward) => (
                    <RewardCard
                      key={
                        reward.id
                      }
                      reward={
                        reward
                      }
                      canEdit={
                        isOwner
                      }
                      onEdit={
                        handleOpenEdit
                      }
                    />
                  ),
                )}

              </div>
            )}

        </section>

      </section>


      {/* =====================================================
          MODAL CREAR
          ===================================================== */}

      {isOwner && (
        <ConfirmModal
          open={
            createOpen
          }
          eyebrow="Catálogo"
          title="Nueva recompensa"
          confirmText="Crear recompensa"
          cancelText="Cancelar"
          loading={
            creating
          }
          onClose={
            handleCloseCreate
          }
          onConfirm={
            handleCreateReward
          }
        >

          <RewardForm
            form={
              createForm
            }
            disabled={
              creating
            }
            error={
              createError
            }
            onChange={
              updateCreateField
            }
          />

        </ConfirmModal>
      )}


      {/* =====================================================
          MODAL EDITAR
          ===================================================== */}

      {isOwner && (
        <ConfirmModal
          open={
            Boolean(
              editingReward,
            )
          }
          eyebrow="Catálogo"
          title="Editar recompensa"
          confirmText="Guardar cambios"
          cancelText="Cancelar"
          loading={
            updating
          }
          onClose={
            handleCloseEdit
          }
          onConfirm={
            handleUpdateReward
          }
        >

          <RewardForm
            form={
              editForm
            }
            disabled={
              updating
            }
            error={
              editError
            }
            onChange={
              updateEditField
            }
          />

        </ConfirmModal>
      )}

    </DashboardLayout>
  );
}


/* =========================================================
   TARJETA DE RECOMPENSA
   ========================================================= */

function RewardCard({
  reward,
  canEdit,
  onEdit,
}) {
  const isActive =
    Boolean(
      reward.active,
    );


  return (
    <article
      className={[
        "catalog-reward",

        !isActive
          ? "catalog-reward--inactive"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      <div className="catalog-reward__top">

        <span
          className={[
            "catalog-reward__status",

            isActive
              ? "catalog-reward__status--active"
              : "catalog-reward__status--inactive",
          ].join(" ")}
        >
          {isActive
            ? "ACTIVA"
            : "INACTIVA"}
        </span>


        {canEdit && (
          <button
            type="button"
            className="catalog-reward__edit"
            onClick={() =>
              onEdit(
                reward,
              )
            }
          >
            EDITAR
          </button>
        )}

      </div>


      <div className="catalog-reward__content">

        <p className="catalog-reward__eyebrow">
          RECOMPENSA
        </p>


        <h3>
          {reward.name}
        </h3>


        <p className="catalog-reward__description">
          {reward.description ||
            "Sin descripción."}
        </p>

      </div>

    </article>
  );
}


/* =========================================================
   FORMULARIO REUTILIZABLE
   ========================================================= */

function RewardForm({
  form,
  disabled,
  error,
  onChange,
}) {
  return (
    <div className="catalog-form">

      <label className="catalog-form__field">

        <span>
          NOMBRE
        </span>


        <input
          type="text"
          value={
            form.name
          }
          maxLength={
            100
          }
          placeholder="Ej. Lavado gratis"
          disabled={
            disabled
          }
          onChange={(
            event,
          ) =>
            onChange(
              "name",
              event.target
                .value,
            )
          }
        />

      </label>


      <label className="catalog-form__field">

        <span>
          DESCRIPCIÓN
        </span>


        <textarea
          value={
            form.description
          }
          rows={
            4
          }
          placeholder="Describe brevemente qué incluye esta recompensa."
          disabled={
            disabled
          }
          onChange={(
            event,
          ) =>
            onChange(
              "description",
              event.target
                .value,
            )
          }
        />

      </label>


      <label className="catalog-form__toggle">

        <div>

          <strong>
            RECOMPENSA ACTIVA
          </strong>


          <small>
            Si está activa, podrá aparecer
            como opción para los clientes.
          </small>

        </div>


        <input
          type="checkbox"
          checked={
            form.active
          }
          disabled={
            disabled
          }
          onChange={(
            event,
          ) =>
            onChange(
              "active",
              event.target
                .checked,
            )
          }
        />

      </label>


      {error && (
        <div className="catalog-form__error">
          {error}
        </div>
      )}

    </div>
  );
}