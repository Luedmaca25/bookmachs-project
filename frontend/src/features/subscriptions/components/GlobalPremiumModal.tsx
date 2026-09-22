import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

export interface GlobalPremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  title?: string;
  description?: string;
  icon?: string;
}

export const GlobalPremiumModal: React.FC<GlobalPremiumModalProps> = ({
  isOpen,
  onClose,
  featureName,
  title,
  description,
  icon = 'fa-solid fa-crown',
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

  const modalTitle =
    title ||
    (featureName
      ? `¡Desbloquea ${featureName} con tu Plan Premium!`
      : '¡Desbloquea todas las funciones con tu Plan Premium!');

  const modalDesc =
    description ||
    (featureName
      ? `La función de ${featureName} es un beneficio exclusivo para miembros con suscripción Premium activa.`
      : 'Disfruta de búsquedas directas, catálogo avanzado, swaps ilimitados, reservas de libros y soporte prioritario 24/7.');

  const modalContent = (
    <div className="modal-overlay tutorial-modal-overlay" onClick={onClose}>
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
            <i className={`${icon} undo-main-icon`}></i>
            <span className="undo-crown-badge-modal">
              <i className="fa-solid fa-crown"></i>
            </span>
          </div>

          <h2 className="guest-limit-title font-heading">{modalTitle}</h2>

          <p className="guest-limit-description">{modalDesc}</p>

          <ul className="undo-premium-benefits">
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Búsqueda directa por título, autor o palabras clave</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Acceso ilimitado al Catálogo Avanzado con filtros</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Rebobina y recupera libros anteriores al explorar</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Swipes ilimitados todos los días sin restricciones</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Reserva anticipada de libros de stock interno por 48 horas</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Canal de Soporte prioritario y mediación 24/7</span>
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
