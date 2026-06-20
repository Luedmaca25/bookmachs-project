import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

interface MatchTransaction {
  id: string;
  requesterUserId: string;
  requesterName: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookImageUrl: string;
  bookCondition: string;
  ownerUserId: string | null;
  ownerName: string;
  feeAmount: number;
  paymentStatus: string;
  logisticsStatus: string;
  isCrossBorder: boolean;
  createdAt: string;
}

export const TransactionsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutId = searchParams.get('checkout');
  const webpayTokenWs = searchParams.get('token_ws');

  // Estado general
  const [matches, setMatches] = useState<MatchTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para el Checkout
  const [selectedTx, setSelectedTx] = useState<MatchTransaction | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'webpay'>('card');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [acceptCrossBorder, setAcceptCrossBorder] = useState(false);

  // Simulación de redirección de Webpay
  const [webpayRedirecting, setWebpayRedirecting] = useState(false);

  // Cargar lista de matches
  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<MatchTransaction[]>('/transactions/my-matches');
      setMatches(data);
    } catch (err: any) {
      console.error('Error al cargar matches:', err);
      setError('No se pudieron cargar tus matches activos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  // Cargar detalles de checkout si hay un checkoutId
  useEffect(() => {
    if (checkoutId && matches.length > 0) {
      const tx = matches.find((m) => m.id === checkoutId);
      if (tx) {
        setSelectedTx(tx);
        setCheckoutSuccess(false);
        setCheckoutError(null);
        setAcceptCrossBorder(false);
      } else {
        // Si no está en el listado local, recargar o limpiar
        setSelectedTx(null);
        setAcceptCrossBorder(false);
      }
    } else {
      setSelectedTx(null);
      setAcceptCrossBorder(false);
    }
  }, [checkoutId, matches]);

  // Manejar el retorno de Webpay (Simulado / Real)
  useEffect(() => {
    if (webpayTokenWs) {
      const confirmWebpay = async () => {
        setCheckoutLoading(true);
        setCheckoutError(null);
        try {
          const response = await apiClient.post<any>(`/transactions/webpay-confirm?token_ws=${webpayTokenWs}`);
          if (response.success) {
            setCheckoutSuccess(true);
            loadMatches();
          } else {
            setCheckoutError(response.message || 'La confirmación del pago en Webpay falló.');
          }
        } catch (err: any) {
          console.error('Error confirming Webpay:', err);
          setCheckoutError('Error al conectar con el servidor para confirmar Webpay.');
        } finally {
          setCheckoutLoading(false);
          // Limpiar parámetros para no reconfirmar al recargar
          setSearchParams({});
        }
      };

      confirmWebpay();
    }
  }, [webpayTokenWs]);

  // Procesar pago con tarjeta (Mercado Pago)
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    // Validación básica de campos
    if (!cardName || cardNumber.length < 15 || cardExpiry.length < 4 || cardCvv.length < 3) {
      setCheckoutError('Por favor ingresa todos los campos de tarjeta válidos.');
      return;
    }

    if (selectedTx.isCrossBorder && !acceptCrossBorder) {
      setCheckoutError('Debe aceptar expresamente la confirmación por el costo de envío internacional.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const payload = {
        matchTransactionId: selectedTx.id,
        cardToken: `tok_card_mock_${paymentMethod}_${cardCvv}`,
        acceptCrossBorder: acceptCrossBorder
      };

      const response = await apiClient.post<any>('/transactions/checkout-card', payload);
      
      if (response.success) {
        setCheckoutSuccess(true);
        loadMatches();
      } else {
        setCheckoutError(response.message || 'No se pudo autorizar la retención en tu tarjeta.');
      }
    } catch (err: any) {
      console.error('Error in card checkout:', err);
      // Intentar extraer el mensaje de error del backend
      let msg = 'Error de red al procesar el pago.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed && parsed.message) msg = parsed.message;
      } catch {}
      setCheckoutError(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Procesar inicio de Webpay
  const handleWebpayStart = async () => {
    if (!selectedTx) return;

    if (selectedTx.isCrossBorder && !acceptCrossBorder) {
      setCheckoutError('Debe aceptar expresamente la confirmación por el costo de envío internacional.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const returnUrl = `${window.location.origin}/transacciones`;
      const payload = {
        matchTransactionId: selectedTx.id,
        returnUrl: returnUrl,
        acceptCrossBorder: acceptCrossBorder
      };

      const response = await apiClient.post<any>('/transactions/webpay-start', payload);

      if (response.success && response.token && response.redirectUrl) {
        // Simular una redirección visual bonita para el demo en lugar de saltar a un dominio ajeno de pruebas
        setWebpayRedirecting(true);
        
        setTimeout(() => {
          setWebpayRedirecting(false);
          // Forzar la redirección simulada enviando el token_ws a nosotros mismos para ejecutar el commit!
          setSearchParams({ token_ws: response.token });
        }, 1800);
      } else {
        setCheckoutError(response.message || 'Error al iniciar la sesión de Webpay.');
        setCheckoutLoading(false);
      }
    } catch (err: any) {
      console.error('Error starting Webpay:', err);
      setCheckoutError('Error de red al conectar con Transbank.');
      setCheckoutLoading(false);
    }
  };

  // Renderizar la vista de Checkout
  if (selectedTx) {
    return (
      <div className="checkout-view-container">
        <div className="checkout-header">
          <button className="back-to-matches-btn" onClick={() => setSearchParams({})}>
            ← Volver a mis matches
          </button>
          <h2>Pasarela de Pago (Hold de Fee)</h2>
          <p>La tarifa de intercambio se pre-autoriza temporalmente y se cobra solo si el match finaliza con éxito.</p>
        </div>

        {webpayRedirecting ? (
          <div className="webpay-redirect-screen">
            <div className="redirect-loader"></div>
            <h3>Conectando con Transbank Webpay...</h3>
            <p>Por favor no cierres la ventana. Te estamos redirigiendo a la pasarela segura.</p>
          </div>
        ) : checkoutSuccess ? (
          <div className="checkout-success-screen">
            <span className="success-badge-icon">🎉</span>
            <h3>¡Pre-autorización Completada!</h3>
            <p>Los fondos del Fee de intercambio <strong>(${selectedTx.feeAmount.toLocaleString()} CLP)</strong> han sido retenidos en tu cuenta.</p>
            <div className="checkout-summary-box">
              <div className="summary-row">
                <span>Libro:</span>
                <strong>{selectedTx.bookTitle}</strong>
              </div>
              <div className="summary-row">
                <span>Estado del Pago:</span>
                <span className="badge-hold">PAGO RETENIDO (HOLD) 🔒</span>
              </div>
              <div className="summary-row">
                <span>Código Transacción:</span>
                <code>{selectedTx.id.substring(0, 8)}...</code>
              </div>
            </div>
            <button className="done-btn font-heading" onClick={() => setSearchParams({})}>
              Ver mis transacciones
            </button>
          </div>
        ) : (
          <div className="checkout-grid">
            <div className="checkout-summary-card">
              <h3>Resumen del Match</h3>
              <div className="checkout-book-info">
                <div className="checkout-book-img">
                  {selectedTx.bookImageUrl ? (
                    <img src={selectedTx.bookImageUrl} alt={selectedTx.bookTitle} />
                  ) : (
                    <span>📖</span>
                  )}
                </div>
                <div>
                  <h4>{selectedTx.bookTitle}</h4>
                  <p>Autor: {selectedTx.bookAuthor}</p>
                  <p className="checkout-cond">Estado: {selectedTx.bookCondition}</p>
                </div>
              </div>

              <div className="checkout-price-desglose">
                <div className="price-row">
                  <span>Monto del Fee de Intercambio:</span>
                  <strong>${selectedTx.feeAmount.toLocaleString()} CLP</strong>
                </div>
                <div className="price-row highlight">
                  <span>Total a pre-autorizar:</span>
                  <strong>${selectedTx.feeAmount.toLocaleString()} CLP</strong>
                </div>
              </div>

              {selectedTx.isCrossBorder && (
                <div className="checkout-alert-geo">
                  <strong>⚠️ Envío Internacional Detectado</strong>
                  <p>El propietario del libro reside en un país diferente. Los costos logísticos internacionales se coordinan por separado y son elevados.</p>
                  <div className="checkout-geo-accept-container">
                    <label className="checkout-geo-accept-label">
                      <input
                        type="checkbox"
                        checked={acceptCrossBorder}
                        onChange={(e) => setAcceptCrossBorder(e.target.checked)}
                        className="checkout-geo-checkbox"
                      />
                      <span className="checkout-geo-accept-text">Comprendo y acepto asumir los costos adicionales del envío internacional.</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="checkout-payment-card">
              <h3>Elige tu Método de Pago</h3>
              
              <div className="payment-methods-tabs">
                <button
                  type="button"
                  className={`method-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  💳 Tarjeta de Crédito (Mercado Pago)
                </button>
                <button
                  type="button"
                  className={`method-tab ${paymentMethod === 'webpay' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('webpay')}
                >
                  🇨🇱 Webpay Plus (Transbank)
                </button>
              </div>

              {checkoutError && <div className="checkout-error-banner">{checkoutError}</div>}

              {paymentMethod === 'card' ? (
                <form onSubmit={handleCardSubmit} className="checkout-card-form">
                  <div className="form-field">
                    <label>Nombre del Titular</label>
                    <input
                      type="text"
                      placeholder="Ej. Luis Pérez"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Número de Tarjeta</label>
                    <input
                      type="text"
                      placeholder="XXXX XXXX XXXX XXXX"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      maxLength={16}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>Vencimiento (MM/AA)</label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        maxLength={5}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label>CVV / CVC</label>
                      <input
                        type="password"
                        placeholder="123"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="confirm-checkout-btn font-heading" 
                    disabled={checkoutLoading || (selectedTx.isCrossBorder && !acceptCrossBorder)}
                  >
                    {checkoutLoading ? 'Procesando Hold...' : `Retener $${selectedTx.feeAmount.toLocaleString()} CLP 🔒`}
                  </button>
                </form>
              ) : (
                <div className="checkout-webpay-box">
                  <p>Serás redirigido de forma segura a Transbank Webpay Plus para autorizar la retención.</p>
                  <button
                    type="button"
                    className="confirm-checkout-btn webpay-btn font-heading"
                    onClick={handleWebpayStart}
                    disabled={checkoutLoading || (selectedTx.isCrossBorder && !acceptCrossBorder)}
                  >
                    {checkoutLoading ? 'Iniciando Webpay...' : 'Pagar con Webpay Plus Diferido 🇨🇱'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Renderizar el listado general de matches
  return (
    <div className="transactions-page-container">
      <div className="transactions-header">
        <h1>Tus Matches y Transacciones</h1>
        <p>Aquí puedes monitorear tus propuestas activas, realizar holds de fee y revisar la logística.</p>
      </div>

      {checkoutLoading && (
        <div className="checkout-global-loading">
          <div className="loader"></div>
          <p>Confirmando transacción en el servidor...</p>
        </div>
      )}

      {loading ? (
        <div className="transactions-loading">Cargando transacciones activas...</div>
      ) : error ? (
        <div className="transactions-error">{error}</div>
      ) : matches.length === 0 ? (
        <div className="transactions-empty-state">
          <span className="empty-icon">🤝</span>
          <h3>Aún no tienes ningún Match</h3>
          <p>Sigue deslizando en la pantalla de exploración. Cuando a ti y a otro usuario les interese el libro del otro, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="matches-list-grid">
          {matches.map((tx) => (
            <div key={tx.id} className="match-card">
              <div className="match-card-body">
                <div className="match-card-img-box">
                  {tx.bookImageUrl ? (
                    <img src={tx.bookImageUrl} alt={tx.bookTitle} />
                  ) : (
                    <span>📖</span>
                  )}
                </div>

                <div className="match-card-details">
                  <span className="match-card-date">Fecha: {new Date(tx.createdAt).toLocaleDateString()}</span>
                  <h3>{tx.bookTitle}</h3>
                  <p className="author-p">Autor: {tx.bookAuthor}</p>
                  <p className="owner-p">Dueño: <strong>{tx.ownerName}</strong></p>
                  
                  <div className="match-card-badges">
                    {tx.paymentStatus === 'Pending' ? (
                      <span className="badge-pending">Pago Pendiente ⏳</span>
                    ) : tx.paymentStatus === 'Hold' ? (
                      <span className="badge-hold">Pago Retenido (Hold) 🔒</span>
                    ) : tx.paymentStatus === 'Captured' ? (
                      <span className="badge-captured">Pago Procesado 💳</span>
                    ) : (
                      <span className="badge-failed">Pago Fallido ❌</span>
                    )}

                    <span className={`badge-logistics ${tx.logisticsStatus.toLowerCase()}`}>
                      Logística: {tx.logisticsStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="match-card-actions">
                <div className="fee-amount-display">
                  <span>Fee de Intercambio:</span>
                  <strong>${tx.feeAmount.toLocaleString()} CLP</strong>
                </div>

                {tx.paymentStatus === 'Pending' && (
                  <button
                    className="pay-fee-btn font-heading"
                    onClick={() => setSearchParams({ checkout: tx.id })}
                  >
                    Pagar Fee 💳
                  </button>
                )}

                {tx.paymentStatus === 'Failed' && (
                  <button
                    className="pay-fee-btn retry-btn font-heading"
                    onClick={() => setSearchParams({ checkout: tx.id })}
                  >
                    Reintentar Pago 🔄
                  </button>
                )}

                {tx.paymentStatus === 'Hold' && (
                  <span className="hold-active-info">Coordinando Despacho 📦</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
