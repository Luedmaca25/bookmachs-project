import React, { useState } from 'react';
import { apiClient } from '../../../lib/apiClient';
import { useAuthStore } from '../../authentication/store/authStore';

export interface AddonInfo {
  type: string;
  name: string;
  tagline: string;
  priceClp: number;
  durationLabel: string;
  icon: string;
  benefits: string[];
}

export const ADDONS_CATALOG: Record<string, AddonInfo> = {
  Premium24h: {
    type: 'Premium24h',
    name: 'Plan Premium por 24 Horas',
    tagline: 'Acceso total relámpago a todas las funciones Premium',
    priceClp: 2990,
    durationLabel: '24 horas',
    icon: 'fa-solid fa-bolt',
    benefits: [
      'Swipes ilimitados durante 24 horas',
      'Deshacer último Swipe (Rewind)',
      'Acceso a reservas de hasta 2 libros simultáneos por 4 horas',
      'Match Pass desbloqueado durante 24 horas',
      'Búsquedas directas en catálogo avanzado'
    ]
  },
  UnlimitedLikes24h: {
    type: 'UnlimitedLikes24h',
    name: 'Likes Ilimitados por 24 Horas',
    tagline: 'Desliza sin límites de likes durante todo un día',
    priceClp: 1990,
    durationLabel: '24 horas',
    icon: 'fa-solid fa-heart-pulse',
    benefits: [
      'Me gusta a la derecha ilimitados',
      'Sin bloqueos por tope diario o mensual',
      'Aumenta tus probabilidades de match de inmediato'
    ]
  },
  AuthorSearches10: {
    type: 'AuthorSearches10',
    name: '10 Búsquedas por Autor y Catálogo',
    tagline: 'Encuentra directamente tus autores y obras favoritas',
    priceClp: 990,
    durationLabel: '10 búsquedas',
    icon: 'fa-solid fa-magnifying-glass',
    benefits: [
      '10 búsquedas avanzadas en catálogo',
      'Filtro por autor, título y sinopsis',
      'Acumulable a tus búsquedas de plan'
    ]
  },
  BookBoost48h: {
    type: 'BookBoost48h',
    name: 'Muestra tus Libros Primero (Boost 48h)',
    tagline: 'Tus libros aparecerán primero a otros usuarios',
    priceClp: 490,
    durationLabel: '48 horas',
    icon: 'fa-solid fa-rocket',
    benefits: [
      'Prioridad número 1 en el carrusel de recomendaciones de otros usuarios',
      'Máxima visibilidad para intercambiar más rápido',
      'Válido por 48 horas continuas para tus libros'
    ]
  },
  MatchPassWeek: {
    type: 'MatchPassWeek',
    name: 'Match Pass (1 Semana)',
    tagline: '¡Mira quiénes quieren intercambiar contigo!',
    priceClp: 2990,
    durationLabel: '7 días',
    icon: 'fa-solid fa-heart-circle-bolt',
    benefits: [
      'Desbloquea la pestaña Match Pass sin borrosidad',
      'Descubre qué usuarios dieron like a tus libros',
      'Accede a la selección exclusiva de stock Ecolectura',
      'Inicia intercambios directos sin esperar'
    ]
  },
  MatchPassDayPromo: {
    type: 'MatchPassDayPromo',
    name: 'Match Pass Promo Flash (24 Horas)',
    tagline: 'Oferta especial por 24 horas para desbloquear tus matches',
    priceClp: 990,
    durationLabel: '24 horas',
    icon: 'fa-solid fa-fire-flame-curved',
    benefits: [
      'Desbloqueo instantáneo por 24 horas',
      'Mira quiénes quieren tus libros hoy mismo',
      'Precio promocional exclusivo flash'
    ]
  }
};

interface BuyAddonModalProps {
  isOpen: boolean;
  onClose: () => void;
  addonType: string | null;
  targetBookId?: string;
  customPriceClp?: number;
}

export const BuyAddonModal: React.FC<BuyAddonModalProps> = ({
  isOpen,
  onClose,
  addonType,
  targetBookId,
  customPriceClp
}) => {
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !addonType) return null;

  const addon = ADDONS_CATALOG[addonType];
  if (!addon) return null;

  const priceClp = customPriceClp ?? addon.priceClp;

  const handleStartWebpay = async () => {
    if (!isAuthenticated) {
      window.location.href = '/auth';
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const returnUrl = `${window.location.origin}/planes?addon=1`;
      const response = await apiClient.post<{
        success: boolean;
        token: string;
        redirectUrl: string;
        buyOrder?: string;
        message?: string;
      }>('/addons/webpay-start', {
        addonType: addon.type,
        returnUrl,
        targetBookId: targetBookId || null
      });

      if (response.success && response.redirectUrl && response.token) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = response.redirectUrl;

        const tokenInput = document.createElement('input');
        tokenInput.type = 'hidden';
        tokenInput.name = 'token_ws';
        tokenInput.value = response.token;
        form.appendChild(tokenInput);

        document.body.appendChild(form);
        form.submit();
      } else {
        setErrorMessage(response.message || 'No se pudo iniciar la transacción en Transbank Webpay Plus.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error al iniciar Webpay de complemento:', err);
      setErrorMessage(err.message || 'Error de comunicación con el servicio de pagos.');
      setLoading(false);
    }
  };

  return (
    <div className="book-detail-modal-overlay" onClick={onClose}>
      <div
        className="book-detail-modal-card addon-purchase-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', padding: '1.75rem', borderRadius: '16px' }}
      >
        <button
          className="book-detail-close-btn"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="addon-modal-header" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            className="addon-modal-icon-badge"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              marginBottom: '0.75rem',
              boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)'
            }}
          >
            <i className={addon.icon}></i>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.25rem', color: '#1f2937' }}>
            {addon.name}
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
            {addon.tagline}
          </p>
        </div>

        <div
          className="addon-modal-price-box"
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}
        >
          <span style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Duración: {addon.durationLabel}
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#059669', marginTop: '0.25rem' }}>
            ${priceClp.toLocaleString('es-CL')} <span style={{ fontSize: '1rem', fontWeight: 600 }}>CLP</span>
          </div>
        </div>

        <div className="addon-modal-benefits" style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' }}>
            ¿Qué incluye este pase?
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {addon.benefits.map((benefit, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.9rem', color: '#4b5563' }}>
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981', marginTop: '3px' }}></i>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {errorMessage && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}
          >
            {errorMessage}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleStartWebpay}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Conectando con Transbank...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-credit-card"></i>
                <span>Pagar con Webpay Plus (${priceClp.toLocaleString('es-CL')} CLP)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              border: '1px solid #d1d5db',
              background: 'transparent',
              color: '#6b7280',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
};
