import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { getFileUrl } from '../../lib/formatters';
import { MatchDetailModal } from './components/MatchDetailModal';
import { formatDateInUserTimezone } from '../../lib/dateUtils';
import { useAuthStore } from '../authentication/store/authStore';

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
  logisticsMethod: string | null;
  isCrossBorder: boolean;
  isAvailable?: boolean;
  isInternalStock?: boolean;
  createdAt: string;
}

interface MyOfferedBook {
  id: string;
  title: string;
  author: string;
  condition: string;
  description: string;
  imageUrl: string;
  isDoubleExchangeCommitment?: boolean;
  doubleExchangeCommitmentUntil?: string;
  exchangeStatus?: string;
}

interface ExchangeQuota {
  exchangesConsumed: number;
  monthlyLimit: number;
  limitReached: boolean;
  donationsConsumed?: number;
  monthlyDonationLimit?: number;
  donationLimitReached?: boolean;
  doubleExchangesConsumed?: number;
  monthlyDoubleExchangeLimit?: number;
  doubleExchangeLimitReached?: boolean;
  enableDoubleExchange?: boolean;
  isPremium: boolean;
  planName: string;
  cycleStartDate: string;
  cycleEndDate: string;
}

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutId = searchParams.get('checkout');
  const webpayTokenWs = searchParams.get('token_ws');
  const webpayTbkToken = searchParams.get('TBK_TOKEN') || searchParams.get('tbk_token');
  const webpayTbkOrden = searchParams.get('TBK_ORDEN_COMPRA') || searchParams.get('tbk_orden_compra');

  // Estado general de transacciones y cuota mensual
  const [matches, setMatches] = useState<MatchTransaction[]>([]);
  const [quota, setQuota] = useState<ExchangeQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inventario propio para intercambio
  const [myOfferedBooks, setMyOfferedBooks] = useState<MyOfferedBook[]>([]);
  const [selectedOfferedBookId, setSelectedOfferedBookId] = useState<string>('');
  const [hasOfferedBooks, setHasOfferedBooks] = useState<boolean>(true);

  // Stepper del Checkout (Pasos 1, 2, 3)
  const [activeStep, setActiveStep] = useState<number>(1);

  // Estado del Checkout Seleccionado
  const [selectedTx, setSelectedTx] = useState<MatchTransaction | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [acceptCrossBorder, setAcceptCrossBorder] = useState(false);

  // Selección Logística de la Pantalla 11 (Radio Cards)
  const [selectedMethod, setSelectedMethod] = useState<'Donacion' | 'Presencial' | 'Envio' | 'IntercambioDoble'>('Presencial');
  // const [trackingNumber, setTrackingNumber] = useState<string>('');
  // const [evidencePhoto, setEvidencePhoto] = useState<string>('');

  // Redirección de Webpay
  const [webpayRedirecting, setWebpayRedirecting] = useState(false);

  // Cargar lista de matches e inventario de usuario
  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<MatchTransaction[]>('/transactions/my-matches');
      setMatches(data);

      try {
        const quotaData = await apiClient.get<ExchangeQuota>('/transactions/exchange-quota');
        setQuota(quotaData);
      } catch (qErr) {
        console.warn('No se pudo cargar la cuota de intercambios:', qErr);
      }

      const myBooks = await apiClient.get<MyOfferedBook[]>('/books/my-inventory');
      setMyOfferedBooks(myBooks);
      setHasOfferedBooks(myBooks.length > 0);
      if (myBooks.length > 0 && !selectedOfferedBookId) {
        setSelectedOfferedBookId(myBooks[0].id);
      }
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

  useEffect(() => {
    if (checkoutId && matches.length > 0) {
      const tx = matches.find((m) => m.id === checkoutId);
      if (tx) {
        setSelectedTx(tx);
        setCheckoutSuccess(false);
        setCheckoutError(null);
        setAcceptCrossBorder(false);
        setActiveStep(1);
      } else {
        setSelectedTx(null);
      }
    } else {
      setSelectedTx(null);
    }
  }, [checkoutId, matches]);

  // Modal de Detalle de Intercambio y Thank You Page
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailTx, setSelectedDetailTx] = useState<MatchTransaction | null>(null);
  const [isThankYouMode, setIsThankYouMode] = useState(false);

  // Manejar el retorno de Webpay Plus
  const processedWebpayTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (webpayTokenWs && processedWebpayTokenRef.current !== webpayTokenWs) {
      processedWebpayTokenRef.current = webpayTokenWs;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('token_ws');
        return next;
      }, { replace: true });

      const confirmWebpay = async () => {
        setCheckoutLoading(true);
        setCheckoutError(null);
        try {
          const response = await apiClient.post<any>(`/transactions/webpay-confirm?token_ws=${encodeURIComponent(webpayTokenWs)}`);
          if (response.success) {
            setCheckoutSuccess(true);
            const updatedList = await apiClient.get<MatchTransaction[]>('/transactions/my-matches');
            setMatches(updatedList);

            try {
              const quotaData = await apiClient.get<ExchangeQuota>('/transactions/exchange-quota');
              setQuota(quotaData);
            } catch {}

            // Abrir automáticamente Thank You Page con el detalle completo
            if (updatedList.length > 0) {
              const matchedTx = updatedList.find(m => m.id === selectedTx?.id || m.paymentStatus === 'Captured' || m.paymentStatus === 'Hold') || updatedList[0];
              setSelectedDetailTx(matchedTx);
              setIsThankYouMode(true);
              setDetailModalOpen(true);
            }
          } else {
            setCheckoutError(response.message || 'La confirmación del pago en Webpay falló.');
          }
        } catch (err: any) {
          console.error('Error confirming Webpay:', err);
          setCheckoutError('Error al conectar con el servidor para confirmar Webpay.');
        } finally {
          setCheckoutLoading(false);
          setSearchParams({});
        }
      };
      confirmWebpay();
    }
  }, [webpayTokenWs]);

  const processedWebpayCancelRef = useRef<string | null>(null);

  useEffect(() => {
    const cancelKey = webpayTbkToken || webpayTbkOrden;
    if (cancelKey && processedWebpayCancelRef.current !== cancelKey) {
      processedWebpayCancelRef.current = cancelKey;
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('TBK_TOKEN');
        next.delete('tbk_token');
        next.delete('TBK_ORDEN_COMPRA');
        next.delete('tbk_orden_compra');
        return next;
      }, { replace: true });

      const cancelWebpay = async () => {
        setCheckoutLoading(true);
        try {
          await apiClient.post<any>(`/transactions/webpay-cancel?tbk_token=${encodeURIComponent(webpayTbkToken || '')}&buy_order=${encodeURIComponent(webpayTbkOrden || '')}`);
          const updatedList = await apiClient.get<MatchTransaction[]>('/transactions/my-matches');
          setMatches(updatedList);
          setCheckoutError('Has cancelado el proceso de pago en Webpay Plus. El libro ha sido liberado.');
        } catch (err: any) {
          console.error('Error reporting Webpay cancellation:', err);
        } finally {
          setCheckoutLoading(false);
          setSearchParams({});
        }
      };
      cancelWebpay();
    }
  }, [webpayTbkToken, webpayTbkOrden]);

  // Iniciar Webpay
  const handleWebpayStart = async () => {
    if (!selectedTx) return;

    if (!hasOfferedBooks) {
      setCheckoutError('Debes haber cargado al menos un libro en tu libreta para ofrecer a cambio.');
      return;
    }

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
        acceptCrossBorder: acceptCrossBorder,
        offeredBookId: selectedOfferedBookId,
        logisticsMethod: selectedMethod
      };

      const response = await apiClient.post<any>('/transactions/webpay-start', payload);

      if (response.success && response.token) {
        setWebpayRedirecting(true);

        const redirectUrl = response.redirectUrl || response.url;
        if (redirectUrl && !redirectUrl.includes('mock.cl')) {
          // Redirección oficial al portal de Transbank Webpay Plus
          const form = document.createElement('form');
          form.action = redirectUrl;
          form.method = 'POST';

          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'token_ws';
          input.value = response.token;
          form.appendChild(input);

          document.body.appendChild(form);
          form.submit();
          return;
        }

        // Simulación para ambiente de desarrollo sin credenciales reales
        setTimeout(() => {
          setWebpayRedirecting(false);
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

  /*
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  */

  const currentOfferedBook = myOfferedBooks.find((b) => b.id === selectedOfferedBookId) || myOfferedBooks[0];

  // RENDER: VISTA DE CHECKOUT EXPERT (PANTALLAS 4, 5 Y 11)
  if (selectedTx) {
    return (
      <div className="checkout-view-container">
        {/* Encabezado con Botón de Regreso */}
        <div className="checkout-header">
          <button className="back-to-matches-btn" onClick={() => setSearchParams({})}>
            ← Volver a mis matches
          </button>
          <h2>Proceso de Intercambio & Checkout</h2>
          <p>Confirma los libros del trueque, la opción de logística y el pago seguro de tarifa por Transbank.</p>
        </div>

        {/* Stepper Wizard UX Senior */}
        <div className="checkout-stepper">
          <div className="stepper-progress-bar" style={{ width: activeStep === 1 ? '0%' : activeStep === 2 ? '50%' : '100%' }}></div>
          
          <div className={`step-node ${activeStep >= 1 ? 'active' : ''} ${activeStep > 1 ? 'completed' : ''}`} onClick={() => setActiveStep(1)}>
            <div className="step-circle">{activeStep > 1 ? '✓' : '1'}</div>
            <span className="step-label font-heading">Confirmar Libros</span>
          </div>

          <div className={`step-node ${activeStep >= 2 ? 'active' : ''} ${activeStep > 2 ? 'completed' : ''}`} onClick={() => hasOfferedBooks && setActiveStep(2)}>
            <div className="step-circle">{activeStep > 2 ? '✓' : '2'}</div>
            <span className="step-label font-heading">Opción de Entrega</span>
          </div>

          <div className={`step-node ${activeStep === 3 ? 'active' : ''}`} onClick={() => hasOfferedBooks && setActiveStep(3)}>
            <div className="step-circle">3</div>
            <span className="step-label font-heading">Pago de Fee</span>
          </div>
        </div>

        {webpayRedirecting ? (
          <div className="webpay-redirect-screen">
            <div className="redirect-loader"></div>
            <h3>Conectando de forma segura con Transbank Webpay...</h3>
            <p className="webpay-redirect-msg">Por favor no cierres esta ventana. Se está procesando el pago del fee de intercambio.</p>
          </div>
        ) : checkoutSuccess ? (
          <div className="checkout-success-screen">
            <span className="success-badge-icon"><i className="fa-solid fa-circle-check icon-neon"></i></span>
            <h3>¡Intercambio y Pago Confirmados!</h3>
            <p>El Fee de servicio <strong>(${Math.round(selectedTx.feeAmount).toLocaleString('es-CL')} CLP)</strong> ha sido cobrado exitosamente en tu tarjeta para iniciar la preparación y logística del intercambio.</p>
            
            <div className="checkout-summary-box">
              <div className="summary-row">
                <span>Libro Solicitado:</span>
                <strong>{selectedTx.bookTitle}</strong>
              </div>
              <div className="summary-row">
                <span>Libro a Entregar:</span>
                <strong>{currentOfferedBook?.title || 'Libro cargado en libreta'}</strong>
              </div>
              <div className="summary-row">
                <span>Método de Entrega:</span>
                <span className="badge-hold badge-hold-neon">
                  {selectedMethod === 'IntercambioDoble' ? '🔄 Intercambio Doble (Sin entrega inmediata)' : selectedMethod === 'Donacion' ? 'Donación Comunitaria' : selectedMethod === 'Presencial' ? 'Entrega Presencial Santiago' : 'Envío por Encomienda'}
                </span>
              </div>
              <div className="summary-row">
                <span>Estado de Pago:</span>
                <span className="hold-status-locked" style={{ color: '#0F9D58' }}>PAGO COMPLETADO ✅</span>
              </div>
            </div>

            <button className="done-btn font-heading checkout-done-btn" onClick={() => setSearchParams({})}>
              Ver mis intercambios activos
            </button>
          </div>
        ) : (
          <div>
            {/* PASO 1: DUET SWAP DECK (CONFIRMACIÓN DE LIBROS EN INTERCAMBIO) */}
            {activeStep === 1 && (
              <div>
                <div className="checkout-step-header">
                  <h3 className="checkout-step-title">Paso 1: Confirma los Libros</h3>
                  <p className="checkout-step-subtitle">
                    Verifica el libro que vas a recibir y selecciona cuál de tus libros registrados en *"Tengo para intercambiar"* entregarás a cambio.
                  </p>
                </div>

                {selectedTx.isAvailable === false && (
                  <div className="warning-requirements-box" style={{ borderColor: '#e74c3c', backgroundColor: '#fff5f5', color: '#c0392b', marginBottom: '1rem' }}>
                    <strong><i className="fa-solid fa-triangle-exclamation"></i> Libro No Disponible:</strong> Este libro ya no está disponible para intercambio porque fue tomado o reservado por otro usuario.
                  </div>
                )}

                <div className="duet-swap-deck">
                  {/* Tarjeta 1: Libro Solicitado (Recibes) */}
                  <div className="swap-book-card target-card">
                    <span className="swap-card-tag receive">Libro que recibes</span>
                    <div className="swap-cover-frame">
                      {selectedTx.bookImageUrl ? (
                        <img src={getFileUrl(selectedTx.bookImageUrl)} alt={selectedTx.bookTitle} />
                      ) : (
                        <div className="book-placeholder-icon">📖</div>
                      )}
                    </div>
                    <div className="swap-book-title">{selectedTx.bookTitle}</div>
                    <div className="swap-book-author">Autor: {selectedTx.bookAuthor || 'Desconocido'}</div>
                    <div className="offered-select-wrapper">
                      <span className={`condition-badge ${selectedTx.bookCondition.toLowerCase()}`}>
                        Estado libro: {selectedTx.bookCondition}
                      </span>
                    </div>
                  </div>

                  {/* Centro: Puente de Intercambio Animado */}
                  <div className="swap-bridge-center">
                    <div className="swap-pulse-badge">
                      <i className="fa-solid fa-arrows-rotate"></i>
                    </div>
                  </div>

                  {/* Tarjeta 2: Libro Ofrecido (Entregas) */}
                  <div className="swap-book-card offered-card">
                    <span className="swap-card-tag give">Libro que tú entregas</span>
                    
                    {hasOfferedBooks ? (
                      <div>
                        {(() => {
                          const isInternalBook = selectedTx.isInternalStock === true || (selectedTx.ownerUserId === null && selectedTx.isInternalStock !== false);
                          const isCurrentOfferedBlocked = isInternalBook && !!currentOfferedBook?.isDoubleExchangeCommitment && !!currentOfferedBook?.doubleExchangeCommitmentUntil && new Date(currentOfferedBook.doubleExchangeCommitmentUntil) > new Date();

                          return (
                            <>
                              <div className="offered-select-wrapper">
                                <select 
                                  value={selectedOfferedBookId} 
                                  onChange={(e) => setSelectedOfferedBookId(e.target.value)}
                                  className="offered-book-select"
                                >
                                  {myOfferedBooks.map((b) => {
                                    const isBlocked = isInternalBook && !!b.isDoubleExchangeCommitment && !!b.doubleExchangeCommitmentUntil && new Date(b.doubleExchangeCommitmentUntil) > new Date();
                                    return (
                                      <option key={b.id} value={b.id} disabled={isBlocked}>
                                        {b.title} - {b.author} {isBlocked ? '🔒 (Bloqueado: Solo P2P)' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {isCurrentOfferedBlocked && (
                                <div style={{ marginTop: '0.6rem', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', fontSize: '12px', color: '#b91c1c', lineHeight: '1.4' }}>
                                  <i className="fa-solid fa-lock" style={{ marginRight: '6px', color: '#ef4444' }}></i>
                                  <strong>Libro bajo compromiso de Intercambio Doble:</strong> Este libro está activo por 6 meses (hasta el {new Date(currentOfferedBook.doubleExchangeCommitmentUntil!).toLocaleDateString('es-CL')}) y solo puede intercambiarse entre usuarios particulares, no con el stock de Intercambialibros. Por favor selecciona otro libro de tu libreta.
                                </div>
                              )}

                              {currentOfferedBook && (
                                <div>
                                  <div className="swap-cover-frame">
                                    <img 
                                      src={getFileUrl(currentOfferedBook.imageUrl)} 
                                      alt={currentOfferedBook.title}
                                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150'; }} 
                                    />
                                  </div>
                                  <div className="swap-book-title">{currentOfferedBook.title}</div>
                                  <div className="swap-book-author">Autor: {currentOfferedBook.author || 'Desconocido'}</div>
                                  <div className="offered-select-wrapper">
                                    <span className={`condition-badge ${(currentOfferedBook.condition || 'Excelente').toLowerCase()}`}>
                                      Estado libro: {currentOfferedBook.condition || 'Excelente'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="no-offered-warning-box">
                        <div className="no-offered-warning-text">
                          <i className="fa-solid fa-circle-exclamation"></i> No tienes ningún libro disponible para intercambiar en tu libreta.
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/libreta')}
                          className="btn-green-pill"
                        >
                          ＋ Cargar un libro en Tu Libreta
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {(() => {
                  const isInternalBook = selectedTx.isInternalStock === true || (selectedTx.ownerUserId === null && selectedTx.isInternalStock !== false);
                  const isCurrentOfferedBlocked = isInternalBook && !!currentOfferedBook?.isDoubleExchangeCommitment && !!currentOfferedBook?.doubleExchangeCommitmentUntil && new Date(currentOfferedBook.doubleExchangeCommitmentUntil) > new Date();
                  const canContinue = hasOfferedBooks && !isCurrentOfferedBlocked;

                  return (
                    <div className="btn-right-align">
                      <button
                        type="button"
                        className={`font-heading btn-step-continue ${canContinue ? 'enabled' : 'disabled'}`}
                        onClick={() => setActiveStep(2)}
                        disabled={!canContinue}
                      >
                        Continuar al Paso 2: Logística de Entrega →
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* PASO 2: RADIO CARDS DE LOGÍSTICA (PANTALLA 11) */}
            {activeStep === 2 && (
              <div>
                <div className="checkout-step-header">
                  <h3 className="checkout-step-title">Paso 2: Elige la Opción de Entrega para tu Libro</h3>
                  <p className="checkout-step-subtitle">
                    Selecciona cómo harás llegar tu libro físico para completar el intercambio cultural y ecológico.
                  </p>
                </div>

                <div className="logistics-radio-grid">
                  {/* Opción 1: Donación Comunitaria */}
                  {(() => {
                    const isPremium = user?.isPremium ?? quota?.isPremium ?? false;
                    const isInternalBook = selectedTx.isInternalStock === true || (selectedTx.ownerUserId === null && selectedTx.isInternalStock !== false);
                    const isLimitReached = quota?.donationLimitReached === true;
                    const donationsLeft = Math.max(0, 2 - (quota?.donationsConsumed ?? 0));
                    const isDonationDisabled = !isPremium || !isInternalBook || isLimitReached;

                    return (
                      <div 
                        className={`logistics-radio-card ${selectedMethod === 'Donacion' ? 'selected' : ''} ${isDonationDisabled ? 'disabled' : ''}`}
                        onClick={() => {
                          if (isDonationDisabled) return;
                          setSelectedMethod('Donacion');
                        }}
                        style={isDonationDisabled ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
                      >
                        <div className="radio-indicator"></div>
                        <div className="radio-card-content">
                          <div className="radio-card-header">
                            <span className="radio-card-title">
                              <i className="fa-solid fa-gift"></i> 1. Donación Comunitaria
                            </span>
                            {!isPremium ? (
                              <span className="radio-card-badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#B45309', border: '1px solid rgba(245, 158, 11, 0.35)', fontWeight: 700 }}>
                                <i className="fa-solid fa-crown" style={{ color: '#D97706', marginRight: '4px' }}></i> Exclusivo Premium
                              </span>
                            ) : !isInternalBook ? (
                              <span className="radio-card-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600 }}>
                                <i className="fa-solid fa-database" style={{ marginRight: '4px' }}></i> Solo Stock Intercambialibros
                              </span>
                            ) : isLimitReached ? (
                              <span className="radio-card-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600 }}>
                                <i className="fa-solid fa-ban" style={{ marginRight: '4px' }}></i> Límite Mensual Alcanzado (2/2)
                              </span>
                            ) : (
                              <span className="radio-card-badge badge-validation" style={{ background: 'rgba(15, 157, 88, 0.12)', color: '#0F9D58', border: '1px solid rgba(15, 157, 88, 0.35)', fontWeight: 700 }}>
                                <i className="fa-solid fa-circle-check" style={{ marginRight: '4px', color: '#0F9D58' }}></i> {donationsLeft} de 2 disponibles este mes
                              </span>
                            )}
                          </div>

                          <p className="radio-card-desc">
                            Dona tu libro físico en un colegio o espacio comunitario. Tras confirmar el pago del fee, podrás subir la fotografía de evidencia en el detalle del intercambio para su validación previa.
                          </p>

                          {!isPremium && (
                            <div style={{ marginTop: '0.6rem', padding: '8px 12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px' }}>
                              <span style={{ color: '#92400E', fontWeight: 500 }}>
                                <i className="fa-solid fa-lock" style={{ marginRight: '6px', color: '#D97706' }}></i>
                                Disponible solo para miembros con <strong>Plan Premium</strong> (hasta 2 donaciones/mes).
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/planes');
                                }}
                                style={{ background: '#D97706', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                <i className="fa-solid fa-crown" style={{ marginRight: '4px' }}></i> Ver Planes
                              </button>
                            </div>
                          )}

                          {isPremium && !isInternalBook && (
                            <div style={{ marginTop: '0.6rem', padding: '8px 12px', background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: '8px', fontSize: '12px', color: '#0369a1' }}>
                              <i className="fa-solid fa-circle-info" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                              La opción de donación solo aplica cuando el libro solicitado proviene del catálogo oficial de <strong>Intercambialibros</strong> (no aplica para intercambios directos entre usuarios).
                            </div>
                          )}

                          {isPremium && isInternalBook && isLimitReached && (
                            <div style={{ marginTop: '0.6rem', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', fontSize: '12px', color: '#b91c1c' }}>
                              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                              Has alcanzado tu cuota de <strong>2 donaciones este mes</strong>. Podrás volver a donar al inicio de tu próximo ciclo de facturación.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Opción 2: Entrega Presencial Santiago Chile */}
                  <div 
                    className={`logistics-radio-card ${selectedMethod === 'Presencial' ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod('Presencial')}
                  >
                    <div className="radio-indicator"></div>
                    <div className="radio-card-content">
                      <div className="radio-card-header">
                        <span className="radio-card-title">
                          <i className="fa-solid fa-store"></i> 2. Entrega y Recibe en Local Físico
                        </span>
                        <span className="radio-card-badge badge-free">Sin costo extra</span>
                      </div>
                      <p className="radio-card-desc">
                        Lleva tu libro directamente a nuestro local en <strong>Patronato 447, Recoleta, Santiago, Chile</strong>. Sin recargos ni tiempos de espera de encomiendas.
                      </p>
                    </div>
                  </div>

                  {/* Opción 3: Envío por Encomienda Santiago Chile */}
                  <div 
                    className={`logistics-radio-card ${selectedMethod === 'Envio' ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod('Envio')}
                  >
                    <div className="radio-indicator"></div>
                    <div className="radio-card-content">
                      <div className="radio-card-header">
                        <span className="radio-card-title">
                          <i className="fa-solid fa-truck-fast"></i> 3. Envío por Encomienda a Local Físico
                        </span>
                        <span className="radio-card-badge badge-courier">Pagas envío del libro que envías y del libro que recibes</span>
                      </div>
                      <p className="radio-card-desc">
                        Envía tu libro a la dirección física de Intercambialibros en <strong>Patronato 447, Recoleta, Santiago, Chile</strong> vía Starken o Chilexpress. Podrás subir tu comprobante de envío o voucher una vez realizado el pago*.
                        <br/><br/>
                        <i>*El libro que despachas como el que recibes, lo paga el usuario.</i>
                      </p>
                    </div>
                  </div>

                  {/* Opción 4: Intercambio Doble (Exclusivo Premium) */}
                  {(() => {
                    const isPremium = user?.isPremium ?? quota?.isPremium ?? false;
                    const isInternalBook = selectedTx.isInternalStock === true || (selectedTx.ownerUserId === null && selectedTx.isInternalStock !== false);
                    const isDoubleEnabled = quota?.enableDoubleExchange !== false;
                    const isDoubleLimitReached = (quota?.doubleExchangeLimitReached === true) || ((quota?.doubleExchangesConsumed ?? 0) >= (quota?.monthlyDoubleExchangeLimit ?? 2));
                    const doubleExchangesLeft = Math.max(0, (quota?.monthlyDoubleExchangeLimit ?? 2) - (quota?.doubleExchangesConsumed ?? 0));
                    const isDoubleDisabled = !isDoubleEnabled || !isPremium || !isInternalBook || isDoubleLimitReached;

                    if (!isDoubleEnabled) return null;

                    return (
                      <div 
                        className={`logistics-radio-card ${selectedMethod === 'IntercambioDoble' ? 'selected' : ''} ${isDoubleDisabled ? 'disabled' : ''}`}
                        onClick={() => {
                          if (isDoubleDisabled) return;
                          setSelectedMethod('IntercambioDoble');
                        }}
                        style={isDoubleDisabled ? { opacity: 0.65, cursor: 'not-allowed' } : {}}
                      >
                        <div className="radio-indicator"></div>
                        <div className="radio-card-content">
                          <div className="radio-card-header">
                            <span className="radio-card-title">
                              <i className="fa-solid fa-repeat"></i> 4. Intercambio Doble
                            </span>
                            {!isPremium ? (
                              <span className="radio-card-badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#B45309', border: '1px solid rgba(245, 158, 11, 0.35)', fontWeight: 700 }}>
                                <i className="fa-solid fa-crown" style={{ color: '#D97706', marginRight: '4px' }}></i> Exclusivo Premium
                              </span>
                            ) : !isInternalBook ? (
                              <span className="radio-card-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600 }}>
                                <i className="fa-solid fa-database" style={{ marginRight: '4px' }}></i> Solo Stock Intercambialibros
                              </span>
                            ) : isDoubleLimitReached ? (
                              <span className="radio-card-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600 }}>
                                <i className="fa-solid fa-ban" style={{ marginRight: '4px' }}></i> Límite Mensual Alcanzado (2/2)
                              </span>
                            ) : (
                              <span className="radio-card-badge badge-validation" style={{ background: 'rgba(15, 157, 88, 0.12)', color: '#0F9D58', border: '1px solid rgba(15, 157, 88, 0.35)', fontWeight: 700 }}>
                                <i className="fa-solid fa-sparkles" style={{ marginRight: '4px', color: '#0F9D58' }}></i> {doubleExchangesLeft} de 2 disponibles este mes
                              </span>
                            )}
                          </div>

                          <p className="radio-card-desc">
                            Recibe el libro solicitado de Intercambialibros y <strong>no entregues el tuyo en este momento</strong>. Tu ejemplar quedará publicado por un mínimo de <strong>6 meses</strong> en la plataforma para ser intercambiado exclusivamente con otro usuario de la comunidad (en ese segundo intercambio sí entregarás el ejemplar físico).
                          </p>

                          {!isPremium && (
                            <div style={{ marginTop: '0.6rem', padding: '8px 12px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px' }}>
                              <span style={{ color: '#92400E', fontWeight: 500 }}>
                                <i className="fa-solid fa-lock" style={{ marginRight: '6px', color: '#D97706' }}></i>
                                Beneficio por tiempo limitado exclusivo para miembros con <strong>Plan Premium</strong> (hasta 2 al mes).
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/planes');
                                }}
                                style={{ background: '#D97706', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                <i className="fa-solid fa-crown" style={{ marginRight: '4px' }}></i> Ver Planes
                              </button>
                            </div>
                          )}

                          {isPremium && !isInternalBook && (
                            <div style={{ marginTop: '0.6rem', padding: '8px 12px', background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.25)', borderRadius: '8px', fontSize: '12px', color: '#0369a1' }}>
                              <i className="fa-solid fa-circle-info" style={{ color: '#0284c7', marginRight: '6px' }}></i>
                              El Intercambio Doble solo aplica cuando solicitas un libro del catálogo oficial de <strong>Intercambialibros</strong> (no aplica entre usuarios particulares).
                            </div>
                          )}

                          {isPremium && isInternalBook && isDoubleLimitReached && (
                            <div style={{ marginTop: '0.6rem', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', fontSize: '12px', color: '#b91c1c' }}>
                              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                              Has alcanzado tu cuota de <strong>2 intercambios dobles este mes</strong>. Podrás volver a utilizar esta opción en tu próximo ciclo mensual.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="step-actions-row">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="btn-back-step"
                  >
                    ← Volver al Paso 1
                  </button>

                  <button
                    type="button"
                    className="font-heading btn-next-step"
                    onClick={() => {
                      const isPremium = user?.isPremium ?? quota?.isPremium ?? false;
                      const isInternalBook = selectedTx.isInternalStock === true || (selectedTx.ownerUserId === null && selectedTx.isInternalStock !== false);
                      const isLimitReached = quota?.donationLimitReached === true;
                      const isDoubleEnabled = quota?.enableDoubleExchange !== false;
                      const isDoubleLimitReached = (quota?.doubleExchangeLimitReached === true) || ((quota?.doubleExchangesConsumed ?? 0) >= (quota?.monthlyDoubleExchangeLimit ?? 2));
                      const isDoubleDisabled = !isDoubleEnabled || !isPremium || !isInternalBook || isDoubleLimitReached;

                      if (selectedMethod === 'Donacion' && (!isPremium || !isInternalBook || isLimitReached)) {
                        setSelectedMethod('Presencial');
                      }
                      if (selectedMethod === 'IntercambioDoble' && isDoubleDisabled) {
                        setSelectedMethod('Presencial');
                      }
                      setActiveStep(3);
                    }}
                  >
                    Continuar al Paso 3: Pago de Fee →
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: PAGO DE FEE (WEBPAY HOLD & DESGLOSE) */}
            {activeStep === 3 && (
              <div>
                <div className="checkout-step-header">
                  <h3 className="checkout-step-title">Paso 3: Pago Seguro del Fee de Intercambio</h3>
                </div>

                <div className="fee-step-grid">
                  <div className="fee-summary-card">
                    <h4 className="fee-card-title">Resumen del Acuerdo de Intercambio</h4>
                    
                    <div className="fee-card-list">
                      <div className="summary-row">
                        <span>Libro a recibir:</span>
                        <strong>{selectedTx.bookTitle}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Libro a entregar:</span>
                        <strong>{currentOfferedBook?.title || 'Libro propio'}</strong>
                      </div>
                      <div className="summary-row">
                        <span>Opción de Entrega:</span>
                        <strong className="icon-neon">
                          {selectedMethod === 'IntercambioDoble' ? '🔄 Intercambio Doble' : selectedMethod === 'Donacion' ? '🎁 Donación Comunitaria' : selectedMethod === 'Presencial' ? '🏪 Entrega Presencial Santiago' : '📦 Envío Encomienda'}
                        </strong>
                      </div>
                      
                      <div className="fee-total-row">
                        <span>Tarifa de servicio (Fee):</span>
                        <strong className="fee-total-amount">${Math.round(selectedTx.feeAmount).toLocaleString('es-CL')} CLP</strong>
                      </div>
                    </div>

                    {selectedMethod === 'Donacion' && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '10px 14px',
                        background: 'rgba(182, 255, 0, 0.08)',
                        border: '1px solid rgba(182, 255, 0, 0.3)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.4'
                      }}>
                        <div style={{ fontWeight: 700, color: 'var(--neon)', marginBottom: '4px' }}>
                          <i className="fa-solid fa-gift"></i> Compromiso de Donación Comunitaria:
                        </div>
                        Tras abonar el Fee en Transbank, deberás subir una fotografía del colegio o centro comunitario donde realizaste la donación para su validación previa.
                      </div>
                    )}

                    {selectedMethod === 'IntercambioDoble' && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '10px 14px',
                        background: 'rgba(182, 255, 0, 0.08)',
                        border: '1px solid rgba(182, 255, 0, 0.3)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.4'
                      }}>
                        <div style={{ fontWeight: 700, color: 'var(--neon)', marginBottom: '4px' }}>
                          <i className="fa-solid fa-repeat"></i> Beneficio de Intercambio Doble:
                        </div>
                        Recibirás el libro <strong>{selectedTx.bookTitle}</strong> y no tienes que entregar <strong>{currentOfferedBook?.title || 'tu libro'}</strong> hoy. Tu ejemplar quedará comprometido y publicado en la plataforma por un plazo mínimo de 6 meses para intercambiarse exclusivamente con otro usuario particular (P2P).
                      </div>
                    )}

                    {selectedTx.isCrossBorder && (
                      <div className="cross-border-alert-box">
                        <label className="cross-border-label">
                          <input type="checkbox" checked={acceptCrossBorder} onChange={(e) => setAcceptCrossBorder(e.target.checked)} className="cross-border-checkbox" />
                          <span>Acepto asumir posibles costos adicionales de despacho internacional.</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="webpay-card-container">
                    <img 
                      src="/WebpayPlus_FB.png" 
                      alt="Webpay Plus Transbank" 
                      className="webpay-logo-img"
                    />
                    
                    <p className="webpay-desc-text">
                      Al hacer clic en el botón inferior serás redirigido al servidor seguro de Transbank para realizar el pago de <strong>${Math.round(selectedTx.feeAmount).toLocaleString('es-CL')} CLP</strong>.
                    </p>

                    {quota && (
                      <div style={{
                        padding: '10px 14px',
                        background: quota.limitReached ? '#fff1f2' : '#f0fdf4',
                        border: `1px solid ${quota.limitReached ? '#fca5a5' : '#bbf7d0'}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ color: quota.limitReached ? '#991b1b' : '#166534', fontWeight: 600 }}>
                          <i className={`fa-solid ${quota.limitReached ? 'fa-triangle-exclamation' : 'fa-chart-pie'}`}></i> Cuota mensual: <strong>{quota.exchangesConsumed} / {quota.monthlyLimit}</strong> ({quota.planName})
                        </span>
                        {!quota.isPremium && (
                          <button
                            type="button"
                            onClick={() => navigate('/planes')}
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                          >
                            <i className="fa-solid fa-crown"></i> Subir a 5
                          </button>
                        )}
                      </div>
                    )}

                    {selectedMethod === 'Donacion' && quota?.isPremium && (
                      <div style={{
                        padding: '10px 14px',
                        background: quota.donationLimitReached ? '#fff1f2' : 'rgba(182, 255, 0, 0.08)',
                        border: `1px solid ${quota.donationLimitReached ? '#fca5a5' : 'rgba(182, 255, 0, 0.3)'}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: quota.donationLimitReached ? '#991b1b' : 'var(--neon)',
                        fontWeight: 600
                      }}>
                        <i className="fa-solid fa-gift"></i>
                        <span>
                          Donaciones este mes: <strong>{quota.donationsConsumed || 0} / {quota.monthlyDonationLimit || 2}</strong>
                          {quota.donationLimitReached ? ' (Límite mensual alcanzado)' : ' disponibles'}
                        </span>
                      </div>
                    )}

                    {selectedMethod === 'IntercambioDoble' && quota?.isPremium && (
                      <div style={{
                        padding: '10px 14px',
                        background: quota.doubleExchangeLimitReached ? '#fff1f2' : 'rgba(182, 255, 0, 0.08)',
                        border: `1px solid ${quota.doubleExchangeLimitReached ? '#fca5a5' : 'rgba(182, 255, 0, 0.3)'}`,
                        borderRadius: '8px',
                        fontSize: '12px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: quota.doubleExchangeLimitReached ? '#991b1b' : 'var(--neon)',
                        fontWeight: 600
                      }}>
                        <i className="fa-solid fa-repeat"></i>
                        <span>
                          Intercambios Dobles este mes: <strong>{quota.doubleExchangesConsumed || 0} / {quota.monthlyDoubleExchangeLimit || 2}</strong>
                          {quota.doubleExchangeLimitReached ? ' (Límite mensual alcanzado)' : ' disponibles'}
                        </span>
                      </div>
                    )}

                    {quota?.limitReached && (
                      <div className="webpay-error-text" style={{ marginBottom: '12px', textAlign: 'left' }}>
                        ⚠️ Has alcanzado tu límite de {quota.monthlyLimit} intercambios mensuales para tu {quota.planName}.
                        {!quota.isPremium ? ' Actualiza al Plan Premium para obtener hasta 5 intercambios al mes.' : ' Tu cuota se reiniciará al inicio de tu próximo ciclo de facturación.'}
                      </div>
                    )}

                    {checkoutError && <div className="webpay-error-text">{checkoutError}</div>}

                    <button
                      type="button"
                      className="confirm-checkout-btn webpay-btn font-heading webpay-pay-btn"
                      onClick={handleWebpayStart}
                      disabled={checkoutLoading || quota?.limitReached || (selectedTx.isCrossBorder && !acceptCrossBorder)}
                    >
                      {checkoutLoading ? 'Conectando con Webpay...' : <>Pagar Fee</>}
                    </button>

                    {quota?.limitReached && !quota.isPremium && (
                      <button
                        type="button"
                        className="confirm-checkout-btn font-heading"
                        style={{ background: '#e11d48', color: '#fff', marginTop: '10px', width: '100%' }}
                        onClick={() => navigate('/planes')}
                      >
                        <i className="fa-solid fa-crown"></i> Desbloquear 5 Intercambios con Premium
                      </button>
                    )}
                  </div>
                </div>

                <div className="step-back-action-container">
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="btn-back-step"
                  >
                    ← Volver al Paso 2
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // RENDER: LISTADO GENERAL DE MATCHES CON DISEÑO EXPERT
  return (
    <div className="transactions-page-container">
      <div className="transactions-header">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Tus Matches y Transacciones</h1>
            <p>Aquí puedes monitorear tus propuestas activas, realizar el pago de fee y revisar la logística.</p>
          </div>
          {quota && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{
                background: quota.limitReached ? '#fff1f2' : '#f0fdf4',
                border: `1px solid ${quota.limitReached ? '#fca5a5' : '#bbf7d0'}`,
                borderRadius: '24px',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: quota.limitReached ? '#dc2626' : '#166534',
                fontWeight: 600
              }}>
                <span>
                  <i className={`fa-solid ${quota.limitReached ? 'fa-triangle-exclamation' : 'fa-handshake'}`}></i> Cuota mensual: <strong>{quota.exchangesConsumed} / {quota.monthlyLimit}</strong> ({quota.planName})
                </span>
                {!quota.isPremium && (
                  <button
                    type="button"
                    onClick={() => navigate('/planes')}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 700
                    }}
                  >
                    <i className="fa-solid fa-crown"></i> Subir a 5
                  </button>
                )}
              </div>

              {quota.isPremium && (
                <div style={{
                  background: quota.donationLimitReached ? '#fff1f2' : 'rgba(182, 255, 0, 0.1)',
                  border: `1px solid ${quota.donationLimitReached ? '#fca5a5' : 'rgba(182, 255, 0, 0.4)'}`,
                  borderRadius: '24px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: quota.donationLimitReached ? '#dc2626' : '#166534',
                  fontWeight: 600
                }}>
                  <i className="fa-solid fa-gift" style={{ color: quota.donationLimitReached ? '#dc2626' : 'var(--neon)' }}></i>
                  <span>Donaciones: <strong>{quota.donationsConsumed || 0} / {quota.monthlyDonationLimit || 2}</strong> este mes</span>
                </div>
              )}

              {quota.isPremium && quota.enableDoubleExchange !== false && (
                <div style={{
                  background: quota.doubleExchangeLimitReached ? '#fff1f2' : 'rgba(182, 255, 0, 0.1)',
                  border: `1px solid ${quota.doubleExchangeLimitReached ? '#fca5a5' : 'rgba(182, 255, 0, 0.4)'}`,
                  borderRadius: '24px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: quota.doubleExchangeLimitReached ? '#dc2626' : '#166534',
                  fontWeight: 600
                }}>
                  <i className="fa-solid fa-repeat" style={{ color: quota.doubleExchangeLimitReached ? '#dc2626' : 'var(--neon)' }}></i>
                  <span>Dobles: <strong>{quota.doubleExchangesConsumed || 0} / {quota.monthlyDoubleExchangeLimit || 2}</strong> este mes</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {quota?.limitReached && (
        <div className="no-offered-alert-green" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#991b1b', marginBottom: '1.5rem' }}>
          <div>
            <strong className="alert-title" style={{ color: '#991b1b' }}>
              <i className="fa-solid fa-circle-exclamation"></i> Límite de intercambios mensuales alcanzado ({quota.exchangesConsumed}/{quota.monthlyLimit})
            </strong>
            <span className="alert-subtitle" style={{ color: '#7f1d1d' }}>
              {quota.isPremium 
                ? `Has completado todos los intercambios permitidos para tu ciclo actual. Tu cupo se renovará el ${new Date(quota.cycleEndDate).toLocaleDateString('es-CL')}.` 
                : `Has alcanzado el tope de 2 intercambios mensuales del Plan Gratuito. Pásate al Plan Premium para acceder a hasta 5 intercambios al mes.`}
            </span>
          </div>
          {!quota.isPremium && (
            <button
              type="button"
              onClick={() => navigate('/planes')}
              className="btn-green-inventory"
              style={{ background: '#e11d48', color: '#fff' }}
            >
              <i className="fa-solid fa-crown"></i> Ver Planes
            </button>
          )}
        </div>
      )}

      {!hasOfferedBooks && matches.length > 0 && (
        <div className="no-offered-alert-green">
          <div>
            <strong className="alert-title">
              <i className="fa-solid fa-triangle-exclamation"></i> Tienes 0 libros cargados en tu libreta para ofrecer
            </strong>
            <span className="alert-subtitle">
              Para poder pagar la tarifa e intercambiar, primero debes agregar al menos un libro en 'Tu Libreta' (Tengo para intercambiar).
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/libreta')}
            className="btn-green-inventory"
          >
            ＋ Ir a Tu Libreta
          </button>
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
                    <img src={getFileUrl(tx.bookImageUrl)} alt={tx.bookTitle} />
                  ) : (
                    <span>📖</span>
                  )}
                </div>

                <div className="match-card-details">
                  <span className="match-card-date">Fecha: {formatDateInUserTimezone(tx.createdAt)}</span>
                  <h3>{tx.bookTitle}</h3>
                  <p className="author-p">Autor: {tx.bookAuthor}</p>
                  <p className="owner-p">Dueño: <strong>{tx.ownerName}</strong></p>
                  
                  <div className="match-card-badges">
                    {tx.isAvailable === false ? (
                      <span className="badge-failed" style={{ backgroundColor: '#e74c3c', color: '#fff' }}>
                        <i className="fa-solid fa-triangle-exclamation"></i> Libro No Disponible
                      </span>
                    ) : !hasOfferedBooks ? (
                      <span className="badge-pending badge-saved-interest">
                        Interés Guardado 💚
                      </span>
                    ) : tx.paymentStatus === 'Pending' ? (
                      <span className="badge-pending">Fee Pendiente ⏳</span>
                    ) : tx.paymentStatus === 'Captured' || tx.paymentStatus === 'Hold' ? (
                      <span className="badge-captured">Fee Pagado ✅</span>
                    ) : (
                      <span className="badge-failed">Pago Fallido ❌</span>
                    )}

                    {hasOfferedBooks && (
                      <span className={`badge-logistics ${tx.logisticsStatus.toLowerCase()}`}>
                        Logística: {tx.logisticsStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="match-card-actions">
                {hasOfferedBooks ? (
                  <div className="fee-amount-display">
                    <span>Fee de Intercambio:</span>
                    <strong>${Math.round(tx.feeAmount).toLocaleString('es-CL')} CLP</strong>
                  </div>
                ) : (
                  <div className="fee-amount-display fee-not-calculated" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '240px', lineHeight: '1.3' }}>
                      Sube un libro a Tu Libreta para calcular la tarifa de fee
                    </span>
                    <button
                      type="button"
                      className="pay-fee-btn font-heading"
                      onClick={() => navigate('/libreta')}
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.8rem' }}
                    >
                      ＋ Cargar mi libro en Tu Libreta
                    </button>
                  </div>
                )}

                {tx.isAvailable === false && tx.paymentStatus === 'Pending' ? (
                  <button
                    className="pay-fee-btn font-heading disabled-btn"
                    disabled
                    style={{ opacity: 0.6, backgroundColor: '#95a5a6', cursor: 'not-allowed' }}
                    title="Este libro ya fue tomado o reservado por otro usuario."
                  >
                    ⚠️ No Disponible
                  </button>
                ) : !hasOfferedBooks ? (
                  null
                ) : tx.paymentStatus === 'Pending' ? (
                  <button
                    className="pay-fee-btn font-heading"
                    onClick={() => setSearchParams({ checkout: tx.id })}
                  >
                    Pagar Fee & Intercambiar 💳
                  </button>
                ) : (
                  <button
                    className="pay-fee-btn font-heading btn-view-details"
                    onClick={() => {
                      setSelectedDetailTx(tx);
                      setIsThankYouMode(false);
                      setDetailModalOpen(true);
                    }}
                  >
                    🔍 Ver detalle e instrucciones
                  </button>
                )}

                {hasOfferedBooks && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDetailTx(tx);
                      setIsThankYouMode(false);
                      setDetailModalOpen(true);
                    }}
                    className="btn-view-proposal-link"
                  >
                    📋 Ver propuesta de libros y fecha límite
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalle Completo e Instrucciones Logísticas / Thank You Page */}
      <MatchDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        transaction={selectedDetailTx ? {
          ...selectedDetailTx,
          offeredBookTitle: myOfferedBooks[0]?.title || 'Tu libro en libreta',
          offeredBookAuthor: myOfferedBooks[0]?.author || 'Tú',
          offeredBookImageUrl: myOfferedBooks[0]?.imageUrl || '',
          offeredBookCondition: myOfferedBooks[0]?.condition || 'Excelente'
        } : null}
        isThankYouPage={isThankYouMode}
        onLogisticsUpdated={loadMatches}
      />
    </div>
  );
};
