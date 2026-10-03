import {
  useEffect,
  useState,
} from "react";

import "./VisitCooldown.css";


export default function VisitCooldown({
  canRegister = true,
  secondsRemaining = 0,
  minHours = 0,
}) {
  const [
    remaining,
    setRemaining,
  ] = useState(
    Math.max(
      0,
      Number(secondsRemaining) || 0,
    ),
  );


  useEffect(() => {
    const initialSeconds =
      Math.max(
        0,
        Number(secondsRemaining) || 0,
      );

    if (
      canRegister ||
      initialSeconds <= 0
    ) {
      setRemaining(0);

      return undefined;
    }

    const deadline =
      Date.now() +
      initialSeconds * 1000;


    function updateRemaining() {
      const seconds =
        Math.max(
          0,
          Math.ceil(
            (
              deadline -
              Date.now()
            ) / 1000,
          ),
        );

      setRemaining(
        seconds,
      );
    }


    updateRemaining();

    const interval =
      window.setInterval(
        updateRemaining,
        1000,
      );


    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    canRegister,
    secondsRemaining,
  ]);


  const available =
    canRegister ||
    remaining <= 0;


  return (
    <section
      className={[
        "visit-cooldown",

        available
          ? "visit-cooldown--available"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      <div className="visit-cooldown__header">

        <div>
          <p className="visit-cooldown__eyebrow">
            PRÓXIMO SELLO
          </p>

          <h2 className="visit-cooldown__title">
            {available
              ? "YA PUEDES SUMAR OTRO SELLO"
              : "TIEMPO RESTANTE"}
          </h2>
        </div>


        <span
          className={[
            "visit-cooldown__status",

            available
              ? "visit-cooldown__status--available"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {available
            ? "DISPONIBLE"
            : "EN ESPERA"}
        </span>

      </div>


      {available ? (
        <div className="visit-cooldown__available">

          <strong>
            Tu próximo sello ya está disponible.
          </strong>

          <p>
            Escanea nuevamente el código del negocio
            cuando realices tu próxima visita.
          </p>

        </div>
      ) : (
        <>
          <p className="visit-cooldown__copy">
            Podrás sumar otro sello en:
          </p>

          <Countdown
            seconds={
              remaining
            }
          />

          {Number(minHours) >
            0 && (
            <p className="visit-cooldown__rule">
              Este negocio permite un sello cada{" "}
              <strong>
                {formatHours(
                  minHours,
                )}
              </strong>
              .
            </p>
          )}
        </>
      )}

    </section>
  );
}


function Countdown({
  seconds,
}) {
  const total =
    Math.max(
      0,
      Number(seconds) || 0,
    );

  const days =
    Math.floor(
      total / 86400,
    );

  const hours =
    Math.floor(
      (
        total % 86400
      ) / 3600,
    );

  const minutes =
    Math.floor(
      (
        total % 3600
      ) / 60,
    );

  const remainingSeconds =
    total % 60;


  return (
    <div className="visit-cooldown__timer">

      {days > 0 && (
        <TimeUnit
          value={days}
          label={
            days === 1
              ? "día"
              : "días"
          }
        />
      )}

      <TimeUnit
        value={hours}
        label="horas"
      />

      <TimeUnit
        value={minutes}
        label="min"
      />

      <TimeUnit
        value={
          remainingSeconds
        }
        label="seg"
      />

    </div>
  );
}


function TimeUnit({
  value,
  label,
}) {
  return (
    <div className="visit-cooldown__unit">

      <strong>
        {String(
          value,
        ).padStart(
          2,
          "0",
        )}
      </strong>

      <span>
        {label}
      </span>

    </div>
  );
}


function formatHours(
  value,
) {
  const hours =
    Number(value);

  if (
    !Number.isFinite(hours)
  ) {
    return "";
  }

  if (
    hours === 1
  ) {
    return "1 hora";
  }

  return `${hours} horas`;
}