import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface StepByStepTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSwiping?: () => void;
}

export const StepByStepTutorialModal: React.FC<StepByStepTutorialModalProps> = ({
  isOpen,
  onClose,
  onStartSwiping,
}) => {
  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    localStorage.setItem('tutorial_completed', 'true');
    onClose();
    if (onStartSwiping) {
      onStartSwiping();
    }
  };

  const modalContent = (
    <div
      className="modal-overlay tutorial-modal-overlay"
      onClick={handleClose}
    >
      <div
        className="tutorial-modal-card tutorial-image-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón flotante para cerrar */}
        <button
          className="tutorial-close-btn tutorial-image-close-btn"
          onClick={handleClose}
          title="Cerrar"
          aria-label="Cerrar modal"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Imagen Infográfica de Cómo Funciona */}
        <div className="tutorial-single-image-wrapper">
          <img
            src="/como-funciona.jpeg"
            alt="¿Cómo funciona Intercambialibros?"
            className="tutorial-single-image"
          />
        </div>

        {/* Botón de acción inferior */}
        <div className="tutorial-image-footer">
          <button
            type="button"
            className="tutorial-finish-btn font-heading"
            onClick={handleClose}
          >
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
