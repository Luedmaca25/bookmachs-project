import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BuyAddonModal } from './BuyAddonModal';

interface MatchPassPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  interestedCount?: number;
}

export const MatchPassPromoModal: React.FC<MatchPassPromoModalProps> = ({
  isOpen,
  onClose,
  interestedCount = 4
}) => {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 23,
    minutes: 59,
    seconds: 59
  });

  // Bloquear scroll de la página y cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Simular un contador regresivo de oferta flash de 24 horas
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    // Guardar marca para no molestar repetidamente en la misma sesión
    try {
      localStorage.setItem('match_pass_promo_dismissed_at', Date.now().toString());
    } catch (e) {
      // Ignorar error de storage
    }
    onClose();
  };

  const handleAcceptPromo = () => {
    setShowBuyModal(true);
  };

  const modalContent = (
    <>
      <div className="guest-limit-modal-overlay" onClick={handleDismiss}>
        <div
          className="guest-limit-modal-card match-pass-promo-modal"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '500px',
            padding: '2.25rem 1.75rem',
            borderRadius: '24px',
            background: 'linear-gradient(180deg, #ffffff 0%, #fefcf3 100%)',
            border: '2px solid #fbbf24',
            boxShadow: '0 20px 48px rgba(245, 158, 11, 0.28)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Cinta decorativa de oferta flash */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '-32px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '4px 36px',
              transform: 'rotate(45deg)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          >
            Oferta Flash
          </div>

          <button
            className="guest-limit-close-btn"
            onClick={handleDismiss}
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>

          <div style={{ textAlign: 'center', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '70px',
                height: '70px',
                margin: '0 auto 0.75rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                boxShadow: '0 10px 20px rgba(239, 68, 68, 0.3)'
              }}
            >
              <i className="fa-solid fa-fire"></i>
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1f2937', margin: '0 0 0.4rem', lineHeight: 1.25 }}>
              ¡Hay usuarios que quieren intercambiar contigo!
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#4b5563', margin: 0, lineHeight: 1.4 }}>
              Tienes <strong>{interestedCount} libros y usuarios</strong> esperando por ti en la pestaña <strong>Match Pass</strong>.
            </p>
          </div>

          {/* Reloj de cuenta regresiva */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              background: '#fffbeb',
              border: '1px dashed #f59e0b',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem'
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
              Termina en:
            </span>
            <div style={{ display: 'flex', gap: '0.35rem', fontWeight: 800, fontSize: '1.1rem', color: '#b45309' }}>
              <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
              <span>:</span>
              <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
              <span>:</span>
              <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1rem', color: '#9ca3af', textDecoration: 'line-through' }}>
                $2.990 CLP
              </span>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#dc2626' }}>
                $990 CLP
              </span>
              <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>
                / 24 Horas
              </span>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem', color: '#374151' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
                <span>Desbloquea quiénes han dado like a tus libros.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
                <span>Descubre libros disponibles de Ecolectura para ti.</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
                <span>Inicia el intercambio inmediatamente sin esperas.</span>
              </li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={handleAcceptPromo}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                color: '#ffffff',
                fontSize: '1.05rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 6px 16px rgba(239, 68, 68, 0.35)',
                transition: 'transform 0.15s ease'
              }}
            >
              <i className="fa-solid fa-bolt"></i>
              <span>Aprovechar Match Pass 24h por $990</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: '#9ca3af',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Quizás más tarde
            </button>
          </div>
        </div>
      </div>

      <BuyAddonModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        addonType="MatchPassDayPromo"
        customPriceClp={990}
      />
    </>
  );

  return createPortal(modalContent, document.body);
};
