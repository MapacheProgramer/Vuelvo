import "./RewardCatalogPreview.css";


export default function RewardCatalogPreview({
  rewards = [],
  required = 8,
  stamps = 0,
}) {
  if (
    !Array.isArray(rewards) ||
    rewards.length === 0
  ) {
    return null;
  }


  const safeRequired =
    Number(required) > 0
      ? Number(required)
      : 8;


  const safeStamps =
    Math.max(
      0,
      Math.min(
        Number(stamps) || 0,
        safeRequired,
      ),
    );


  const remaining =
    Math.max(
      safeRequired -
        safeStamps,
      0,
    );


  return (
    <section className="reward-preview">

      <div className="reward-preview__header">

        <div>
          <p className="reward-preview__eyebrow">
            RECOMPENSAS
          </p>

          <h2 className="reward-preview__title">
            LO QUE PUEDES DESBLOQUEAR
          </h2>
        </div>


        <span className="reward-preview__progress">
          {safeStamps} /{" "}
          {safeRequired}
        </span>

      </div>


      <p className="reward-preview__intro">
        {remaining > 0
          ? `Cuando completes ${safeRequired} sellos podrás elegir una de estas recompensas.`
          : "Completaste tu tarjeta. Ya puedes elegir una de las recompensas disponibles."}
      </p>


      <div className="reward-preview__list">

        {rewards.map(
          (reward) => (
            <article
              key={
                reward.id
              }
              className="reward-preview__item"
            >

              <div className="reward-preview__item-content">

                <p className="reward-preview__item-label">
                  RECOMPENSA
                </p>


                <h3>
                  {reward.name}
                </h3>


                {reward.description && (
                  <p className="reward-preview__description">
                    {
                      reward.description
                    }
                  </p>
                )}

              </div>


              <div className="reward-preview__unlock">
                <span>
                  SE DESBLOQUEA AL COMPLETAR
                </span>

                <strong>
                  {safeRequired} /{" "}
                  {safeRequired} SELLOS
                </strong>
              </div>

            </article>
          ),
        )}

      </div>

    </section>
  );
}