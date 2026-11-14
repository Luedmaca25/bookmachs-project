import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated?: boolean;
  limit?: number;
  baseLimit?: number;
}

export const GuestLimitModal: React.FC<GuestLimitModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated = false
}) => {
  const navigate = useNavigate();

  // Obtener la configuración global para conocer el límite base oficial del plan free
  // const { data: globalSettings } = useQuery<{ dailySwipeLimitFree?: number }>({
  //   queryKey: ['globalSettings'],
  //   queryFn: () => apiClient.get<any>('/globalsettings'),
  //   staleTime: 1000 * 60 * 10,
  // });

  // El límite a comunicar para usuarios con cuenta free debe estar topado al valor oficial configurado (por defecto 40),
  // para evitar confusiones si el usuario recibió bonos por 24h que eleven temporalmente su cuota efectiva (ej. 90).
  //const configuredFreeLimit = baseLimit ?? globalSettings?.dailySwipeLimitFree ?? 40;
  //const displayLimit = isAuthenticated ? Math.min(limit, configuredFreeLimit) : 5;

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

  const handleActionClick = () => {
    onClose();
    if (isAuthenticated) {
      navigate('/planes?plan=premium#plan-premium');
    } else {
      navigate('/auth');
    }
  };

  const modalContent = (
    <div
      className="guest-limit-modal-overlay"
      onClick={onClose}
    >
      <div
        className="guest-limit-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="guest-limit-close-btn"
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
            {isAuthenticated
              ? `¡Alcanzaste el límite de swipes mensuales!`
              : '¡Alcanzaste el límite de 5 swipes como invitado!'}
          </h2>

          <p className="guest-limit-description">
            {isAuthenticated ? (
              <>
                Pásate al <strong>Plan Premium</strong> para continuar descubriendo libros sin límites y recibir propuestas de intercambio.
              </>
            ) : (
              <>
                Has explorado 5 libros como invitado. Inicia sesión o regístrate en <strong>Intercambialibros</strong> para conservar los libros que te gustaron en tu libreta y recibir propuestas de intercambio.
              </>
            )}
          </p>

          <div className="guest-limit-actions">
            <button
              type="button"
              className="guest-limit-btn-bumble font-heading"
              onClick={handleActionClick}
            >
              Conseguir más me gusta
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
