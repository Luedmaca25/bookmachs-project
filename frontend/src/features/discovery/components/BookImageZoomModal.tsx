import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getFileUrl } from '../../../lib/formatters';

interface BookImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title: string;
  author?: string;
  condition?: string;
  onLike?: () => void;
  onDislike?: () => void;
  isLikeDisabled?: boolean;
}

export const BookImageZoomModal: React.FC<BookImageZoomModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  author,
  condition,
  onLike,
  onDislike,
  isLikeDisabled = false,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialTouchDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);
  const lastTapRef = useRef<number>(0);

  // Reiniciar estado al abrir o cambiar de imagen
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      initialTouchDistanceRef.current = null;
    }
  }, [isOpen, imageUrl]);

  // Manejo de scroll en body y tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(3.5, +(prev + 0.4).toFixed(1)));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(1, +(prev - 0.4).toFixed(1));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Doble clic o doble tap para toggle 1x / 2x
  const handleDoubleTapOrClick = (_clientX?: number, _clientY?: number) => {
    if (scale > 1.05) {
      handleResetZoom();
    } else {
      setScale(2);
      // Centrar hacia el origen inicial
      setPosition({ x: 0, y: 0 });
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const factor = delta > 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = Math.min(3.5, Math.max(1, +(prev + factor).toFixed(2)));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    const maxOffset = (scale - 1) * 220;
    const nextX = e.clientX - dragStartRef.current.x;
    const nextY = e.clientY - dragStartRef.current.y;
    setPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, nextX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, nextY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers (Pinch-to-zoom & pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Dos dedos: inicializar distancia para pinch
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchDistanceRef.current = dist;
      initialScaleRef.current = scale;
    } else if (e.touches.length === 1) {
      // Un dedo: detectar doble tap o iniciar arrastre
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Doble tap detectado
        handleDoubleTapOrClick(e.touches[0].clientX, e.touches[0].clientY);
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
        if (scale > 1) {
          setIsDragging(true);
          dragStartRef.current = {
            x: e.touches[0].clientX - position.x,
            y: e.touches[0].clientY - position.y,
          };
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current) {
      // Pinch to zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialTouchDistanceRef.current;
      const nextScale = Math.min(3.5, Math.max(1, +(initialScaleRef.current * ratio).toFixed(2)));
      setScale(nextScale);
      if (nextScale === 1) setPosition({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Dragging
      const maxOffset = (scale - 1) * 220;
      const nextX = e.touches[0].clientX - dragStartRef.current.x;
      const nextY = e.touches[0].clientY - dragStartRef.current.y;
      setPosition({
        x: Math.max(-maxOffset, Math.min(maxOffset, nextX)),
        y: Math.max(-maxOffset, Math.min(maxOffset, nextY)),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialTouchDistanceRef.current = null;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  if (!isOpen) return null;

  const currentZoomPercent = Math.round(scale * 100);
  const src = imageUrl
    ? getFileUrl(imageUrl)
    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600';

  return createPortal(
    <div
      className="book-zoom-modal-overlay animated-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="zoom-modal-book-title"
    >
      {/* Barra superior con metadatos y botón de cerrar */}
      <div className="book-zoom-modal-header" onClick={(e) => e.stopPropagation()}>
        <div className="zoom-header-meta">
          {/* <div className="zoom-header-badge">
            <i className="fa-solid fa-magnifying-glass"></i>
            <span>Inspección de Portada</span>
          </div> */}
          <h3 id="zoom-modal-book-title" className="zoom-book-title font-heading" title={title}>
            {title}
          </h3>
          <div className="zoom-book-subinfo">
            {author && <span className="zoom-book-author">Autor: <strong>{author}</strong></span>}
            {/* {condition && (
              <span className="zoom-condition-pill">
                <i className="fa-solid fa-check"></i> Estado: {condition}
              </span>
            )} */}
          </div>
        </div>

        <button
          type="button"
          className="zoom-modal-close-btn"
          onClick={onClose}
          title="Cerrar visor (Esc)"
          aria-label="Cerrar visor"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Área central inmersiva de inspección de imagen */}
      <div
        className="book-zoom-stage"
        onClick={(e) => {
          // Si hace clic en el área vacía fuera de la imagen, cerrar
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        onWheel={handleWheel}
      >
        <div
          className={`zoom-image-container ${scale > 1 ? 'is-zoomed' : ''} ${isDragging ? 'is-dragging' : ''}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (scale === 1) {
              handleDoubleTapOrClick(e.clientX, e.clientY);
            }
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={src}
            alt={title}
            className="zoom-image-display"
            draggable={false}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600';
            }}
          />

          {/* Guía de uso discreta al pie de la imagen cuando está a escala 1x */}
          {/* {scale === 1 && (
            <div className="zoom-tap-hint">
              <i className="fa-solid fa-hand-pointer"></i>
              <span>Doble clic / Pellizcar para acercar</span>
            </div>
          )} */}
        </div>
      </div>

      {/* Barra de Controles Inferior */}
      <div className="book-zoom-modal-footer" onClick={(e) => e.stopPropagation()}>
        {/* Controles de Nivel de Zoom */}
        <div className="zoom-controls-toolbar">
          <button
            type="button"
            className="zoom-tool-btn"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title="Alejar (-)"
            aria-label="Alejar imagen"
          >
            <i className="fa-solid fa-minus"></i>
          </button>

          <button
            type="button"
            className="zoom-tool-pill font-heading"
            onClick={handleResetZoom}
            title="Restablecer tamaño (100%)"
          >
            <span>{currentZoomPercent}%</span>
            {scale !== 1 && <span className="reset-label">Restablecer</span>}
          </button>

          <button
            type="button"
            className="zoom-tool-btn"
            onClick={handleZoomIn}
            disabled={scale >= 3.5}
            title="Acercar (+)"
            aria-label="Acercar imagen"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        {/* Acciones directas de decisión rápida (Continuidad de Swipe) */}
        {(onLike || onDislike) && (
          <div className="zoom-quick-actions">
            {onDislike && (
              <button
                type="button"
                className="zoom-action-btn dislike-action"
                onClick={() => {
                  onClose();
                  onDislike();
                }}
                title="Descartar libro y pasar al siguiente"
              >
                <i className="fa-solid fa-xmark"></i>
                <span>Descartar</span>
              </button>
            )}

            {onLike && (
              <button
                type="button"
                className="zoom-action-btn like-action"
                onClick={() => {
                  onClose();
                  onLike();
                }}
                disabled={isLikeDisabled}
                title={isLikeDisabled ? "Límite alcanzado" : "Me interesa este libro"}
              >
                <i className="fa-solid fa-heart"></i>
                <span>Me Interesa</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
