import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { MatchDetailModal } from './components/MatchDetailModal';
import { formatDateInUserTimezone } from '../../lib/dateUtils';

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
  createdAt: string;
}

interface MyOfferedBook {
  id: string;
  title: string;
  author: string;
  condition: string;
  description: string;
  imageUrl: string;
}

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutId = searchParams.get('checkout');
  const webpayTokenWs = searchParams.get('token_ws');

  // Estado general de transacciones
  const [matches, setMatches] = useState<MatchTransaction[]>([]);
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
  const [selectedMethod, setSelectedMethod] = useState<'Donacion' | 'Presencial' | 'Envio'>('Presencial');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [evidencePhoto, setEvidencePhoto] = useState<string>('');

  // Redirección de Webpay
  const [webpayRedirecting, setWebpayRedirecting] = useState(false);

  // Cargar lista de matches e inventario de usuario
  const loadMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<MatchTransaction[]>('/transactions/my-matches');
      setMatches(data);

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

  // Manejar el retorno simulado de Webpay Plus
  useEffect(() => {
    if (webpayTokenWs) {
      const confirmWebpay = async () => {
        setCheckoutLoading(true);
        setCheckoutError(null);
        try {
          const response = await apiClient.post<any>(`/transactions/webpay-confirm?token_ws=${webpayTokenWs}`);
          if (response.success) {
            setCheckoutSuccess(true);
            const updatedList = await apiClient.get<MatchTransaction[]>('/transactions/my-matches');
            setMatches(updatedList);

            // Abrir automáticamente Thank You Page con el detalle completo
            if (updatedList.length > 0) {
              const matchedTx = updatedList.find(m => m.id === selectedTx?.id || m.paymentStatus === 'Hold') || updatedList[0];
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
          <p>Confirma los libros del trueque, la opción de logística y el Hold seguro de tarifa por Transbank.</p>
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
            <p style={{marginLeft: "auto", marginRight: "auto", textAlign: "center"}}>Por favor no cierres esta ventana. Se está generando la retención del fee de intercambio.</p>
          </div>
        ) : checkoutSuccess ? (
          <div className="checkout-success-screen">
            <span className="success-badge-icon"><i className="fa-solid fa-circle-check" style={{ color: 'var(--neon)' }}></i></span>
            <h3>¡Intercambio y Pre-autorización Confirmados!</h3>
            <p>Los fondos del Fee de servicio <strong>(${selectedTx.feeAmount.toLocaleString()} CLP)</strong> han sido retenidos en tu tarjeta hasta completar la entrega.</p>
            
            <div className="checkout-summary-box" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', margin: '1.5rem 0' }}>
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Libro Solicitado:</span>
                <strong>{selectedTx.bookTitle}</strong>
              </div>
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Libro a Entregar:</span>
                <strong>{currentOfferedBook?.title || 'Libro cargado en libreta'}</strong>
              </div>
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Método de Entrega:</span>
                <span className="badge-hold" style={{ background: 'rgba(182, 255, 0, 0.1)', color: 'var(--neon)', border: '1px solid var(--neon)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                  {selectedMethod === 'Donacion' ? 'Donación Comunitaria' : selectedMethod === 'Presencial' ? 'Entrega Presencial Santiago' : 'Envío por Encomienda'}
                </span>
              </div>
              <div className="summary-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Estado de Pago:</span>
                <span style={{ color: 'var(--neon)', fontWeight: 700 }}>HOLD RETENIDO 🔒</span>
              </div>
            </div>

            <button className="done-btn font-heading" onClick={() => setSearchParams({})} style={{ background: 'var(--neon)', color: '#000', fontWeight: 800, padding: '0.9rem 2rem', borderRadius: '50px' }}>
              Ver mis intercambios activos
            </button>
          </div>
        ) : (
          <div>
            {/* PASO 1: DUET SWAP DECK (CONFIRMACIÓN DE LIBROS EN INTERCAMBIO) */}
            {activeStep === 1 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ color: 'var(--neon)', fontSize: '1.4rem' }}>Paso 1: Confirma los Libros del Trueque</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: "auto", marginRight: "auto" }}>
                    Verifica el libro que vas a recibir y selecciona cuál de tus libros registrados en *"Tengo para intercambiar"* entregarás a cambio.
                  </p>
                </div>

                <div className="duet-swap-deck">
                  {/* Tarjeta 1: Libro Solicitado (Recibes) */}
                  <div className="swap-book-card target-card">
                    <span className="swap-card-tag receive">Libro que recibes</span>
                    <div className="swap-cover-frame">
                      {selectedTx.bookImageUrl ? (
                        <img src={selectedTx.bookImageUrl} alt={selectedTx.bookTitle} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2rem' }}>📖</div>
                      )}
                    </div>
                    <div className="swap-book-title">{selectedTx.bookTitle}</div>
                    <div className="swap-book-author">por {selectedTx.bookAuthor}</div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span className={`condition-badge ${selectedTx.bookCondition.toLowerCase()}`}>
                        Estado: {selectedTx.bookCondition}
                      </span>
                    </div>
                  </div>

                  {/* Centro: Puente de Intercambio Animado */}
                  <div className="swap-bridge-center">
                    <div className="swap-pulse-badge">
                      <i className="fa-solid fa-arrows-rotate"></i>
                    </div>
                    <span className="swap-match-ratio">IA Match 100% Validado</span>
                  </div>

                  {/* Tarjeta 2: Libro Ofrecido (Entregas) */}
                  <div className="swap-book-card offered-card">
                    <span className="swap-card-tag give">Libro que tú entregas</span>
                    
                    {hasOfferedBooks ? (
                      <div>
                        <div style={{ margin: '0.5rem 0' }}>
                          <select 
                            value={selectedOfferedBookId} 
                            onChange={(e) => setSelectedOfferedBookId(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', background: '#000', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem' }}
                          >
                            {myOfferedBooks.map((b) => (
                              <option key={b.id} value={b.id}>{b.title} - {b.author}</option>
                            ))}
                          </select>
                        </div>

                        {currentOfferedBook && (
                          <div>
                            <div className="swap-cover-frame">
                              <img 
                                src={currentOfferedBook.imageUrl} 
                                alt={currentOfferedBook.title}
                                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150'; }} 
                              />
                            </div>
                            <div className="swap-book-title">{currentOfferedBook.title}</div>
                            <div className="swap-book-author">por {currentOfferedBook.author}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '1rem 0' }}>
                        <div style={{ color: '#ffb703', fontSize: '0.85rem', marginBottom: '1rem' }}>
                          <i className="fa-solid fa-circle-exclamation"></i> No tienes ningún libro disponible para intercambiar en tu libreta.
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/libreta')}
                          style={{ background: '#0F9D58', color: '#FFFFFF', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '50px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          ＋ Cargar un libro en Tu Libreta
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="font-heading"
                    onClick={() => setActiveStep(2)}
                    disabled={!hasOfferedBooks}
                    style={{
                      background: hasOfferedBooks ? 'var(--neon)' : '#333',
                      color: hasOfferedBooks ? '#000' : '#888',
                      border: 'none',
                      padding: '0.9rem 2rem',
                      borderRadius: '50px',
                      fontWeight: 800,
                      cursor: hasOfferedBooks ? 'pointer' : 'not-allowed',
                      fontSize: '1rem'
                    }}
                  >
                    Continuar al Paso 2: Logística de Entrega →
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: RADIO CARDS DE LOGÍSTICA (PANTALLA 11) */}
            {activeStep === 2 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ color: 'var(--neon)', fontSize: '1.4rem' }}>Paso 2: Elige la Opción de Entrega para tu Libro</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginLeft: "auto", marginRight: "auto"}}>
                    Selecciona cómo harás llegar tu libro físico para completar el intercambio cultural y ecológico.
                  </p>
                </div>

                <div className="logistics-radio-grid">
                  {/* Opción 1: Donación Comunitaria */}
                  <div 
                    className={`logistics-radio-card ${selectedMethod === 'Donacion' ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod('Donacion')}
                  >
                    <div className="radio-indicator"></div>
                    <div className="radio-card-content">
                      <div className="radio-card-header">
                        <span className="radio-card-title">
                          <i className="fa-solid fa-heart"></i> 1. Donación Comunitaria
                        </span>
                        <span className="radio-card-badge badge-validation">Validación Previa por IA/Equipo</span>
                      </div>
                      <p className="radio-card-desc">
                        Dona tu libro físico en un colegio o espacio comunitario. Carga la foto de evidencia que pasará por un proceso de verificación previa antes de enviar el libro escogido.
                      </p>

                      {selectedMethod === 'Donacion' && (
                        <div className="radio-card-expand">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Subir Fotografía de Evidencia de Donación:
                          </label>
                          <div className="dropzone-upload-box">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handlePhotoChange}
                              style={{ display: 'none' }} 
                              id="evidence-file-input"
                            />
                            <label htmlFor="evidence-file-input" style={{ cursor: 'pointer', display: 'block' }}>
                              {evidencePhoto ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                                  <img src={evidencePhoto} alt="Evidencia" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                                  <span style={{ color: 'var(--neon)', fontWeight: 700, fontSize: '0.85rem' }}>
                                    ✓ Fotografía cargada para revisión previa
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <i className="fa-solid fa-camera" style={{ fontSize: '1.5rem', color: 'var(--neon)', marginBottom: '0.3rem' }}></i>
                                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>Toca para subir foto del colegio o espacio comunitario</div>
                                </div>
                              )}
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Opción 2: Entrega Presencial Santiago Chile */}
                  <div 
                    className={`logistics-radio-card ${selectedMethod === 'Presencial' ? 'selected' : ''}`}
                    onClick={() => setSelectedMethod('Presencial')}
                  >
                    <div className="radio-indicator"></div>
                    <div className="radio-card-content">
                      <div className="radio-card-header">
                        <span className="radio-card-title">
                          <i className="fa-solid fa-store"></i> 2. Entrega Presencial en Local Físico
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
                        <span className="radio-card-badge badge-courier">Pagas envío + comprobante</span>
                      </div>
                      <p className="radio-card-desc">
                        Envía tu libro a la dirección física de Bookmachs en <strong>Patronato 447, Recoleta, Santiago, Chile</strong> vía Starken o Chilexpress. Debes asumir el costo del envío y subir tu comprobante (n° voucher o foto).
                      </p>

                      {selectedMethod === 'Envio' && (
                        <div className="radio-card-expand">
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                            N° de Comprobante / Tracking Voucher:
                          </label>
                          <input 
                            type="text" 
                            placeholder="Ej. STAR982374982" 
                            value={trackingNumber} 
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem', background: '#000', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.8rem 1.5rem', borderRadius: '50px', cursor: 'pointer' }}
                  >
                    ← Volver al Paso 1
                  </button>

                  <button
                    type="button"
                    className="font-heading"
                    onClick={() => setActiveStep(3)}
                    style={{ background: 'var(--neon)', color: '#000', border: 'none', padding: '0.9rem 2rem', borderRadius: '50px', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}
                  >
                    Continuar al Paso 3: Pago de Fee →
                  </button>
                </div>
              </div>
            )}

            {/* PASO 3: PAGO DE FEE (WEBPAY HOLD & DESGLOSE) */}
            {activeStep === 3 && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ color: 'var(--neon)', fontSize: '1.4rem' }}>Paso 3: Pago Seguro del Fee de Intercambio</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem',marginLeft: "auto", marginRight: "auto"}}>
                    La tarifa del servicio calculada por la IA se retiene temporalmente en modo Hold y solo se liquida al concretar la entrega.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ color: 'var(--neon)', marginBottom: '1rem', fontSize: '1.05rem' }}>Resumen del Acuerdo de Intercambio</h4>
                    
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Libro a recibir:</span>
                        <strong>{selectedTx.bookTitle}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Libro a entregar:</span>
                        <strong>{currentOfferedBook?.title || 'Libro propio'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Opción de Entrega:</span>
                        <strong style={{ color: 'var(--neon)' }}>
                          {selectedMethod === 'Donacion' ? 'Donación Comunitaria' : selectedMethod === 'Presencial' ? 'Entrega Presencial Santiago' : 'Envío Encomienda'}
                        </strong>
                      </div>
                      
                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.6rem', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                        <span>Tarifa de servicio (Fee IA):</span>
                        <strong style={{ color: 'var(--neon)', fontSize: '1.25rem' }}>${selectedTx.feeAmount.toLocaleString()} CLP</strong>
                      </div>
                    </div>

                    {selectedTx.isCrossBorder && (
                      <div style={{ marginTop: '1rem', background: 'rgba(255, 183, 3, 0.1)', padding: '0.8rem', borderRadius: '8px', border: '1px solid #ffb703', fontSize: '0.8rem', color: '#ffb703' }}>
                        <label style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', alignItems: 'flex-start' }}>
                          <input type="checkbox" checked={acceptCrossBorder} onChange={(e) => setAcceptCrossBorder(e.target.checked)} style={{ marginTop: '0.2rem' }} />
                          <span>Acepto asumir posibles costos adicionales de despacho internacional.</span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '1rem', fontSize: '1.05rem' }}>Pasarela Transbank Webpay Plus</h4>
                    
                    <img 
                      src="https://www.ecolectura.cl/Content/Images/webpay/1.Webpay_FN_300px.png" 
                      alt="Webpay Plus Transbank" 
                      style={{ height: '48px', objectFit: 'contain', margin: '0.5rem auto 1rem auto' }}
                    />
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                      Al hacer clic en el botón inferior serás redirigido al servidor seguro de Transbank para pre-autorizar el Hold de <strong>${selectedTx.feeAmount.toLocaleString()} CLP</strong>.
                    </p>

                    {checkoutError && <div style={{ color: '#ff4d4d', fontSize: '0.85rem', marginBottom: '1rem' }}>{checkoutError}</div>}

                    <button
                      type="button"
                      className="confirm-checkout-btn webpay-btn font-heading"
                      onClick={handleWebpayStart}
                      disabled={checkoutLoading || (selectedTx.isCrossBorder && !acceptCrossBorder)}
                      style={{ background: 'var(--neon)', color: '#000', fontWeight: 800, padding: '1rem', fontSize: '1rem', borderRadius: '50px', width: '100%' }}
                    >
                      {checkoutLoading ? 'Conectando con Webpay...' : <>Pagar Fee con Webpay Plus 🔒</>}
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.8rem 1.5rem', borderRadius: '50px', cursor: 'pointer' }}
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
        <h1>Tus Matches y Transacciones</h1>
        <p>Aquí puedes monitorear tus propuestas activas, realizar holds de fee y revisar la logística.</p>
      </div>

      {!hasOfferedBooks && matches.length > 0 && (
        <div style={{ background: 'rgba(15, 157, 88, 0.12)', border: '1px solid #0F9D58', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <strong style={{ color: '#0F9D58', fontSize: '1.05rem', display: 'block', marginBottom: '0.25rem' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> Tienes 0 libros cargados en tu libreta para ofrecer
            </strong>
            <span style={{ fontSize: '0.85rem', color: '#4A5D55' }}>
              Para poder pagar la tarifa e intercambiar, primero debes agregar al menos un libro en 'Tu Libreta' (Tengo para intercambiar).
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/libreta')}
            style={{ background: '#0F9D58', color: '#FFFFFF', padding: '0.75rem 1.25rem', borderRadius: '50px', fontWeight: 800, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
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
                    <img src={tx.bookImageUrl} alt={tx.bookTitle} />
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
                    {!hasOfferedBooks ? (
                      <span className="badge-pending" style={{ background: 'rgba(15, 157, 88, 0.12)', color: '#0F9D58', border: '1px solid rgba(15, 157, 88, 0.3)' }}>
                        Interés Guardado 💚
                      </span>
                    ) : tx.paymentStatus === 'Pending' ? (
                      <span className="badge-pending">Hold de Fee Pendiente ⏳</span>
                    ) : tx.paymentStatus === 'Hold' ? (
                      <span className="badge-hold">Pago Retenido (Hold) 🔒</span>
                    ) : tx.paymentStatus === 'Captured' ? (
                      <span className="badge-captured">Pago Procesado 💳</span>
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
                <div className="fee-amount-display">
                  <span>Fee de Intercambio:</span>
                  <strong>${tx.feeAmount.toLocaleString()} CLP</strong>
                </div>

                {!hasOfferedBooks ? (
                  <span></span>
                  // <button
                  //   className="pay-fee-btn font-heading"
                  //   onClick={() => navigate('/libreta')}
                  //   style={{ background: '#0F9D58', color: '#FFFFFF', fontWeight: 800 }}
                  // >
                  //   ＋ Cargar mi libro en Tu Libreta
                  // </button>
                ) : tx.paymentStatus === 'Pending' || tx.paymentStatus === 'Hold' ? (
                  <button
                    className="pay-fee-btn font-heading"
                    onClick={() => setSearchParams({ checkout: tx.id })}
                  >
                    {tx.paymentStatus === 'Hold' ? '💳 Ver Hold & Intercambio' : 'Pagar Fee & Intercambiar 💳'}
                  </button>
                ) : (
                  <button
                    className="pay-fee-btn font-heading"
                    onClick={() => {
                      setSelectedDetailTx(tx);
                      setIsThankYouMode(false);
                      setDetailModalOpen(true);
                    }}
                    style={{ background: '#0F9D58', color: '#FFFFFF', fontWeight: 800 }}
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
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      padding: '0.5rem 1rem',
                      borderRadius: '50px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      marginTop: '0.5rem',
                      width: '100%'
                    }}
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
