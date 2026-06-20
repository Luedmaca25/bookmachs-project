import React from 'react';

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitValue: number;
}

export const UpsellModal: React.FC<UpsellModalProps> = ({ isOpen, onClose, limitValue }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card upsell-modal-card">
        <div className="modal-header">
          <h2>⚡ Límite Diario Alcanzado</h2>
          <p>Has consumido tu cuota gratuita diaria de <strong>{limitValue} swipes</strong>.</p>
        </div>

        <div className="upsell-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">🚀</span>
            <div className="benefit-text">
              <h4>Desliza sin límites</h4>
              <p>Aumenta tu límite hasta 1,000 swipes diarios y no te pierdas ningún libro.</p>
            </div>
          </div>

          <div className="benefit-item">
            <span className="benefit-icon">🔐</span>
            <div className="benefit-text">
              <h4>Reservas Exclusivas</h4>
              <p>Bloquea y reserva libros de tu interés por hasta 48 horas para asegurar el match.</p>
            </div>
          </div>

          <div className="benefit-item">
            <span className="benefit-icon">🔍</span>
            <div className="benefit-text">
              <h4>Búsquedas Avanzadas</h4>
              <p>Navega por el catálogo completo filtrando por autores y editoriales directamente.</p>
            </div>
          </div>
        </div>

        <div className="upsell-plans">
          <div className="plan-card">
            <h3>Plan Básico</h3>
            <span className="plan-price font-heading">$2.00 USD <small>/mes</small></span>
            <p className="plan-desc">Aumenta tu cuota a 500 swipes diarios.</p>
            <button className="plan-btn" onClick={() => alert('Pasarela de pagos en desarrollo...')}>
              Elegir Básico
            </button>
          </div>

          <div className="plan-card highlighted">
            <span className="popular-badge font-heading">Recomendado</span>
            <h3>Plan Premium</h3>
            <span className="plan-price font-heading">$5.00 USD <small>/mes</small></span>
            <p className="plan-desc">Swipes ilimitados y reservas por 48 horas.</p>
            <button className="plan-btn premium-btn" onClick={() => alert('Pasarela de pagos en desarrollo...')}>
              Elegir Premium
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="close-upsell-btn" onClick={onClose}>
            Seguir explorando mañana
          </button>
        </div>
      </div>
    </div>
  );
};
