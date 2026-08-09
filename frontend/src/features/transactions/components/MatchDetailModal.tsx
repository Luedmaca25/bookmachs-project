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
      className="modal-overlay detail-modal-overlay-bootstrap" 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999, // Renderizado en document.body via React Portal
        background: 'rgba(26, 38, 33, 0.85)', // Fondo oscuro sombreado limpio
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="modal-card detail-modal-card-master" 
        style={{ 
          maxWidth: '780px', 
          width: '100%', 
          maxHeight: 'none',
          height: 'auto',
          margin: 'auto',
          position: 'relative',
          background: '#FFFFFF', // Blanco puro brillante de la maqueta
          border: '1px solid #E1E8E4',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(15, 157, 88, 0.15)',
          color: 'var(--text-primary)',
          boxSizing: 'border-box',
          padding: '2.25rem 2rem'
        }}
      >
        {/* Drag Handle Visual (Solo visible en móviles) */}
        <div 
          className="mobile-drag-handle"
          style={{
            width: '45px',
            height: '5px',
            background: '#D2DCD7',
            borderRadius: '10px',
            margin: '0 auto 1.25rem auto'
          }}
        />

        {/* Botón Cerrar Ultra-Sleek */}
        <button 
          onClick={onClose}
          aria-label="Cerrar modal"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: '#F0F4F2',
            border: '1px solid #E1E8E4',
            color: '#1A2621',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 20
          }}
        >
          ✕
        </button>

        {/* HERO HEADER - UX/UI MASTER */}
        {isThankYouPage ? (
          <div style={{ textAlign: 'center', marginBottom: '1.75rem', padding: '0 0.5rem' }}>
            <div 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                background: 'rgba(15, 157, 88, 0.12)', 
                color: '#0F9D58', 
                border: '1px solid rgba(15, 157, 88, 0.3)',
                padding: '0.45rem 1.35rem',
                borderRadius: '50px',
                fontWeight: 800,
                fontSize: '0.85rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '0.75rem'
              }}
            >
              <span>🎉</span> ¡PAGO WEBPAY AUTORIZADO EXITOSAMENTE!
            </div>
            <h2 style={{ fontSize: '1.65rem', color: '#1A2621', margin: '0.2rem 0 0.4rem 0', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              ¡Gracias por tu Intercambio en Bookmachs!
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#4A5D55', maxWidth: '540px', margin: '0 auto', lineHeight: 1.45 }}>
              Tu fee fue pre-autorizado de forma segura. A continuación encuentras el desglose de los libros, los plazos y la logística de entrega.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: '1.75rem', padding: '0 0.5rem' }}>
            <div 
              style={{ 
                display: 'inline-block',
                background: '#F0F4F2', 
                color: '#4A5D55', 
                border: '1px solid #E1E8E4',
                padding: '0.4rem 1.2rem',
                borderRadius: '50px',
                fontWeight: 700,
                fontSize: '0.82rem',
                marginBottom: '0.5rem'
              }}
            >
              📋 Detalle de Transacción e Intercambio IA
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#1A2621', margin: '0.2rem 0', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              Intercambio #{transaction.id.substring(0, 8).toUpperCase()}
            </h2>
          </div>
        )}

        {/* 3D DUET SWAP SHOWCASE - DESKTOP GRID (3 COLUMNAS) & MOBILE STACK */}
        <div 
          className="duet-swap-showcase-grid"
          style={{ 
            background: '#F7F9F8',
            border: '1px solid #E1E8E4',
            borderRadius: '20px',
            padding: '1.5rem 1.25rem',
            marginBottom: '1.5rem',
            position: 'relative'
          }}
        >
          {/* TARJETA 1: LIBRO A RECIBIR */}
          <div 
            style={{ 
              background: '#FFFFFF', 
              border: '1px solid #E1E8E4', 
              borderRadius: '16px', 
              padding: '1.25rem 1rem', 
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(15, 157, 88, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <span 
              style={{ 
                display: 'inline-block',
                background: 'rgba(15, 157, 88, 0.12)', 
                color: '#0F9D58', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '50px', 
                fontSize: '0.72rem', 
                fontWeight: 800,
                textTransform: 'uppercase',
                marginBottom: '0.85rem'
              }}
            >
              📥 Recibes en tu colección
            </span>

            {/* MARCO DE PORTADA 3D VISIBLE CON FALLBACK ABSOLUTO */}
            <div 
              style={{ 
                width: '105px', 
                height: '150px', 
                margin: '0 auto 0.85rem auto',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                border: '2px solid #0F9D58',
                background: '#F0F4F2',
                flexShrink: 0
              }}
            >
              <img 
                src={receiveCoverUrl} 
                alt={transaction.bookTitle}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => { e.currentTarget.src = defaultTargetCover; }}
              />
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A2621', lineHeight: 1.3, marginBottom: '0.25rem' }}>
              {transaction.bookTitle}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#4A5D55', marginBottom: '0.5rem' }}>
              por {transaction.bookAuthor}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span className={`condition-badge ${(transaction.bookCondition || 'good').toLowerCase()}`} style={{ fontSize: '0.72rem' }}>
                {transaction.bookCondition || 'Excelente'}
              </span>
              <span style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                Dueño: {transaction.ownerName}
              </span>
            </div>
          </div>

          {/* PUENTE CENTRAL DE INTERCAMBIO IA */}
          <div className="swap-bridge-node" style={{ textAlign: 'center', padding: '0 0.25rem' }}>
            <div 
              style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%',
                background: '#0F9D58',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                margin: '0 auto 0.4rem auto',
                boxShadow: '0 4px 15px rgba(15, 157, 88, 0.3)'
              }}
            >
              <i className="fa-solid fa-arrows-rotate"></i>
            </div>
            <span 
              style={{ 
                display: 'block',
                fontSize: '0.68rem', 
                fontWeight: 800, 
                color: '#0F9D58', 
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              🤖 Match 100% IA
            </span>
          </div>

          {/* TARJETA 2: LIBRO A ENTREGAR */}
          <div 
            style={{ 
              background: '#FFFFFF', 
              border: '1px solid #E1E8E4', 
              borderRadius: '16px', 
              padding: '1.25rem 1rem', 
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(15, 157, 88, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <span 
              style={{ 
                display: 'inline-block',
                background: 'rgba(230, 161, 0, 0.12)', 
                color: '#D97706', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '50px', 
                fontSize: '0.72rem', 
                fontWeight: 800,
                textTransform: 'uppercase',
                marginBottom: '0.85rem'
              }}
            >
              📤 Entregas a cambio
            </span>

            {/* SELECCIÓN DE LIBRO DEL INVENTARIO SI EXISTEN VARIOS */}
            {myInventory.length > 1 && (
              <div style={{ marginBottom: '0.6rem', width: '100%', maxWidth: '240px' }}>
                <select 
                  value={selectedOfferedId}
                  onChange={(e) => setSelectedOfferedId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.35rem 0.5rem',
                    background: '#FFFFFF',
                    color: '#1A2621',
                    border: '1px solid #D2DCD7',
                    borderRadius: '6px',
                    fontSize: '0.75rem'
                  }}
                >
                  {myInventory.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* MARCO DE PORTADA 3D CON FALLBACK GARANTIZADO */}
            <div 
              style={{ 
                width: '105px', 
                height: '150px', 
                margin: '0 auto 0.85rem auto',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                border: '2px solid #D97706',
                background: '#F0F4F2',
                flexShrink: 0
              }}
            >
              <img 
                src={offerCoverUrl} 
                alt={offerTitle}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => { e.currentTarget.src = defaultOfferedCover; }}
              />
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1A2621', lineHeight: 1.3, marginBottom: '0.25rem' }}>
              {offerTitle}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#4A5D55', marginBottom: '0.5rem' }}>
              por {offerAuthor}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span className={`condition-badge ${(offerCondition || 'excelente').toLowerCase()}`} style={{ fontSize: '0.72rem' }}>
                {offerCondition}
              </span>
              <span style={{ background: '#F0F4F2', color: '#4A5D55', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                Tu propiedad
              </span>
            </div>
          </div>
        </div>

        {/* TIMELINE & EXPIRATION DASHBOARD (DESKTOP GRID / MOBILE STACK) */}
        <div 
          style={{ 
            background: '#F7F9F8', 
            border: '1px solid #E1E8E4', 
            borderRadius: '18px', 
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}
        >
          {/* BARRA DE PROGRESO DE 5 DÍAS */}
          <div style={{ marginBottom: '1.1rem' }}>
            <div className="cronometer-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: daysRemaining <= 1 ? '#DC2626' : '#D97706' }}>
                ⏳ Cronómetro de Entrega: Día {elapsedDays} de 5
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F9D58' }}>
                {daysRemaining > 0 
                  ? `Quedan ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}${hoursRemainingMod > 0 ? ` y ${hoursRemainingMod}h` : ''}`
                  : `Quedan ${hoursRemainingMod} horas`}
              </span>
            </div>

            <div style={{ height: '8px', background: '#E1E8E4', borderRadius: '10px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${(elapsedDays / 5) * 100}%`, 
                  background: daysRemaining <= 1 ? '#DC2626' : 'linear-gradient(90deg, #0F9D58 0%, #D97706 100%)',
                  borderRadius: '10px',
                  transition: 'width 0.5s ease'
                }} 
              />
            </div>
          </div>

          {/* GRID DE METRICAS CLAVE */}
          <div className="metrics-dashboard-grid" style={{ gap: '0.85rem' }}>
            <div style={{ background: '#FFFFFF', padding: '0.85rem', borderRadius: '12px', border: '1px solid #E1E8E4' }}>
              <span style={{ fontSize: '0.7rem', color: '#4A5D55', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📅 Fecha de Pago:
              </span>
              <strong style={{ fontSize: '0.88rem', color: '#1A2621' }}>{formattedPaymentDate}</strong>
            </div>

            <div style={{ background: '#FFFFFF', padding: '0.85rem', borderRadius: '12px', border: '1px solid #E1E8E4' }}>
              <span style={{ fontSize: '0.7rem', color: '#4A5D55', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🔒 Fee Webpay Retenido:
              </span>
              <strong style={{ fontSize: '0.88rem', color: '#0F9D58' }}>
                ${transaction.feeAmount.toLocaleString('es-CL')} CLP
              </strong>
            </div>

            <div style={{ background: '#FFFFFF', padding: '0.85rem', borderRadius: '12px', border: '1px solid #E1E8E4' }}>
              <span style={{ fontSize: '0.7rem', color: '#4A5D55', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ⏰ Límite de Expiración:
              </span>
              <strong style={{ fontSize: '0.88rem', color: daysRemaining <= 1 ? '#DC2626' : '#D97706' }}>
                {formattedDeadlineDate}
              </strong>
            </div>
          </div>
        </div>

        {/* CUMPLIMIENTO LOGÍSTICO Y SUBIDA DE COMPROBANTES (PANTALLA 11) */}
        <div 
          style={{ 
            background: '#F7F9F8', 
            border: '1px solid #E1E8E4', 
            borderRadius: '20px', 
            padding: '1.35rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div 
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                background: 'rgba(15, 157, 88, 0.12)', 
                color: '#0F9D58', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.2rem',
                flexShrink: 0
              }}
            >
              {currentMethod === 'Donacion' ? '🎁' : currentMethod === 'Envio' ? '📦' : '📍'}
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1A2621', fontWeight: 800 }}>
                Opción Seleccionada: {currentMethod === 'Donacion' ? 'Donación Comunitaria' : currentMethod === 'Envio' ? 'Envío Encomienda' : 'Entrega Presencial (Santiago)'}
              </h4>
              <span style={{ fontSize: '0.8rem', color: '#4A5D55' }}>
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
            <form onSubmit={handleSubmitLogistics} style={{ marginTop: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#4A5D55', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Cargar foto del espacio comunitario o colegio donde realizaste la donación:
                </label>
                
                <div 
                  style={{ 
                    border: '2px dashed #D2DCD7', 
                    borderRadius: '14px', 
                    padding: '1.25rem', 
                    textAlign: 'center',
                    background: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('donation-photo-input')?.click()}
                >
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', color: '#0F9D58', marginBottom: '0.5rem' }}></i>
                  <div style={{ fontSize: '0.85rem', color: '#1A2621', fontWeight: 700 }}>Haz clic para seleccionar o arrastrar fotografía</div>
                  <div style={{ fontSize: '0.75rem', color: '#4A5D55' }}>Formatos permitidos: JPG, PNG, WEBP (Máx 5MB)</div>
                  
                  <input 
                    id="donation-photo-input"
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoChange} 
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {evidencePreview && (
                <div style={{ marginBottom: '1.1rem', textAlign: 'center', background: '#F0F4F2', padding: '0.75rem', borderRadius: '12px' }}>
                  <img 
                    src={evidencePreview} 
                    alt="Vista previa donación" 
                    style={{ maxHeight: '160px', borderRadius: '10px', border: '2px solid #0F9D58' }} 
                  />
                  <div style={{ fontSize: '0.78rem', color: '#0F9D58', marginTop: '0.4rem', fontWeight: 700 }}>
                    ✓ Fotografía lista para proceso de validación previa
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || (!evidencePhotoFile && !evidencePreview)}
                style={{
                  width: '100%',
                  background: '#0F9D58',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  padding: '0.9rem',
                  borderRadius: '50px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.92rem',
                  boxShadow: '0 4px 15px rgba(15, 157, 88, 0.3)',
                  opacity: uploading || (!evidencePhotoFile && !evidencePreview) ? 0.5 : 1
                }}
              >
                {uploading ? 'Enviando fotografía...' : '📤 Subir Foto de Donación para Validación Previa'}
              </button>
            </form>
          )}

          {/* FORMULARIO ENVÍO ENCOMIENDA */}
          {currentMethod === 'Envio' && (
            <form onSubmit={handleSubmitLogistics} style={{ marginTop: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#4A5D55', marginBottom: '0.35rem', fontWeight: 600 }}>
                  N° de Orden de Seguimiento o Voucher:
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: CHI-998234812" 
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', background: '#FFFFFF', color: '#1A2621', border: '1px solid #D2DCD7', borderRadius: '10px', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#4A5D55', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Adjuntar Captura del Comprobante / Voucher:
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoChange} 
                  style={{ background: '#FFFFFF', color: '#1A2621', padding: '0.6rem', border: '1px solid #D2DCD7', borderRadius: '10px', width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              {evidencePreview && (
                <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                  <img src={evidencePreview} alt="Vista previa voucher" style={{ maxHeight: '140px', borderRadius: '10px', border: '2px solid #0F9D58' }} />
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || (!trackingNumberInput && !evidencePhotoFile)}
                style={{
                  width: '100%',
                  background: '#0F9D58',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  padding: '0.9rem',
                  borderRadius: '50px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.92rem',
                  boxShadow: '0 4px 15px rgba(15, 157, 88, 0.3)',
                  opacity: uploading || (!trackingNumberInput && !evidencePhotoFile) ? 0.5 : 1
                }}
              >
                {uploading ? 'Registrando comprobante...' : '📦 Registrar Comprobante de Envío'}
              </button>
            </form>
          )}

          {/* TARJETA ENTREGA PRESENCIAL */}
          {currentMethod === 'Presencial' && (
            <div 
              style={{ 
                padding: '1.1rem', 
                background: '#FFFFFF', 
                border: '1px dashed #D2DCD7',
                borderRadius: '14px', 
                fontSize: '0.85rem', 
                color: '#4A5D55', 
                lineHeight: 1.5 
              }}
            >
              <div style={{ color: '#1A2621', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>📍 Dirección Oficial de Entrega Presencial:</span>
                <button
                  type="button"
                  onClick={copyAddressToClipboard}
                  style={{
                    background: copiedAddress ? '#0F9D58' : '#F0F4F2',
                    color: copiedAddress ? '#FFFFFF' : '#0F9D58',
                    border: '1px solid #0F9D58',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '50px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {copiedAddress ? '✓ ¡Copiado!' : '📋 Copiar Dirección'}
                </button>
              </div>

              <div style={{ color: '#0F9D58', fontSize: '1rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                Patronato 447, Recoleta, Santiago, Chile
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#4A5D55' }}>
                Muestra este código de transacción <strong>#{transaction.id.substring(0, 8).toUpperCase()}</strong> al momento de entregar tu ejemplar.
              </p>
            </div>
          )}

          {uploadSuccessMsg && (
            <div style={{ background: 'rgba(15, 157, 88, 0.12)', border: '1px solid #0F9D58', color: '#0F9D58', borderRadius: '10px', padding: '0.85rem', marginTop: '1rem', fontSize: '0.85rem', textAlign: 'center', fontWeight: 700 }}>
              ✓ {uploadSuccessMsg}
            </div>
          )}

          {uploadError && (
            <div style={{ background: 'rgba(220, 38, 38, 0.12)', border: '1px solid #DC2626', color: '#DC2626', borderRadius: '10px', padding: '0.85rem', marginTop: '1rem', fontSize: '0.85rem', textAlign: 'center', fontWeight: 700 }}>
              ⚠️ {uploadError}
            </div>
          )}
        </div>

        {/* ACCIONES FINALES */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              background: '#0F9D58',
              color: '#FFFFFF',
              fontWeight: 800,
              padding: '1rem',
              borderRadius: '50px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem',
              boxShadow: '0 4px 15px rgba(15, 157, 88, 0.3)',
              fontFamily: 'var(--font-heading)'
            }}
          >
            {isThankYouPage ? '✓ Entendido, ir a mis Intercambios' : 'Cerrar Detalle'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
