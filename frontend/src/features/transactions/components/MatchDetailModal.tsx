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
  const [copiedAddress, setCopiedAddress] = useState(false);

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

  const copyAddressToClipboard = () => {
    navigator.clipboard.writeText('Patronato 447, Recoleta, Santiago, Chile');
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  const currentMethod = transaction.logisticsMethod || 'Presencial';

  return createPortal(
    <div 
      className="modal-overlay detail-modal-overlay-bootstrap detail-modal-overlay-custom"
    >
      <div 
        className="modal-card detail-modal-card-master detail-modal-card-white"
      >
        {/* Drag Handle Visual (Solo visible en móviles) */}
        <div 
          className="mobile-drag-handle drag-handle-gray"
        />

        {/* Botón Cerrar Ultra-Sleek */}
        <button 
          onClick={onClose}
          aria-label="Cerrar modal"
          className="btn-modal-close-round"
        >
          ✕
        </button>

        {/* HERO HEADER - UX/UI MASTER */}
        {isThankYouPage ? (
          <div className="hero-header-center">
            <div 
              className="badge-success-pill"
            >
              <span>🎉</span> ¡PAGO WEBPAY AUTORIZADO EXITOSAMENTE!
            </div>
            <h2 className="thank-you-title">
              ¡Gracias por tu Intercambio en Bookmachs!
            </h2>
            <p className="thank-you-desc">
              Tu fee fue pre-autorizado de forma segura. A continuación encuentras el desglose de los libros, los plazos y la logística de entrega.
            </p>
          </div>
        ) : (
          <div className="hero-header-center">
            <div 
              className="badge-detail-pill"
            >
              📋 Detalle de Transacción e Intercambio IA
            </div>
            <h2 className="detail-tx-title">
              Intercambio #{transaction.id.substring(0, 8).toUpperCase()}
            </h2>
          </div>
        )}

        {/* 3D DUET SWAP SHOWCASE - DESKTOP GRID (3 COLUMNAS) & MOBILE STACK */}
        <div 
          className="duet-swap-showcase-grid duet-showcase-container"
        >
          {/* TARJETA 1: LIBRO A RECIBIR */}
          <div 
            className="swap-showcase-card"
          >
            <span 
              className="badge-tag-green"
            >
              📥 Recibes en tu colección
            </span>

            {/* MARCO DE PORTADA 3D VISIBLE CON FALLBACK ABSOLUTO */}
            <div 
              className="swap-cover-frame-green"
            >
              <img 
                src={receiveCoverUrl} 
                alt={transaction.bookTitle}
                className="img-cover-fill"
                onError={(e) => { e.currentTarget.src = defaultTargetCover; }}
              />
            </div>

            <div className="book-card-title-dark">
              {transaction.bookTitle}
            </div>
            <div className="book-card-author-dark">
              por {transaction.bookAuthor}
            </div>

            <div className="book-card-badges-row">
              <span className={`condition-badge ${(transaction.bookCondition || 'good').toLowerCase()} badge-text-xs`}>
                {transaction.bookCondition || 'Excelente'}
              </span>
              <span className="owner-badge-gray">
                Dueño: {transaction.ownerName}
              </span>
            </div>
          </div>

          {/* PUENTE CENTRAL DE INTERCAMBIO IA */}
          <div className="swap-bridge-node bridge-node-padded">
            <div 
              className="swap-pulse-circle-green"
            >
              <i className="fa-solid fa-arrows-rotate"></i>
            </div>
            <span 
              className="bridge-ia-label"
            >
              🤖 Match 100% IA
            </span>
          </div>

          {/* TARJETA 2: LIBRO A ENTREGAR */}
          <div 
            className="swap-showcase-card"
          >
            <span 
              className="badge-tag-amber"
            >
              📤 Entregas a cambio
            </span>

            {/* SELECCIÓN DE LIBRO DEL INVENTARIO SI EXISTEN VARIOS */}
            {myInventory.length > 1 && (
              <div className="select-offered-inventory-wrapper">
                <select 
                  value={selectedOfferedId}
                  onChange={(e) => setSelectedOfferedId(e.target.value)}
                  className="select-offered-inventory"
                >
                  {myInventory.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* MARCO DE PORTADA 3D CON FALLBACK GARANTIZADO */}
            <div 
              className="swap-cover-frame-amber"
            >
              <img 
                src={offerCoverUrl} 
                alt={offerTitle}
                className="img-cover-fill"
                onError={(e) => { e.currentTarget.src = defaultOfferedCover; }}
              />
            </div>

            <div className="book-card-title-dark">
              {offerTitle}
            </div>
            <div className="book-card-author-dark">
              por {offerAuthor}
            </div>

            <div className="book-card-badges-row">
              <span className={`condition-badge ${(offerCondition || 'excelente').toLowerCase()} badge-text-xs`}>
                {offerCondition}
              </span>
              <span className="owner-badge-light-gray">
                Tu propiedad
              </span>
            </div>
          </div>
        </div>

        {/* TIMELINE & EXPIRATION DASHBOARD (DESKTOP GRID / MOBILE STACK) */}
        <div 
          className="timeline-dashboard-card"
        >
          {/* BARRA DE PROGRESO DE 5 DÍAS */}
          <div className="progress-bar-container">
            <div className="cronometer-header-row cronometer-header-flex">
              <span className={`cronometer-label ${daysRemaining <= 1 ? 'urgent' : 'warning'}`}>
                ⏳ Cronómetro de Entrega: Día {elapsedDays} de 5
              </span>
              <span className="cronometer-time-left">
                {daysRemaining > 0 
                  ? `Quedan ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}${hoursRemainingMod > 0 ? ` y ${hoursRemainingMod}h` : ''}`
                  : `Quedan ${hoursRemainingMod} horas`}
              </span>
            </div>

            <div className="progress-track-gray">
              <div 
                className={`progress-fill-bar ${daysRemaining <= 1 ? 'urgent' : ''}`}
                style={{ 
                  width: `${(elapsedDays / 5) * 100}%`
                }} 
              />
            </div>
          </div>

          {/* GRID DE METRICAS CLAVE */}
          <div className="metrics-dashboard-grid metrics-dashboard-gap">
            <div className="metric-box-white">
              <span className="metric-box-label">
                📅 Fecha de Pago:
              </span>
              <strong className="metric-box-value-dark">{formattedPaymentDate}</strong>
            </div>

            <div className="metric-box-white">
              <span className="metric-box-label">
                🔒 Fee Webpay Retenido:
              </span>
              <strong className="metric-box-value-green">
                ${transaction.feeAmount.toLocaleString('es-CL')} CLP
              </strong>
            </div>

            <div className="metric-box-white">
              <span className="metric-box-label">
                ⏰ Límite de Expiración:
              </span>
              <strong className={`metric-box-value-expiration ${daysRemaining <= 1 ? 'urgent' : ''}`}>
                {formattedDeadlineDate}
              </strong>
            </div>
          </div>
        </div>

        {/* CUMPLIMIENTO LOGÍSTICO Y SUBIDA DE COMPROBANTES (PANTALLA 11) */}
        <div 
          className="logistics-compliance-card"
        >
          <div className="logistics-method-header-row">
            <div 
              className="logistics-method-icon-box"
            >
              {currentMethod === 'Donacion' ? '🎁' : currentMethod === 'Envio' ? '📦' : '📍'}
            </div>
            <div>
              <h4 className="logistics-method-title">
                Opción Seleccionada: {currentMethod === 'Donacion' ? 'Donación Comunitaria' : currentMethod === 'Envio' ? 'Envío Encomienda' : 'Entrega Presencial (Santiago)'}
              </h4>
              <span className="logistics-method-subtitle">
                {currentMethod === 'Donacion' 
                  ? 'Sube la foto del colegio o espacio comunitario para proceso de validación previa.'
                  : currentMethod === 'Envio' 
                  ? 'Registra el N° de seguimiento y comprobante de envío.'
                  : 'Entrega tu libro en la ubicación oficial acordada.'}
              </span>
            </div>
          </div>

          {/* FORMULARIO DONACIÓN COMUNITARIA */}
          {currentMethod === 'Donacion' && (
            <form onSubmit={handleSubmitLogistics} className="mt-1">
              <div className="mb-1">
                <label className="form-field-label">
                  Cargar foto del espacio comunitario o colegio donde realizaste la donación:
                </label>
                
                <div 
                  className="dropzone-upload-border"
                  onClick={() => document.getElementById('donation-photo-input')?.click()}
                >
                  <i className="fa-solid fa-cloud-arrow-up cloud-upload-icon"></i>
                  <div className="dropzone-title">Haz clic para seleccionar o arrastrar fotografía</div>
                  <div className="dropzone-subtitle">Formatos permitidos: JPG, PNG, WEBP (Máx 5MB)</div>
                  
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
                <div className="preview-box-green">
                  <img 
                    src={evidencePreview} 
                    alt="Vista previa donación" 
                    className="preview-img-donation" 
                  />
                  <div className="preview-success-text">
                    ✓ Fotografía lista para proceso de validación previa
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || (!evidencePhotoFile && !evidencePreview)}
                className="btn-submit-green-pill"
              >
                {uploading ? 'Enviando fotografía...' : '📤 Subir Foto de Donación para Validación Previa'}
              </button>
            </form>
          )}

          {/* FORMULARIO ENVÍO ENCOMIENDA */}
          {currentMethod === 'Envio' && (
            <form onSubmit={handleSubmitLogistics} className="mt-1">
              <div className="mb-1">
                <label className="form-field-label">
                  N° de Orden de Seguimiento o Voucher:
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: CHI-998234812" 
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  className="input-white-field"
                />
              </div>

              <div className="mb-1">
                <label className="form-field-label">
                  Adjuntar Captura del Comprobante / Voucher:
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoChange} 
                  className="file-input-white"
                />
              </div>

              {evidencePreview && (
                <div className="preview-box-center">
                  <img src={evidencePreview} alt="Vista previa voucher" className="preview-img-voucher" />
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || (!trackingNumberInput && !evidencePhotoFile)}
                className="btn-submit-green-pill"
              >
                {uploading ? 'Registrando comprobante...' : '📦 Registrar Comprobante de Envío'}
              </button>
            </form>
          )}

          {/* TARJETA ENTREGA PRESENCIAL */}
          {currentMethod === 'Presencial' && (
            <div 
              className="presencial-address-card"
            >
              <div className="presencial-address-header">
                <span>📍 Dirección Oficial de Entrega Presencial:</span>
                <button
                  type="button"
                  onClick={copyAddressToClipboard}
                  className={`btn-copy-address ${copiedAddress ? 'copied' : ''}`}
                >
                  {copiedAddress ? '✓ ¡Copiado!' : '📋 Copiar Dirección'}
                </button>
              </div>

              <div className="presencial-address-text">
                Patronato 447, Recoleta, Santiago, Chile
              </div>
              <p className="presencial-address-note">
                Muestra este código de transacción <strong>#{transaction.id.substring(0, 8).toUpperCase()}</strong> al momento de entregar tu ejemplar.
              </p>
            </div>
          )}

          {uploadSuccessMsg && (
            <div className="alert-upload-success">
              ✓ {uploadSuccessMsg}
            </div>
          )}

          {uploadError && (
            <div className="alert-upload-error">
              ⚠️ {uploadError}
            </div>
          )}
        </div>

        {/* ACCIONES FINALES */}
        <div className="final-actions-flex">
          <button
            type="button"
            onClick={onClose}
            className="btn-modal-close-final font-heading"
          >
            {isThankYouPage ? '✓ Entendido, ir a mis Intercambios' : 'Cerrar Detalle'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
