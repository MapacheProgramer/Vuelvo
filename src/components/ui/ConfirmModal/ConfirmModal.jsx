import {
  useEffect,
} from "react";

import "./ConfirmModal.css";

export default function ConfirmModal({
  open,
  eyebrow = "Confirmación",
  title,
  children,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  loading = false,
  danger = false,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (
        event.key === "Escape" &&
        !loading
      ) {
        onClose?.();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [
    open,
    loading,
    onClose,
  ]);

  if (!open) {
    return null;
  }

  function handleBackdrop(event) {
    if (
      event.target ===
        event.currentTarget &&
      !loading
    ) {
      onClose?.();
    }
  }

  return (
    <div
      className="confirm-modal__backdrop"
      onMouseDown={
        handleBackdrop
      }
    >
      <section
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="confirm-modal__top">
          <div>
            <p className="confirm-modal__eyebrow">
              {eyebrow}
            </p>

            <h2
              id="confirm-modal-title"
              className="confirm-modal__title"
            >
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="confirm-modal__close"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="confirm-modal__body">
          {children}
        </div>

        <div className="confirm-modal__actions">
          <button
            type="button"
            className="confirm-modal__cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={[
              "confirm-modal__confirm",
              danger
                ? "confirm-modal__confirm--danger"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Procesando..."
              : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}