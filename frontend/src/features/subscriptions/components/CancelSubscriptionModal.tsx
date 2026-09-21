import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../../lib/apiClient';
import { useAuthStore } from '../../authentication/store/authStore';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  subscriptionEndDate?: string | null;
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  subscriptionEndDate
}) => {
  const { login } = useAuthStore();
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Formato de fecha legible
  const formattedEndDate = subscriptionEndDate
    ? new Date(subscriptionEndDate).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : 'el final de tu ciclo de facturación';

  // Validación de doble check con la palabra "confirmar" (ignora mayúsculas/espacios)
  const isConfirmed = confirmText.trim().toLowerCase() === 'confirmar';

  // Bloqueo de scroll en body, atajo tecla Escape y reseteo de scroll al tope
  useEffect(() => {
    if (!isOpen) return;

    setConfirmText('');
    setError(null);
    document.body.style.overflow = 'hidden';

    // Asegurar que el scroll empiece siempre hasta arriba
    requestAnimationFrame(() => {
      if (overlayRef.current) overlayRef.current.scrollTop = 0;
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleCancelSubscription = async () => {
    if (!isConfirmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.post<any>('/subscriptions/cancel');

      if (response.success) {
        // Actualizar sesión con el nuevo perfil sincronizado
        const updatedProfile = await apiClient.get<any>('/auth/me');
        const token = localStorage.getItem('token') || '';
        login(updatedProfile, token);

        onSuccess(
          response.message ||
            `Suscripción cancelada con éxito. Podrás seguir disfrutando de tus beneficios Premium hasta el ${formattedEndDate}.`
        );
        onClose();
      } else {
        setError(response.message || 'No se pudo procesar la cancelación de tu suscripción.');
      }
    } catch (err: any) {
      console.error('Error al cancelar suscripción:', err);
      setError(
        err.message || 'Ocurrió un error de conexión al procesar la cancelación. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div ref={overlayRef} className="help-modal-overlay" onClick={isSubmitting ? undefined : onClose}>
      <div className="help-modal-card cancel-sub-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header del modal */}
        <div className="help-modal-header cancel-sub-header">
          <div className="help-modal-header-title">
            <div>
              <h3 className="help-modal-title">Cancelar Suscripción</h3>
            </div>
          </div>
          <button
            className="help-modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Cuerpo del modal */}
        <div ref={bodyRef} className="help-modal-body cancel-sub-body">
          {error && (
            <div className="modal-error-alert">
              <i className="fa-solid fa-circle-exclamation"></i> {error}
            </div>
          )}

          <div className="cancel-sub-notice-box">
            <h4 className="cancel-notice-title">
              ¿Estás seguro de que deseas cancelar tu suscripción?
            </h4>
            <p className="cancel-notice-text">
              Lamentamos que decidas dejarnos. Al confirmar la cancelación:
            </p>
            <ul className="cancel-notice-list">
              <li>
                <i className="fa-solid fa-circle-check text-green"></i>
                <span>
                  <strong>Conservarás tus beneficios Premium</strong> (swipes ilimitados, 5 intercambios al mes, catálogo avanzado, reservas de 48 hrs y soporte 24/7) hasta el <strong>{formattedEndDate}</strong>.
                </span>
              </li>
              <li>
                <i className="fa-solid fa-clock-rotate-left text-amber"></i>
                <span>
                  Al finalizar tu período el {formattedEndDate}, tu cuenta volverá automáticamente al <strong>Plan Gratuito</strong> (límite de 40 swipes y 2 intercambios mensuales).
                </span>
              </li>
            </ul>
          </div>

          {/* Caja de doble check */}
          <div className="cancel-double-check-box">
            <label htmlFor="confirmCancelInput" className="cancel-double-check-label">
              <i className="fa-solid fa-shield-halved"></i>
              <span>
                Para evitar cancelaciones involuntarias, escribe la palabra <strong>"confirmar"</strong> a continuación:
              </span>
            </label>
            <input
              id="confirmCancelInput"
              type="text"
              className="help-modal-input cancel-confirm-input"
              placeholder='Escribe "confirmar"'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <div className="cancel-feedback-row">
              {isConfirmed ? (
                <span className="cancel-confirm-valid">
                  <i className="fa-solid fa-circle-check"></i> Palabra correcta. Ahora puedes proceder a cancelar.
                </span>
              ) : (
                <span className="cancel-confirm-pending">
                  <i className="fa-solid fa-circle-info"></i> Debes escribir exactamente "confirmar" para habilitar el botón.
                </span>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="cancel-sub-actions">
            <button
              type="button"
              className="btn-keep-premium"
              onClick={onClose}
              disabled={isSubmitting}
            >
              <i className="fa-solid fa-arrow-left"></i> Mantener mi Plan Premium
            </button>

            <button
              type="button"
              className="btn-confirm-cancel-sub"
              disabled={!isConfirmed || isSubmitting}
              onClick={handleCancelSubscription}
            >
              {isSubmitting ? (
                <span>
                  <i className="fa-solid fa-spinner fa-spin"></i> Cancelando...
                </span>
              ) : (
                <span>
                  <i className="fa-solid fa-ban"></i> Confirmar Cancelación
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
