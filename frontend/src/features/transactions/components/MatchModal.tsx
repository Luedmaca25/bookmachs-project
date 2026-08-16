import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  hasOfferedBooks?: boolean;
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

interface MyOfferedBook {
  id: string;
  title: string;
  author: string;
  condition: string;
  imageUrl: string;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  isOpen,
  onClose,
  book,
  matchTransactionId,
  onProceedToCheckout,
  hasOfferedBooks = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [feeDetails, setFeeDetails] = useState<FeeEstimation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Carga del inventario del usuario para mostrar el libro entregado
  const [myBooks, setMyBooks] = useState<MyOfferedBook[]>([]);
  const [selectedOfferedBookId, setSelectedOfferedBookId] = useState<string>('');

  // Bloquear scroll de html y body mientras el modal de propuesta esté abierto
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

    const fetchMyInventory = async () => {
      try {
        const inventory = await apiClient.get<MyOfferedBook[]>('/books/my-inventory');
        setMyBooks(inventory);
        if (inventory.length > 0) {
          setSelectedOfferedBookId(inventory[0].id);
        }
      } catch (err) {
        console.error('Error al cargar inventario para MatchModal:', err);
      }
    };

    fetchMyInventory();
  }, [isOpen]);

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
        setError('No se pudo cargar la estimación del costo de intercambio.');
      } finally {
        setLoading(false);
      }
    };

    fetchFee();
  }, [isOpen, book]);

  if (!isOpen || !book) return null;

  const currentOfferedBook = myBooks.find((b) => b.id === selectedOfferedBookId) || myBooks[0];
  const userHasBooks = hasOfferedBooks && myBooks.length > 0;

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

        {/* Insignia de Encabezado Neón */}
        <div className="checkout-step-header">
          <div className="neon-badge-pill">
            ✨ ¡Propuesta de Match IA! ✨
          </div>
          
          <h3 className="match-modal-title">
            Bookmachs quiere intercambiar contigo
          </h3>
          <p className="match-modal-subtitle">
            Nuestra inteligencia artificial analizó la compatibilidad entre tus lecturas deseadas y los libros físicos que tienes disponibles para ofrecer.
          </p>
        </div>

        {/* Advertencia si el usuario no tiene libros cargados */}
        {!userHasBooks && (
          <div className="warning-requirements-box">
            <strong><i className="fa-solid fa-triangle-exclamation"></i> Requisito Obligatorio:</strong> No tienes ningún libro cargado en "Tu libreta" (Tengo para intercambiar). Para aceptar este match, debes subir al menos un libro para ofrecer a cambio.
          </div>
        )}

        {/* DUET SWAP DECK - MOSTRAR LOS 2 LIBROS DEL INTERCAMBIO */}
        <div className="duet-swap-deck duet-swap-deck-modal">
          {/* Libro Recibido */}
          <div className="swap-book-card target-card">
            <span className="swap-card-tag receive">Libro que recibes</span>
            <div className="swap-cover-frame swap-cover-frame-fixed">
              {book.imageUrl ? (
                <img src={book.imageUrl} alt={book.title} />
              ) : (
                <div className="book-placeholder-icon">📖</div>
              )}
            </div>
            <div className="swap-book-title swap-book-title-sm">{book.title}</div>
            <div className="swap-book-author swap-book-author-sm">por {book.author}</div>
            <div className="mt-04">
              <span className={`condition-badge ${book.condition.toLowerCase()}`}>
                Estado libro: {book.condition}
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
            
            {userHasBooks ? (
              <div>
                {myBooks.length > 1 && (
                  <div className="mb-04">
                    <select 
                      value={selectedOfferedBookId} 
                      onChange={(e) => setSelectedOfferedBookId(e.target.value)}
                      className="select-offered-modal"
                    >
                      {myBooks.map((b) => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {currentOfferedBook && (
                  <div>
                    <div className="swap-cover-frame swap-cover-frame-fixed">
                      <img 
                        src={currentOfferedBook.imageUrl} 
                        alt={currentOfferedBook.title}
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150'; }} 
                      />
                    </div>
                    <div className="swap-book-title swap-book-title-sm">{currentOfferedBook.title}</div>
                    <div className="swap-book-author swap-book-author-sm">por {currentOfferedBook.author}</div>
                    <div className="mt-04">
                      <span className={`condition-badge ${(currentOfferedBook.condition || 'Excelente').toLowerCase()}`}>
                        Estado libro: {currentOfferedBook.condition || 'Excelente'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-offered-modal-content">
                <div className="no-offered-modal-text">
                  Sin libros en tu libreta
                </div>
                <a
                  href="/libreta"
                  className="btn-load-book-pill"
                >
                  ＋ Cargar libro
                </a>
              </div>
            )}
          </div>
        </div>

        {error && <div className="fee-error fee-error-msg">{error}</div>}

        {/* Desglose de Tarifa de Intercambio (Fee) */}
        <div className="fee-estimate-container">
          <div className="fee-estimate-flex">
            <div>
              <span className="fee-estimate-label">Tarifa estimada de servicio (Fee):</span>
              <div className="fee-estimate-amount">
                ${feeDetails ? Math.round(feeDetails.finalFee).toLocaleString('es-CL') : '3.200'} CLP
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setShowDetail(!showDetail)}
              className="btn-toggle-detail"
            >
              {showDetail ? 'Ocultar cálculo ▲' : 'Ver detalle del cálculo ▼'}
            </button>
          </div>

          {showDetail && feeDetails && (
            <div className="fee-details-list fee-details-expanded">
              <div className="fee-row fee-detail-row">
                <span>Base ponderada del libro:</span>
                <span>${Math.round(feeDetails.baseValue).toLocaleString('es-CL')} CLP</span>
              </div>
              <div className="fee-row fee-detail-row">
                <span>Porcentaje:</span>
                <span>${Math.round(feeDetails.rawFee).toLocaleString('es-CL')} CLP</span>
              </div>
              <div className="fee-row fee-detail-row-final">
                <span>Monto final retención:</span>
                <span>${Math.round(feeDetails.finalFee).toLocaleString('es-CL')} CLP</span>
              </div>
            </div>
          )}
        </div>

        {/* Acciones Principales */}
        <div className="match-actions match-actions-col">
          {userHasBooks ? (
            <button
              type="button"
              className="checkout-proceed-btn font-heading btn-accept-checkout"
              onClick={() => matchTransactionId && onProceedToCheckout(matchTransactionId)}
              disabled={loading || !matchTransactionId}
            >
              Aceptar propuesta e ir al Checkout →
            </button>
          ) : (
            <a
              href="/libreta"
              className="checkout-proceed-btn font-heading btn-load-book-checkout"
            >
              ＋ Cargar un libro a mi libreta primero
            </a>
          )}
          
          <button 
            type="button" 
            className="keep-swiping-btn btn-keep-discovering" 
            onClick={onClose}
          >
            Seguir descubriendo
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
