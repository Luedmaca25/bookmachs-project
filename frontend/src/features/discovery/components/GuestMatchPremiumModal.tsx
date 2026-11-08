import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getFileUrl } from '../../../lib/formatters';

interface MatchedBookInfo {
  id: string;
  title: string;
  author: string;
  imageUrl?: string;
  condition?: string;
}

interface GuestMatchPremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  book?: MatchedBookInfo | null;
}

export const GuestMatchPremiumModal: React.FC<GuestMatchPremiumModalProps> = ({
  isOpen,
  onClose,
  book,
}) => {
  const navigate = useNavigate();

  // Cerrar al presionar tecla Escape y bloquear scroll del body
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoToPremium = () => {
    onClose();
    navigate('/planes?plan=premium#plan-premium');
  };

  const modalContent = (
    <div className="guest-limit-modal-overlay" onClick={onClose}>
      <div
        className="guest-limit-modal-card guest-match-premium-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón flotante para cerrar */}
        <button
          className="guest-limit-close-btn"
          onClick={onClose}
          title="Cerrar modal"
          aria-label="Cerrar modal"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="guest-limit-modal-body">
          <div className="guest-match-icon-wrapper">
            <i className="fa-solid fa-fire-flame-curved"></i>
          </div>

          <h2 className="guest-limit-title font-heading">
            ¡Ya tienes tu <span className='text-green'>posible</span> primer Match!
          </h2>

          {book && (
            <p className="guest-limit-description">
              Inicia sesión o regístrate para intercambiar <strong>"{book.title}"</strong>
            </p>
          )}

          <div className="guest-limit-actions">
            <button
              type="button"
              className="guest-limit-btn-bumble font-heading"
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
