import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface StepByStepTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSwiping?: () => void;
}

export const StepByStepTutorialModal: React.FC<StepByStepTutorialModalProps> = ({
  isOpen,
  onClose,
  onStartSwiping,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const overlayRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Cada que el usuario avance o retroceda un paso, posicionar el scroll hasta arriba
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = 0;
    }
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [currentStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('tutorial_completed', 'true');
    onClose();
    if (onStartSwiping) {
      onStartSwiping();
    }
  };

  const modalContent = (
    <div
      ref={overlayRef}
      className="modal-overlay tutorial-modal-overlay"
      onClick={onClose}
    >
      <div
        className="tutorial-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con Imagen de Marca home.jpeg */}
        <div className="tutorial-header">
          <div className="tutorial-image-container">
            <img
              src="/home.jpeg"
              alt="Bookmachs Intercambio"
              className="tutorial-hero-img"
            />
            <div className="tutorial-header-overlay">
              <span className="tutorial-badge-step font-heading">
                Paso {currentStep} de {totalSteps}
              </span>
            </div>
          </div>
          <button className="tutorial-close-btn" onClick={onClose} title="Cerrar tutorial">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Pasos del Tutorial */}
        <div ref={bodyRef} className="tutorial-body">
          {/* PASO 1: Selección mediante Swipe */}
          {currentStep === 1 && (
            <div className="tutorial-step-content fade-in">
              <div className="tutorial-icon-heading">
                <i className="fa-solid fa-hand-pointer icon-neon"></i>
                <h2>Paso 1: Elige tus libros con Swipe</h2>
              </div>
              <p className="tutorial-description">
                Explora el catálogo de forma lúdica y rápida usando gestos o botones:
              </p>

              <div className="tutorial-simulation-deck">
                <div className="simulation-card sim-card-left">
                  <div className="sim-badge badge-dislike font-heading">❌ Izquierda</div>
                  <span className="sim-book-title">Libro no deseado</span>
                  <p className="sim-hint">Desliza a la izquierda para descartar</p>
                </div>

                <div className="simulation-card sim-card-right">
                  <div className="sim-badge badge-like font-heading">💚 Derecha</div>
                  <span className="sim-book-title">¡Libro que te gusta!</span>
                  <p className="sim-hint">Desliza a la derecha para seleccionar</p>
                </div>
              </div>

              <div className="tutorial-step-note">
                <i className="fa-solid fa-circle-info icon-neon"></i>
                <span>Gira a la derecha 💚 para guardar libros que quieras intercambiar, o a la izquierda ❌ para pasar al siguiente.</span>
              </div>
            </div>
          )}

          {/* PASO 2: Guardado en Tu Libreta con Flecha Indicativa */}
          {currentStep === 2 && (
            <div className="tutorial-step-content fade-in">
              <div className="tutorial-icon-heading">
                <i className="fa-solid fa-book-bookmark icon-neon"></i>
                <h2>Paso 2: Tus Likes se guardan en tu libreta</h2>
              </div>
              <p className="tutorial-description">
                Todos los libros a los que les diste 💚 se organizan automáticamente en tu libreta personal para cuando estés listo para hacer match.
              </p>

              <div className="tutorial-notebook-arrow-demo">
                <div className="demo-notebook-tab">
                  <i className="fa-solid fa-bookmark icon-neon"></i>
                  <span>"Intercámbialos en tu libreta"</span>
                </div>
                
                <div className="tutorial-arrow-pointing">
                  <i className="fa-solid fa-arrow-down-long arrow-pulsing"></i>
                  <span className="arrow-text font-heading">Tus libros guardados 💚 están aquí</span>
                </div>
              </div>

              <div className="tutorial-step-note">
                <i className="fa-solid fa-circle-check icon-neon"></i>
                <span>Puedes volver a revisar tus gustos y ver propuestas de intercambio en cualquier momento desde la sección <strong>Tu Libreta</strong>.</span>
              </div>
            </div>
          )}

          {/* PASO 3: Propuestas de Match e Intercambio 1 a 1 */}
          {currentStep === 3 && (
            <div className="tutorial-step-content fade-in">
              <div className="tutorial-icon-heading">
                <i className="fa-solid fa-arrows-rotate icon-neon"></i>
                <h2>Paso 3: Propuestas de Match e Intercambio</h2>
              </div>
              <p className="tutorial-description">
                Bookmachs cruza tus libros disponibles con el catálogo de otros lectores para encontrar la coincidencia perfecta.
              </p>

              <div className="tutorial-match-preview-box">
                <div className="match-preview-duet">
                  <div className="match-book-item item-receive">
                    <span className="item-label font-heading">Libro que recibes 📥</span>
                    <span className="item-name">Tu Libro de Interés</span>
                  </div>
                  <div className="match-divider-icon">
                    <i className="fa-solid fa-right-left icon-neon"></i>
                  </div>
                  <div className="match-book-item item-give">
                    <span className="item-label font-heading">Libro que entregas 📤</span>
                    <span className="item-name">Tu Libro de Libreta</span>
                  </div>
                </div>
                <div className="match-fee-tag font-heading">
                  <i className="fa-solid fa-shield-halved icon-gold"></i> Intercambio 1 por 1 + Fee de servicio transparente
                </div>
              </div>

              <div className="tutorial-step-note">
                <i className="fa-solid fa-triangle-exclamation icon-gold"></i>
                <span><strong>Sin compraventa de dinero:</strong> Siempre entregas un libro de tu libreta a cambio del que solicitas.</span>
              </div>
            </div>
          )}

          {/* PASO 4: Logística de Envío y Retiro (Paso Previo) */}
          {currentStep === 4 && (
            <div className="tutorial-step-content fade-in">
              <div className="tutorial-icon-heading">
                <i className="fa-solid fa-truck-fast icon-neon"></i>
                <h2>Paso 4: Elige tu método de entrega</h2>
              </div>
              <p className="tutorial-description">
                Una vez confirmado el match, selecciona una de las 3 opciones autorizadas para enviar o entregar tu libro:
              </p>

              <div className="tutorial-logistics-grid">
                <div className="logistics-mini-card">
                  <div className="logistics-icon">🎁</div>
                  <strong>1. Donación Comunitaria</strong>
                  <p>Dona tu libro en un colegio o espacio comunal y sube tu foto de evidencia para validación.</p>
                </div>

                <div className="logistics-mini-card">
                  <div className="logistics-icon">📍</div>
                  <strong>2. Entrega Presencial</strong>
                  <p>Entrega directamente en la tienda oficial (Patronato 447, Recoleta, Santiago Chile).</p>
                </div>

                <div className="logistics-mini-card">
                  <div className="logistics-icon">📦</div>
                  <strong>3. Envío Encomienda</strong>
                  <p>Despacha por courier a la tienda oficial y adjunta tu comprobante de envío.</p>
                </div>
              </div>

              <div className="tutorial-step-note">
                <i className="fa-solid fa-clock icon-neon"></i>
                <span>Tienes un plazo de 5 días para cumplir con la entrega seleccionada.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Navegación y Botón Final */}
        <div className="tutorial-footer">
          <div className="tutorial-dots-stepper">
            {Array.from({ length: totalSteps }).map((_, idx) => (
              <span
                key={idx}
                className={`stepper-dot ${currentStep === idx + 1 ? 'active' : ''}`}
                onClick={() => setCurrentStep(idx + 1)}
              />
            ))}
          </div>

          <div className="tutorial-actions-row">
            {currentStep > 1 && (
              <button className="tutorial-prev-btn" onClick={handlePrev}>
                <i className="fa-solid fa-arrow-left"></i> Anterior
              </button>
            )}

            {currentStep < totalSteps ? (
              <button className="tutorial-next-btn font-heading" onClick={handleNext}>
                Siguiente <i className="fa-solid fa-arrow-right"></i>
              </button>
            ) : (
              <button
                className="tutorial-finish-btn font-heading"
                onClick={handleComplete}
              >
                Comenzar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
