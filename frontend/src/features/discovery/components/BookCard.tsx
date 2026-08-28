import React, { useState } from 'react';

export interface BookCardData {
  id: string;
  title: string;
  author: string;
  condition: string;
  description?: string;
  imageUrl?: string;
  baseValue?: number;
  createdAt?: string;
  isFallbackCategory?: boolean;
}

interface BookCardProps {
  book: BookCardData;
  isNewlyArrived?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onReserve?: (id: string, title: string) => void;
  showReserveButton?: boolean;
  onInterest?: (id: string, title: string) => void;
  showInterestButton?: boolean;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  isNewlyArrived,
  className = '',
  style,
  onReserve: _onReserve,
  showReserveButton = false,
  onInterest,
  showInterestButton = true,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  return (
    <div
      className={`book-swipe-card ${className}`}
      style={style}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {isNewlyArrived && (
        <span className="new-arrival-badge">
          <i className="fa-solid fa-star star-gold"></i> Recién Llegado
        </span>
      )}

      <div className="book-card-image-placeholder">
        {book.imageUrl ? (
          <img
            src={book.imageUrl}
            alt={book.title}
            className="swipe-card-img"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400';
            }}
          />
        ) : (
          <span className="book-fallback-icon">
            <i className="fa-solid fa-book"></i>
          </span>
        )}
      </div>

      <div className="book-card-info">
        {book.isFallbackCategory && (
          <div className="fallback-category-badge">
            <i className="fa-solid fa-compass"></i> Recomendación de otra sección (Has completado tus preferencias)
          </div>
        )}

        {book.condition && (
          <span className={`condition-badge ${book.condition.toLowerCase()}`}>
            Estado libro: {book.condition}
          </span>
        )}

        <h3>{book.title || 'Descubre Libros'}</h3>
        <span className="book-author">por {book.author || 'Bookmachs'}</span>

        <p className={`book-desc ${isDescriptionExpanded ? 'expanded' : ''}`}>
          {book.description || 'Encuentra tu próximo match.'}
        </p>

        {book.description && book.description.length > 80 && (
          <button
            type="button"
            className="see-more-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsDescriptionExpanded(!isDescriptionExpanded);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {isDescriptionExpanded ? (
              <>
                Ver menos <i className="fa-solid fa-chevron-up"></i>
              </>
            ) : (
              <>
                Ver más <i className="fa-solid fa-chevron-down"></i>
              </>
            )}
          </button>
        )}

        {(showInterestButton || showReserveButton) && (
          <div className="catalog-card-footer">
            {/* Botón de Reserva Comentado Temporalmente por Solicitud del Usuario */}
            {/* {showReserveButton && onReserve && (
              <button
                type="button"
                className="catalog-reserve-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onReserve(book.id, book.title);
                }}
              >
                Reservar por 48h <i className="fa-solid fa-lock"></i>
              </button>
            )} */}

            {/* Botón Me Interesa (Intercambio / Swipe Like) */}
            {showInterestButton && onInterest && (
              <button
                type="button"
                className="catalog-interest-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onInterest(book.id, book.title);
                }}
              >
                Me Interesa <i className="fa-solid fa-heart"></i>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
