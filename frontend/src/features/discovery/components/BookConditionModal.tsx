import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface BookConditionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCondition?: string;
}

interface ConditionInfo {
  title: string;
  badgeClass: string;
  icon: string;
  description: string;
}

const CONDITIONS_DATA: ConditionInfo[] = [
  {
    title: 'Nuevo',
    badgeClass: 'condition-badge-nuevo',
    icon: 'fa-solid fa-sparkles',
    description: 'Sellado o no presenta signo de uso.',
  },
  {
    title: 'Muy Bueno',
    badgeClass: 'condition-badge-muy-bueno',
    icon: 'fa-solid fa-star',
    description:
      'Portada y contraportada en excelente estado. Encuadernación y páginas no están arrugadas, puede contener algunas rayas.',
  },
  {
    title: 'Bueno',
    badgeClass: 'condition-badge-bueno',
    icon: 'fa-solid fa-thumbs-up',
    description:
      'Portada y contraportada en buen estado, pueden tener rayas y marcas de desgaste. Algunas páginas pueden estar dobladas, contener marcas que no afecten la lectura. Puede contener destacadores o subrayados, manchas menores de humedad que no afecten la lectura, estructura o manipulación, desgastados o con detalles estéticos.',
  },
  {
    title: 'Normal',
    badgeClass: 'condition-badge-normal',
    icon: 'fa-solid fa-book-open',
    description:
      'Portada, contraportada y/o páginas con dobles. Puede contener rayas, sin afectar su lectura.',
  },
  {
    title: 'Reliquias',
    badgeClass: 'condition-badge-reliquias',
    icon: 'fa-solid fa-gem',
    description:
      'Portada y contraportada en buen estado, pueden tener algunas marcas de desgaste. Algunas páginas pueden estar dobladas, contener marcas que no afecten la lectura, son libros que tienen al menos 20 años, siendo unas verdaderas joyas de libros.',
  },
];

export const BookConditionModal: React.FC<BookConditionModalProps> = ({
  isOpen,
  onClose,
  currentCondition,
}) => {
  // Cerrar al presionar tecla Escape y bloquear scroll del body
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedCurrent = currentCondition ? currentCondition.trim().toLowerCase() : '';

  const modalContent = (
    <div className="guest-limit-modal-overlay" onClick={onClose}>
      <div
        className="guest-limit-modal-card book-condition-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón flotante para cerrar */}
        <button
          className="guest-limit-close-btn"
          onClick={onClose}
          title="Cerrar modal"
          aria-label="Cerrar modal"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="guest-limit-modal-body book-condition-modal-body">
          <h2 className="guest-limit-title font-heading">
            Guía de Estados de Libros
          </h2>

          <p className="guest-limit-description">
            Conoce los criterios de clasificación física aplicados para evaluar la condición de cada ejemplar en <strong>Intercambialibros</strong>.
          </p>

          <div className="book-condition-guide-list">
            {CONDITIONS_DATA.map((cond) => {
              const condLower = cond.title.toLowerCase();
              const isCurrent =
                normalizedCurrent &&
                (normalizedCurrent === condLower ||
                  (cond.title === 'Muy Bueno' && normalizedCurrent === 'excelente') ||
                  (cond.title === 'Bueno' && normalizedCurrent === 'aceptable') ||
                  (cond.title === 'Normal' && normalizedCurrent === 'desgastado'));

              return (
                <div
                  key={cond.title}
                  className={`book-condition-guide-card ${isCurrent ? 'is-current' : ''}`.trim()}
                >
                  <div className="book-condition-guide-header">
                    <div className="book-condition-guide-title-row">
                      <span className="book-condition-pill-tag font-heading">
                        {cond.title}
                      </span>
                    </div>
                  </div>

                  <p className="book-condition-guide-desc">
                    {cond.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="guest-limit-actions" style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className="guest-limit-btn-primary font-heading"
              onClick={onClose}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
