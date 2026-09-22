import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

interface SearchPremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchPremiumModal: React.FC<SearchPremiumModalProps> = ({
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
            <i className="fa-solid fa-magnifying-glass undo-main-icon"></i>
            <span className="undo-crown-badge-modal">
              <i className="fa-solid fa-crown"></i>
            </span>
          </div>

          <h2 className="guest-limit-title font-heading">
            ¡Busca cualquier libro con tu Plan Premium!
          </h2>

          <p className="guest-limit-description">
            La búsqueda directa por título, autor o palabra clave entre miles de libros es un <strong>beneficio exclusivo para miembros Premium</strong>.
          </p>

          <ul className="undo-premium-benefits">
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Búsqueda directa e instantánea por título, autor y temas</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Acceso ilimitado al Catálogo Avanzado con filtros</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Swipes ilimitados todos los días sin restricciones</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Reserva anticipada de libros de stock interno en un clic</span>
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
