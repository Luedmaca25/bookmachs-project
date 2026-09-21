import React, { useState, useEffect } from 'react';
import { getFileUrl } from '../../../lib/formatters';

export interface BookCardData {
  id: string;
  title: string;
  author: string;
  condition: string;
  description?: string;
  imageUrl?: string;
  baseValue?: number;
  isInternalStock?: boolean;
  createdAt?: string;
  isFallbackCategory?: boolean;
  stockBadgeLabel?: string;
  stockBadgeIcon?: string;
  stockBadgeClass?: string;
  exchangeStatus?: 'Available' | 'InExchange' | 'Exchanged' | 'Reserved' | string;
}

interface BookCardProps {
  book: BookCardData;
  isNewlyArrived?: boolean;
  className?: string;
  style?: React.CSSProperties;
  isDragging?: boolean;
  dragOffset?: { x: number; y: number };
  swipeDirection?: 'left' | 'right' | null;
  onReserve?: (id: string, title: string) => void;
  showReserveButton?: boolean;
  onInterest?: (id: string, title: string) => void;
  showInterestButton?: boolean;
  showUndoButton?: boolean;
  canUndo?: boolean;
  onUndo?: () => void;
  isPremium?: boolean;
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
  isDragging = false,
  dragOffset = { x: 0, y: 0 },
  swipeDirection = null,
  onReserve,
  showReserveButton = false,
  onInterest,
  showInterestButton = true,
  showUndoButton = false,
  canUndo = false,
  onUndo,
  isPremium = false,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Al cambiar de libro, reiniciar el estado de expansión de sinopsis
  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [book.id]);

  const isSwipedRight = className.includes('swiped-right') || swipeDirection === 'right';
  const isSwipedLeft = className.includes('swiped-left') || swipeDirection === 'left';
  const isBlurred = className.includes('blurred-card');

  // Cálculo dinámico de opacidad de los sellos durante el arrastre
  const likeOpacity = isSwipedRight 
    ? 1 
    : isDragging && dragOffset.x > 20 
      ? Math.min(1, (dragOffset.x - 20) / 60) 
      : 0;

  const nopeOpacity = isSwipedLeft 
    ? 1 
    : isDragging && dragOffset.x < -20 
      ? Math.min(1, (Math.abs(dragOffset.x) - 20) / 60) 
      : 0;

  // La card exterior se mantiene fija sin clases de swipe que la muevan o desvanezcan
  const cleanClassName = className.replace(/swiped-right|swiped-left/g, '').trim();
  const containerClassName = `book-swipe-card ${cleanClassName} ${isBlurred ? 'blurred-card' : ''}`;
  const imageSwipeClassName = `swipe-card-img ${isSwipedRight ? 'swiped-right' : ''} ${isSwipedLeft ? 'swiped-left' : ''}`;

  return (
    <div
      className={containerClassName}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {/* Botón de Retroceder al libro anterior (Arriba a la derecha) */}
      {showUndoButton && onUndo && (
        <button
          type="button"
          className={`swipe-undo-btn ${!canUndo ? 'disabled' : ''} ${!isPremium ? 'premium-feature-btn' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (canUndo) onUndo();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          title={
            !canUndo
              ? "No hay libro anterior"
              : !isPremium
              ? "Función Premium: Retroceder al libro anterior"
              : "Retroceder al libro anterior"
          }
          disabled={!canUndo}
        >
          <i className="fa-solid fa-rotate-left"></i>
          {!isPremium && (
            <span className="undo-crown-badge" title="Beneficio Exclusivo Premium">
              <i className="fa-solid fa-crown"></i>
            </span>
          )}
        </button>
      )}

      {isNewlyArrived && (
        <span className="new-arrival-badge">
          <i className="fa-solid fa-star star-gold"></i> Recién Llegado
        </span>
      )}

      <div className="book-card-image-placeholder">
        {/* Sellos dinámicos estilo Tinder circulares (Corazón 💚 / Equis ❌) */}
        <div
          className="swipe-stamp stamp-like"
          style={{
            opacity: likeOpacity,
            transform: `translateY(-50%) scale(${likeOpacity > 0 ? 1 : 0.8})`,
          }}
        >
          <i className="fa-solid fa-heart"></i>
        </div>

        <div
          className="swipe-stamp stamp-nope"
          style={{
            opacity: nopeOpacity,
            transform: `translateY(-50%) scale(${nopeOpacity > 0 ? 1 : 0.8})`,
          }}
        >
          <i className="fa-solid fa-xmark"></i>
        </div>
        {book.imageUrl ? (
          <img
            key={book.id}
            src={getFileUrl(book.imageUrl)}
            alt={book.title}
            className={imageSwipeClassName}
            style={style}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400';
            }}
          />
        ) : (
          <div
            key={book.id}
            className={`book-fallback-icon-wrapper ${imageSwipeClassName}`}
            style={style}
          >
            <span className="book-fallback-icon">
              <i className="fa-solid fa-book"></i>
            </span>
          </div>
        )}
      </div>

      <div className="book-card-floating-wrapper">
        <div className='badges'>
          {/* Etiqueta de referencia de stock */}
          {book.stockBadgeLabel ? (
            <span className={`stock-type-badge ${book.stockBadgeClass || 'internal'}`}>
              <i className={book.stockBadgeIcon || "fa-solid fa-book-bookmark"}></i> {book.stockBadgeLabel}
            </span>
          ) : book.isInternalStock !== false ? (
            <span className="stock-type-badge internal">
              <i className="fa-solid fa-shield-halved"></i> Intercambia libros
            </span>
          ) : (
            <span className="stock-type-badge external">
              <i className="fa-solid fa-user"></i> Externo
            </span>
          )}

          {/* Filas de etiquetas de estado */}
          {book.condition && (
            <span className="stock-type-badge internal">
              <i className="fa-solid fa-check"></i> Estado: {book.condition}
            </span>
          )}
        </div>

        <div className="book-card-info">
          {book.isFallbackCategory && (
            <div className="fallback-category-badge">
              <i className="fa-solid fa-compass"></i> Recomendación de otra sección (Has completado tus preferencias)
            </div>
          )}

          <h3>{book.title || 'Descubre Libros'}</h3>
          <span className="book-author">Autor: {book.author || 'Desconocido'}</span>

          <p className={`book-desc ${isDescriptionExpanded ? 'expanded' : ''}`}>
            {book.description || 'Encuentra tu próximo match.'}
          </p>

          {book.description && book.description.length > 55 && (
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

          {((showInterestButton && onInterest) || (showReserveButton && onReserve)) && (
            <div className="catalog-card-footer">
              <div className="catalog-actions-row">
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
                {showReserveButton && onReserve && (
                  <button
                    type="button"
                    className="catalog-reserve-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReserve(book.id, book.title);
                    }}
                  >
                    Reservar <i className="fa-solid fa-lock"></i>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
