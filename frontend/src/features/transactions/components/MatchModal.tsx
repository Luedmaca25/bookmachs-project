import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/apiClient';

interface BookItem {
  id: string;
  title: string;
  author: string;
  condition: string;
  description: string;
  imageUrl: string;
}

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookItem | null;
  matchTransactionId: string | null;
  onProceedToCheckout: (transactionId: string) => void;
}

interface FeeEstimation {
  bookId: string;
  bookTitle: string;
  baseValue: number;
  feePercentage: number;
  rawFee: number;
  minFeeAmount: number;
  maxFeeAmount: number;
  finalFee: number;
  isCrossBorder: boolean;
  requesterCountry: string;
  ownerCountry: string;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  isOpen,
  onClose,
  book,
  matchTransactionId,
  onProceedToCheckout,
}) => {
  const [loading, setLoading] = useState(false);
  const [feeDetails, setFeeDetails] = useState<FeeEstimation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !book) return;

    const fetchFee = async () => {
      setLoading(true);
      setError(null);
      try {
        const details = await apiClient.get<FeeEstimation>(`/transactions/estimate-fee/${book.id}`);
        setFeeDetails(details);
      } catch (err: any) {
        console.error('Error fetching fee details:', err);
        setError('No se pudo cargar la estimación de la tarifa por IA.');
      } finally {
        setLoading(false);
      }
    };

    fetchFee();
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card match-modal-card">
        <div className="match-badge">🎉 ¡MATCH LOGRADO!</div>

        <div className="matched-book-showcase">
          <div className="matched-book-img-container">
            {book.imageUrl ? (
              <img src={book.imageUrl} alt={book.title} className="matched-book-img" />
            ) : (
              <span className="matched-book-fallback">📖</span>
            )}
          </div>
          <div className="matched-book-details">
            <h3>{book.title}</h3>
            <span className="matched-book-author">por {book.author}</span>
            <span className={`condition-badge ${book.condition.toLowerCase()}`}>
              {book.condition}
            </span>
          </div>
        </div>

        <div className="fee-breakdown-box">
          <h4 className="box-title">Desglose de Tarifa de Intercambio (Fee)</h4>
          
          {loading ? (
            <div className="fee-loading">Calculando tarifa por IA...</div>
          ) : error ? (
            <div className="fee-error">{error}</div>
          ) : feeDetails ? (
            <div className="fee-details-list">
              <div className="fee-row">
                <span>Valor de Referencia:</span>
                <span className="fee-val">${feeDetails.baseValue.toLocaleString()} CLP</span>
              </div>
              <div className="fee-row">
                <span>Cálculo Base ({Math.round(feeDetails.feePercentage * 100)}%):</span>
                <span className="fee-val">${feeDetails.rawFee.toLocaleString()} CLP</span>
              </div>

              {feeDetails.rawFee < feeDetails.minFeeAmount && (
                <div className="fee-row fee-notice">
                  <span>Ajustado al mínimo de la plataforma:</span>
                  <span className="fee-val">${feeDetails.minFeeAmount.toLocaleString()} CLP</span>
                </div>
              )}

              {feeDetails.rawFee > feeDetails.maxFeeAmount && (
                <div className="fee-row fee-notice">
                  <span>Ajustado al tope máximo de la plataforma:</span>
                  <span className="fee-val">${feeDetails.maxFeeAmount.toLocaleString()} CLP</span>
                </div>
              )}

              <div className="fee-divider"></div>

              <div className="fee-row final-row">
                <strong>Total a Pre-autorizar (Hold):</strong>
                <strong className="final-price">${feeDetails.finalFee.toLocaleString()} CLP</strong>
              </div>

              {feeDetails.isCrossBorder && (
                <div className="cross-border-alert">
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-content">
                    <strong>Envío Internacional Detectado</strong>
                    <p>
                      El libro pertenece a un usuario en <strong>{feeDetails.ownerCountry}</strong>.
                      Al proceder con el checkout, acepta posibles costos de logística transfronteriza.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="match-actions">
          <button
            type="button"
            className="checkout-proceed-btn font-heading"
            onClick={() => matchTransactionId && onProceedToCheckout(matchTransactionId)}
            disabled={loading || !matchTransactionId}
          >
            Proceder al Checkout 💳
          </button>
          <button type="button" className="keep-swiping-btn" onClick={onClose}>
            Seguir explorando libros
          </button>
        </div>
      </div>
    </div>
  );
};
