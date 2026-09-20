import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestLimitModal: React.FC<GuestLimitModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  // Cerrar al presionar tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="modal-overlay tutorial-modal-overlay"
      onClick={onClose}
    >
      <div
        className="tutorial-modal-card guest-limit-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón flotante para cerrar */}
        <button
          className="tutorial-close-btn"
          onClick={onClose}
          title="Cerrar modal"
          aria-label="Cerrar modal"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="guest-limit-modal-body">
          <div className="guest-limit-icon-wrapper">
            <i className="fa-solid fa-fire-flame-curved"></i>
          </div>

          <h2 className="guest-limit-title font-heading">
            ¡Alcanzaste el límite de 5 swipes como invitado!
          </h2>

          <p className="guest-limit-description">
            Has explorado 5 libros como invitado. Inicia sesión o regístrate en <strong>Intercambialibros</strong> para conservar los libros que te gustaron en tu libreta y recibir propuestas de intercambio.
          </p>

          <div className="guest-limit-actions">
            <button
              type="button"
              className="guest-limit-btn-primary font-heading"
              onClick={() => {
                onClose();
                navigate('/auth');
              }}
            >
              🚀 Registrarme / Iniciar Sesión
            </button>

            <button
              type="button"
              className="guest-limit-btn-cancel font-heading"
              onClick={onClose}
            >
              Continuar explorando
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
