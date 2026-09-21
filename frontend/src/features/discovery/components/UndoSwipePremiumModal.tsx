import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

interface UndoSwipePremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UndoSwipePremiumModal: React.FC<UndoSwipePremiumModalProps> = ({
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
        className="tutorial-modal-card guest-limit-modal-card undo-premium-modal-card"
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
          <div className="undo-premium-icon-wrapper">
            <i className="fa-solid fa-rotate-left undo-main-icon"></i>
            <span className="undo-crown-badge-modal">
              <i className="fa-solid fa-crown"></i>
            </span>
          </div>

          <h2 className="guest-limit-title font-heading">
            ¡Regresa al libro anterior con tu Plan Premium!
          </h2>

          <p className="guest-limit-description">
            ¿Diste swipe por error o te quedaste con ganas de volver a ver un libro? Rebobinar y recuperar libros en tu exploración es un <strong>beneficio exclusivo para miembros Premium</strong>.
          </p>

          <ul className="undo-premium-benefits">
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Rebobina y cambia tu decisión tantas veces como quieras</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Swipes ilimitados todos los días sin restricciones</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Acceso directo al Catálogo Avanzado y reservas anticipadas</span>
            </li>
          </ul>

          <div className="guest-limit-actions">
            <button
              type="button"
              className="guest-limit-btn-primary undo-premium-cta-btn font-heading"
              onClick={() => {
                onClose();
                navigate('/planes');
              }}
            >
              <i className="fa-solid fa-crown"></i> Ver Planes y Membresías
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
