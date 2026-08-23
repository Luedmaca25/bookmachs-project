import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../../lib/apiClient';
import { calculateFulfillmentTiming } from '../../../lib/dateUtils';

export interface MatchTransactionDetail {
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
  
  // Propiedades opcionales del libro ofrecido
  offeredBookTitle?: string;
  offeredBookAuthor?: string;
  offeredBookImageUrl?: string;
  offeredBookCondition?: string;
}

interface MyOfferedBook {
  id: string;
  title: string;
  author: string;
  condition: string;
  imageUrl: string;
}

interface MatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: MatchTransactionDetail | null;
  isThankYouPage?: boolean;
  onLogisticsUpdated?: () => void;
}

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  isThankYouPage = false,
  onLogisticsUpdated,
}) => {
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [evidencePhotoFile, setEvidencePhotoFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Inventario del usuario para asegurar la visualización del libro entregado
  const [myInventory, setMyInventory] = useState<MyOfferedBook[]>([]);
  const [selectedOfferedId, setSelectedOfferedId] = useState<string>('');

  // Bloquear scroll de html y body mientras el modal de detalle esté abierto
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchInventory = async () => {
      try {
        const inventory = await apiClient.get<MyOfferedBook[]>('/books/my-inventory');
        setMyInventory(inventory);
        if (inventory.length > 0) {
          setSelectedOfferedId(inventory[0].id);
        }
      } catch (err) {
        console.error('Error al cargar inventario en MatchDetailModal:', err);
      }
    };

    fetchInventory();
  }, [isOpen]);

  if (!isOpen || !transaction) return null;

  // Portadas con fallback garantizado para evitar imágenes rotas o invisibles
  const defaultTargetCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300';
  const defaultOfferedCover = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300';

  const receiveCoverUrl = (transaction.bookImageUrl && transaction.bookImageUrl.trim() !== '') 
    ? transaction.bookImageUrl 
    : defaultTargetCover;

  const currentOfferedBook = myInventory.find((b) => b.id === selectedOfferedId) || myInventory[0];

  const offerTitle = currentOfferedBook?.title || transaction.offeredBookTitle || 'Libro de Tu Libreta';
  const offerAuthor = currentOfferedBook?.author || transaction.offeredBookAuthor || 'Tú (Dueño)';
  const offerCondition = currentOfferedBook?.condition || transaction.offeredBookCondition || 'Excelente';
  
  const offerCoverUrl = currentOfferedBook?.imageUrl && currentOfferedBook.imageUrl.trim() !== ''
    ? currentOfferedBook.imageUrl
    : (transaction.offeredBookImageUrl && transaction.offeredBookImageUrl.trim() !== '' ? transaction.offeredBookImageUrl : defaultOfferedCover);

  // Cálculo exacto del cronómetro de 5 días y formateo en la zona horaria del usuario
  const timing = calculateFulfillmentTiming(transaction.createdAt);
  const { 
    formattedCreatedDate: formattedPaymentDate, 
    formattedDeadlineDate, 
    daysRemaining, 
    hoursRemainingMod,
    elapsedDays 
  } = timing;

  // Manejar selección de foto de donación o voucher de envío
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEvidencePhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Enviar formulario de logística (Foto de donación o Comprobante de envío)
  const handleSubmitLogistics = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);
    setUploadSuccessMsg(null);

    try {
      let photoBase64 = evidencePreview || undefined;

      const payload = {
        matchTransactionId: transaction.id,
        logisticsMethod: transaction.logisticsMethod || 'Presencial',
        trackingNumber: trackingNumberInput || undefined,
        evidencePhotoBase64: photoBase64,
      };

      const response = await apiClient.post<any>('/transactions/update-logistics', payload);
      if (response.success || response.logisticsStatus) {
        setUploadSuccessMsg('Información logística enviada con éxito. Se encuentra en proceso de validación previa.');
        if (onLogisticsUpdated) onLogisticsUpdated();
      } else {
        setUploadError(response.message || 'No se pudo actualizar la información logística.');
      }
    } catch (err: any) {
      console.error('Error al actualizar logística:', err);
      setUploadError('Error de servidor al subir el comprobante.');
    } finally {
      setUploading(false);
    }
  };

  const currentMethod = transaction.logisticsMethod || 'Presencial';

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-card match-modal-card match-modal-card-custom">
        {/* Botón de Cierre Superior */}
        <button 
          type="button" 
          className="modal-close-btn-top" 
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Encabezado Neón Principal */}
        <div className="checkout-step-header">
          <div className="neon-badge-pill">
            {isThankYouPage ? '🎉 ¡Pago Webpay Autorizado Exitosamente!' : '📋 Detalle de Transacción e Intercambio IA'}
          </div>
          
          <h3 className="match-modal-title">
            {isThankYouPage ? '¡Gracias por tu Intercambio en Bookmachs!' : `Intercambio #${transaction.id.substring(0, 8).toUpperCase()}`}
          </h3>
          <p className="match-modal-subtitle">
            {isThankYouPage 
              ? 'Tu fee fue pre-autorizado de forma segura. A continuación encuentras el desglose de los libros, los plazos y la logística de entrega.'
              : 'Detalle completo de libros acordados, plazos de entrega y estado de la logística.'}
          </p>
        </div>

        {/* DUET SWAP DECK - MOSTRAR LOS 2 LIBROS DEL INTERCAMBIO */}
        <div className="duet-swap-deck duet-swap-deck-modal">
          {/* Libro Recibido */}
          <div className="swap-book-card target-card">
            <span className="swap-card-tag receive">Libro que recibes</span>
            <div className="swap-cover-frame swap-cover-frame-fixed">
              <img 
                src={receiveCoverUrl} 
                alt={transaction.bookTitle}
                onError={(e) => { e.currentTarget.src = defaultTargetCover; }} 
              />
            </div>
            <div className="swap-book-title swap-book-title-sm">{transaction.bookTitle}</div>
            <div className="swap-book-author swap-book-author-sm">por {transaction.bookAuthor}</div>
            <div className="mt-04">
              <span className={`condition-badge ${(transaction.bookCondition || 'Excelente').toLowerCase()}`}>
                Estado libro: {transaction.bookCondition || 'Excelente'}
              </span>
            </div>
          </div>

          {/* Centro: Puente de Intercambio */}
          <div className="swap-bridge-center">
            <div className="swap-pulse-badge swap-pulse-badge-md">
              <i className="fa-solid fa-arrows-rotate"></i>
            </div>
          </div>

          {/* Libro Entregado */}
          <div className="swap-book-card offered-card">
            <span className="swap-card-tag give">Libro que tú entregas</span>
            
            {myInventory.length > 1 && (
              <div className="mb-04">
                <select 
                  value={selectedOfferedId} 
                  onChange={(e) => setSelectedOfferedId(e.target.value)} 
                  className="select-offered-modal"
                >
                  {myInventory.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="swap-cover-frame swap-cover-frame-fixed">
              <img 
                src={offerCoverUrl} 
                alt={offerTitle} 
                onError={(e) => { e.currentTarget.src = defaultOfferedCover; }} 
              />
            </div>
            <div className="swap-book-title swap-book-title-sm">{offerTitle}</div>
            <div className="swap-book-author swap-book-author-sm">por {offerAuthor}</div>
            <div className="mt-04">
              <span className={`condition-badge ${(offerCondition || 'Excelente').toLowerCase()}`}>
                Estado libro: {offerCondition}
              </span>
            </div>
          </div>
        </div>

        {/* DASHBOARD DE CRONÓMETRO Y TARIFAS */}
        <div className="fee-estimate-container">
          <div className="fee-estimate-flex">
            <div>
              <span className="fee-estimate-label">
                ⏳ Cronómetro de Entrega (5 Días Máx):
              </span>
              <div className="fee-estimate-amount" style={{ fontSize: '1.15rem' }}>
                Día {elapsedDays} de 5 — {daysRemaining > 0 ? `${daysRemaining} día(s) restante(s)` : `${hoursRemainingMod} horas restantes`}
              </div>
            </div>
          </div>

          <div className="fee-details-list fee-details-expanded">
            <div className="fee-row fee-detail-row">
              <span>Fecha de Confirmación:</span>
              <span>{formattedPaymentDate}</span>
            </div>
            <div className="fee-row fee-detail-row">
              <span>Fee Webpay Retenido:</span>
              <span className="fee-estimate-amount" style={{ fontSize: '1rem' }}>
                ${transaction.feeAmount.toLocaleString('es-CL')} CLP
              </span>
            </div>
            <div className="fee-row fee-detail-row-final">
              <span>Fecha Límite Expiración:</span>
              <span className={daysRemaining <= 1 ? 'fee-error-msg' : ''}>{formattedDeadlineDate}</span>
            </div>
          </div>
        </div>

        {/* SECCIÓN LOGÍSTICA & SUBIDA DE COMPROBANTES */}
        <div className="fee-estimate-container mt-04" style={{ marginTop: '1rem' }}>
          <div style={{ color: 'var(--neon)', fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.4rem' }}>
            {currentMethod === 'Donacion' ? '🎁 Donación Comunitaria' : currentMethod === 'Envio' ? '📦 Envío por Encomienda' : '📍 Dirección de Entrega'}
          </div>
          <p className="match-modal-subtitle" style={{ textAlign: 'center', margin: '0 0 1rem 0' }}>
            {currentMethod === 'Donacion' 
              ? 'Sube la foto del colegio o espacio comunitario para proceso de validación previa.'
              : currentMethod === 'Envio' 
              ? 'Registra el N° de seguimiento y comprobante de envío.'
              : 'Entrega tu libro en la ubicación acordada.'}
          </p>

          {currentMethod === 'Donacion' && (
            <form onSubmit={handleSubmitLogistics}>
              <div className="mb-04">
                <div 
                  className="dropzone-upload-box"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '1rem', textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => document.getElementById('donation-photo-input')?.click()}
                >
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '1.5rem', color: 'var(--neon)', marginBottom: '0.4rem' }}></i>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>Toca para seleccionar o subir fotografía de donación</div>
                  <input 
                    id="donation-photo-input"
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoChange} 
                    className="file-input-hidden"
                  />
                </div>
              </div>

              {evidencePreview && (
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <img src={evidencePreview} alt="Vista previa" style={{ maxHeight: '120px', borderRadius: '6px' }} />
                  <div style={{ fontSize: '0.8rem', color: 'var(--neon)', fontWeight: '700', marginTop: '0.4rem' }}>
                    ✓ Fotografía cargada correctamente
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || (!evidencePhotoFile && !evidencePreview)}
                className="checkout-proceed-btn font-heading btn-accept-checkout"
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', fontSize: '0.9rem' }}
              >
                {uploading ? 'Enviando...' : '📤 Subir Foto para Validación Previa'}
              </button>
            </form>
          )}

          {currentMethod === 'Envio' && (
            <form onSubmit={handleSubmitLogistics}>
              <div className="mb-04">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  N° de Orden de Seguimiento / Voucher:
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: CHI-998234812" 
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  className="offered-book-select"
                />
              </div>

              <div className="mb-04">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                  Adjuntar Comprobante (Opcional):
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoChange}
                  style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                />
              </div>

              {evidencePreview && (
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <img src={evidencePreview} alt="Voucher" style={{ maxHeight: '120px', borderRadius: '6px' }} />
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || (!trackingNumberInput && !evidencePhotoFile)}
                className="checkout-proceed-btn font-heading btn-accept-checkout"
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', fontSize: '0.9rem' }}
              >
                {uploading ? 'Registrando...' : '📦 Registrar Comprobante de Envío'}
              </button>
            </form>
          )}

          {currentMethod === 'Presencial' && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--neon)' }}>
                Patronato 447, Recoleta, Santiago, Chile
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0 0' }}>
                Presenta el código <strong>#{transaction.id.substring(0, 8).toUpperCase()}</strong> al entregar tu ejemplar.
              </p>
            </div>
          )}

          {uploadSuccessMsg && (
            <div className="warning-requirements-box" style={{ background: 'rgba(6, 214, 160, 0.1)', borderColor: '#06d6a0', color: '#06d6a0', marginTop: '0.75rem' }}>
              ✓ {uploadSuccessMsg}
            </div>
          )}

          {uploadError && (
            <div className="fee-error fee-error-msg" style={{ marginTop: '0.75rem' }}>
              ⚠️ {uploadError}
            </div>
          )}
        </div>

        {/* ACCIONES FINALES */}
        <div className="match-actions match-actions-col">
          <button 
            type="button" 
            className="keep-swiping-btn btn-keep-discovering" 
            onClick={onClose}
          >
            {isThankYouPage ? '✓ Entendido, ir a mis Intercambios' : 'Cerrar Detalle'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
