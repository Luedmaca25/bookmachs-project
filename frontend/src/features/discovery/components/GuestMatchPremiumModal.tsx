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
            <i className="fa-solid fa-heart-circle-check guest-match-main-icon"></i>
            <span className="guest-match-crown-badge">
              <i className="fa-solid fa-crown"></i>
            </span>
          </div>

          <h2 className="guest-limit-title font-heading">
            ¡Hiciste tu primer Match!
          </h2>

          {book && (
            <div className="guest-match-book-preview">
              {book.imageUrl ? (
                <img
                  src={getFileUrl(book.imageUrl)}
                  alt={book.title}
                  className="guest-match-book-thumb"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400';
                  }}
                />
              ) : (
                <div className="guest-match-book-placeholder">
                  <i className="fa-solid fa-book"></i>
                </div>
              )}
              <div className="guest-match-book-info">
                <span className="guest-match-book-badge">
                  <i className="fa-solid fa-sparkles"></i> ¡Intercambio disponible!
                </span>
                <h4 className="guest-match-book-title font-heading">{book.title}</h4>
                <p className="guest-match-book-author">{book.author}</p>
              </div>
            </div>
          )}

          <p className="guest-limit-description">
            ¡Felicidades! Encontraste un libro compatible. Pásate al{' '}
            <strong>Plan Premium</strong> para asegurar tus intercambios de inmediato,
            disfrutar de swipes ilimitados y reservar ejemplares sin esperas.
          </p>

          <ul className="undo-premium-benefits guest-match-benefits">
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Swipes ilimitados todos los días sin restricciones</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Reserva hasta 2 libros de stock interno por 4 horas</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>5 intercambios al mes con soporte y seguimiento prioritario</span>
            </li>
            <li>
              <i className="fa-solid fa-circle-check"></i>
              <span>Búsqueda directa por título/autor y Catálogo Avanzado</span>
            </li>
          </ul>

          <div className="guest-limit-actions">
            <button
              type="button"
              className="guest-limit-btn-primary undo-premium-cta-btn font-heading"
              onClick={handleGoToPremium}
            >
              <i className="fa-solid fa-crown"></i> Ver Planes y Activar Premium
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
