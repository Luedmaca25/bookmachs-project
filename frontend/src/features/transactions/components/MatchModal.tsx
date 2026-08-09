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

  return (
    <div className="modal-overlay">
      <div className="modal-card match-modal-card" style={{ maxWidth: '680px', width: '92%', padding: '2rem 1.75rem' }}>
        {/* Insignia de Encabezado Neón */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div 
            style={{ 
              display: 'inline-block',
              background: 'rgba(182, 255, 0, 0.12)', 
              color: 'var(--neon)', 
              border: '1px solid rgba(182, 255, 0, 0.3)',
              padding: '0.35rem 1.25rem',
              borderRadius: '50px',
              fontWeight: 800,
              fontSize: '0.85rem',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '0.6rem',
              boxShadow: '0 0 20px var(--neon-glow)'
            }}
          >
            ✨ ¡Propuesta de Match IA! ✨
          </div>
          
          <h3 style={{ fontSize: '1.35rem', color: '#fff', margin: '0.2rem 0 0.4rem 0' }}>
            Bookmachs quiere intercambiar contigo
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, maxWidth: '480px', margin: '0 auto' }}>
            Nuestra inteligencia artificial analizó la compatibilidad entre tus lecturas deseadas y los libros físicos que tienes disponibles para ofrecer.
          </p>
        </div>

        {/* Advertencia si el usuario no tiene libros cargados */}
        {!userHasBooks && (
          <div style={{ background: 'rgba(255, 183, 3, 0.1)', border: '1px solid #ffb703', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem', color: '#ffb703', fontSize: '0.85rem', lineHeight: 1.4, textAlign: 'left' }}>
            <strong><i className="fa-solid fa-triangle-exclamation"></i> Requisito Obligatorio:</strong> No tienes ningún libro cargado en "Tu libreta" (Tengo para intercambiar). Para aceptar este match, debes subir al menos un libro para ofrecer a cambio.
          </div>
        )}

        {/* DUET SWAP DECK - MOSTRAR LOS 2 LIBROS DEL INTERCAMBIO */}
        <div className="duet-swap-deck" style={{ padding: '1.25rem', margin: '1rem 0' }}>
          {/* Libro Recibido */}
          <div className="swap-book-card target-card">
            <span className="swap-card-tag receive">Libro que recibes</span>
            <div className="swap-cover-frame" style={{ width: '80px', height: '110px' }}>
              {book.imageUrl ? (
                <img src={book.imageUrl} alt={book.title} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.8rem' }}>📖</div>
              )}
            </div>
            <div className="swap-book-title" style={{ fontSize: '0.88rem' }}>{book.title}</div>
            <div className="swap-book-author" style={{ fontSize: '0.78rem' }}>por {book.author}</div>
            <div style={{ marginTop: '0.4rem' }}>
              <span className={`condition-badge ${book.condition.toLowerCase()}`}>
                {book.condition}
              </span>
            </div>
          </div>

          {/* Centro: Puente de Intercambio */}
          <div className="swap-bridge-center">
            <div className="swap-pulse-badge" style={{ width: '42px', height: '42px', fontSize: '1.1rem' }}>
              <i className="fa-solid fa-arrows-rotate"></i>
            </div>
            <span className="swap-match-ratio" style={{ fontSize: '0.65rem' }}>IA Validado</span>
          </div>

          {/* Libro Entregado */}
          <div className="swap-book-card offered-card">
            <span className="swap-card-tag give">Libro que tú entregas</span>
            
            {userHasBooks ? (
              <div>
                {myBooks.length > 1 && (
                  <div style={{ marginBottom: '0.4rem' }}>
                    <select 
                      value={selectedOfferedBookId} 
                      onChange={(e) => setSelectedOfferedBookId(e.target.value)}
                      style={{ width: '100%', padding: '0.35rem', background: '#000', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.78rem' }}
                    >
                      {myBooks.map((b) => (
                        <option key={b.id} value={b.id}>{b.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                {currentOfferedBook && (
                  <div>
                    <div className="swap-cover-frame" style={{ width: '80px', height: '110px' }}>
                      <img 
                        src={currentOfferedBook.imageUrl} 
                        alt={currentOfferedBook.title}
                        onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150'; }} 
                      />
                    </div>
                    <div className="swap-book-title" style={{ fontSize: '0.88rem' }}>{currentOfferedBook.title}</div>
                    <div className="swap-book-author" style={{ fontSize: '0.78rem' }}>por {currentOfferedBook.author}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '0.75rem 0', textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: '#ffb703', marginBottom: '0.5rem' }}>
                  Sin libros en tu libreta
                </div>
                <a
                  href="/libreta"
                  style={{ display: 'inline-block', background: '#ffb703', color: '#000', padding: '0.4rem 0.8rem', borderRadius: '50px', fontWeight: 800, fontSize: '0.75rem', textDecoration: 'none' }}
                >
                  ＋ Cargar libro
                </a>
              </div>
            )}
          </div>
        </div>

        {error && <div className="fee-error" style={{ color: '#ff4d4d', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>}

        {/* Desglose de Tarifa de Intercambio (Fee) */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)', margin: '1rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tarifa estimada de servicio (Fee):</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--neon)' }}>
                ${feeDetails ? feeDetails.finalFee.toLocaleString() : '3.200'} CLP
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setShowDetail(!showDetail)}
              style={{ background: 'transparent', border: 'none', color: 'var(--neon)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
            >
              {showDetail ? 'Ocultar cálculo ▲' : 'Ver detalle del cálculo ▼'}
            </button>
          </div>

          {showDetail && feeDetails && (
            <div className="fee-details-list" style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.82rem' }}>
              <div className="fee-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span>Base ponderada del libro:</span>
                <span>${feeDetails.baseValue.toLocaleString()} CLP</span>
              </div>
              <div className="fee-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <span>Porcentaje regla IA ({Math.round(feeDetails.feePercentage * 100)}%):</span>
                <span>${feeDetails.rawFee.toLocaleString()} CLP</span>
              </div>
              <div className="fee-row" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--neon)' }}>
                <span>Monto final retención:</span>
                <span>${feeDetails.finalFee.toLocaleString()} CLP</span>
              </div>
            </div>
          )}

          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <i className="fa-solid fa-circle-info" style={{ color: 'var(--neon)' }}></i>
            <span><strong>Regla de negocio:</strong> Los libros nunca se compran con dinero. Das a cambio un libro de tu libreta.</span>
          </div>
        </div>

        {/* Acciones Principales */}
        <div className="match-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
          {userHasBooks ? (
            <button
              type="button"
              className="checkout-proceed-btn font-heading"
              onClick={() => matchTransactionId && onProceedToCheckout(matchTransactionId)}
              disabled={loading || !matchTransactionId}
              style={{ 
                background: 'var(--neon)', 
                color: '#000000', 
                fontWeight: 800, 
                padding: '0.95rem', 
                fontSize: '1rem', 
                borderRadius: '50px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 0 25px var(--neon-glow)'
              }}
            >
              Aceptar propuesta e ir al Checkout →
            </button>
          ) : (
            <a
              href="/libreta"
              className="checkout-proceed-btn font-heading"
              style={{ 
                background: '#ffb703', 
                color: '#000000', 
                fontWeight: 800, 
                padding: '0.95rem', 
                fontSize: '0.95rem', 
                textAlign: 'center', 
                textDecoration: 'none', 
                display: 'block',
                borderRadius: '50px' 
              }}
            >
              ＋ Cargar un libro a mi libreta primero
            </a>
          )}
          
          <button 
            type="button" 
            className="keep-swiping-btn" 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-secondary)',
              padding: '0.75rem',
              borderRadius: '50px',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Seguir descubriendo
          </button>
        </div>
      </div>
    </div>
  );
};
