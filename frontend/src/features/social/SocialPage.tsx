import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../authentication/store/authStore';
import { apiClient } from '../../lib/apiClient';
import { HardGateModal } from '../authentication/components/HardGateModal';

interface UserImpactMetrics {
  userBooksExchanged: number;
  userBooksDonated: number;
  userTotalBooks: number;
  userCo2AvoidedKg: number;
  userEquivalentTrees: number;
  communityTotalBooks: number;
  communityCo2AvoidedKg: number;
  communityEquivalentTrees: number;
}

interface GlobalExchangeHistoryItem {
  id: string;
  requesterName: string;
  ownerName: string;
  bookTitle: string;
  bookAuthor: string;
  bookImageUrl: string;
  logisticsMethod: string;
  reviewComment?: string;
  reviewRating?: number;
  completedAt: string;
}

export const SocialPage: React.FC = () => {
  const { user, isAuthenticated, login } = useAuthStore();
  const [metrics, setMetrics] = useState<UserImpactMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Estados de Historial Global (Tarea 40)
  const [history, setHistory] = useState<GlobalExchangeHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Estados de Modal de Reseñas y Notas (Tarea 42)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedBookTitle, setSelectedBookTitle] = useState<string>('');
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Cargar datos del perfil y de impacto ambiental
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Sincronizar el perfil actual del usuario para tener los datos más recientes
      const latestProfile = await apiClient.get<any>('/auth/me');
      const token = localStorage.getItem('token') || '';
      login(latestProfile, token);

      // 2. Obtener las métricas de impacto ambiental
      const result = await apiClient.get<UserImpactMetrics>('/social/my-impact');
      setMetrics(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Error al cargar las métricas de impacto.');
      } else {
        setError('Ocurrió un error inesperado al cargar las métricas.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar historial global sin restricciones (Tarea 40)
  const loadHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const result = await apiClient.get<GlobalExchangeHistoryItem[]>('/social/history');
      setHistory(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setHistoryError(err.message || 'Error al cargar el historial de intercambios.');
      } else {
        setHistoryError('Error inesperado al cargar el historial.');
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setMetrics(null);
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthModalOpen(false);
    loadData();
    loadHistory();
  };

  const handleOpenReviewModal = (eventId: string, bookTitle: string) => {
    setSelectedEventId(eventId);
    setSelectedBookTitle(bookTitle);
    setRatingInput(5);
    setCommentInput('');
    setReviewError(null);
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    setSubmittingReview(true);
    setReviewError(null);

    try {
      await apiClient.post(`/social/timeline/${selectedEventId}/review`, {
        comment: commentInput,
        rating: ratingInput
      });
      setIsReviewModalOpen(false);
      loadHistory(); // Recargar timeline para ver la nueva reseña
    } catch (err: unknown) {
      if (err instanceof Error) {
        setReviewError(err.message || 'Error al guardar la reseña.');
      } else {
        setReviewError('Ocurrió un error inesperado al procesar la reseña.');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  // Función para renderizar los árboles SVG del bosque virtual del usuario
  const renderVirtualForest = (treesCount: number) => {
    if (treesCount <= 0) {
      return (
        <div className="forest-empty-state">
          <div className="seedling-wrapper">
            <svg viewBox="0 0 100 100" className="animated-seedling-svg">
              <path d="M50,90 C50,90 50,60 50,50 C50,40 35,35 30,40 C25,45 35,55 50,55" fill="none" stroke="#a7c957" strokeWidth="4" strokeLinecap="round" />
              <path d="M50,50 C50,50 65,40 70,45 C75,50 65,60 50,60" fill="#6a994e" />
              <path d="M50,90 L50,45" fill="none" stroke="#6f4e37" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="50" cy="90" rx="20" ry="5" fill="#38220f" />
            </svg>
          </div>
          <p className="forest-empty-text">¡Tu bosque personal está vacío!</p>
          <small className="forest-empty-subtext">Realiza tu primer intercambio o donación de libros para plantar tu primer árbol virtual.</small>
        </div>
      );
    }

    const treesToRender = Math.min(Math.ceil(treesCount), 12);
    const hasMore = Math.ceil(treesCount) > 12;

    return (
      <div className="forest-grid-container">
        <div className="forest-grid">
          {Array.from({ length: treesToRender }).map((_, idx) => (
            <div key={idx} className="virtual-tree-card" title={`Árbol virtual #${idx + 1} - Aporta a la reforestación`}>
              <svg viewBox="0 0 100 120" className="svg-tree">
                {/* Tronco */}
                <path d="M48 110 L52 110 L52 75 L48 75 Z" fill="#582f0e" />
                {/* Hojas traseras */}
                <path d="M50 20 L25 75 L75 75 Z" fill="#386641" />
                {/* Capa media hojas */}
                <path d="M50 35 L30 80 L70 80 Z" fill="#6a994e" />
                {/* Capa superior hojas */}
                <path d="M50 50 L35 85 L65 85 Z" fill="#a7c957" />
                {/* Suelo */}
                <ellipse cx="50" cy="110" rx="22" ry="5" fill="#386641" opacity="0.3" />
              </svg>
              <span className="tree-label">Pino #{idx + 1}</span>
            </div>
          ))}
          {hasMore && (
            <div className="virtual-tree-more-card">
              <span className="more-count">+{Math.ceil(treesCount) - 12}</span>
              <span className="more-label">Árboles más</span>
            </div>
          )}
        </div>
        <p className="forest-congrats-text">
          🌳 Has cultivado <strong>{treesCount}</strong> {treesCount === 1 ? 'árbol' : 'árboles'} en tu bosque Bookmachs. ¡Sigue así!
        </p>
      </div>
    );
  };

  // Función para renderizar la sección de historial global
  const renderHistorySection = () => {
    return (
      <div className="global-history-section">
        <h2>Historial de Intercambios Recientes 🕒</h2>
        <p className="history-subtitle">Conoce los últimos libros que han encontrado un nuevo hogar en nuestra red.</p>
        
        {loadingHistory ? (
          <div className="history-loading">
            <div className="history-mini-spinner"></div>
            <span>Cargando transacciones recientes...</span>
          </div>
        ) : historyError ? (
          <div className="history-error">
            <p>⚠️ {historyError}</p>
            <button onClick={loadHistory} className="history-retry-btn">Reintentar</button>
          </div>
        ) : history.length === 0 ? (
          <div className="history-empty">
            <span className="history-empty-icon">📖</span>
            <p>Aún no se registran transacciones de intercambio completadas.</p>
            <small>¡Sé el primero en iniciar un intercambio de libros!</small>
          </div>
        ) : (
          <div className="history-timeline-list">
            {history.map((item) => {
              // Obtener emoji o icono de método de logística
              let methodEmoji = '📦';
              let methodLabel = item.logisticsMethod;
              if (item.logisticsMethod.toLowerCase() === 'presencial') {
                methodEmoji = '🤝';
                methodLabel = 'Entrega Presencial';
              } else if (item.logisticsMethod.toLowerCase() === 'bodega') {
                methodEmoji = '🏢';
                methodLabel = 'Envío a Bodega';
              } else if (item.logisticsMethod.toLowerCase() === 'p2p') {
                methodEmoji = '📮';
                methodLabel = 'Envío Directo P2P';
              } else if (item.logisticsMethod.toLowerCase() === 'donacion') {
                methodEmoji = '🎁';
                methodLabel = 'Donación';
              }

              // Formatear fecha
              const dateObj = new Date(item.completedAt);
              const formattedDate = dateObj.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });

              // Verificar si el usuario autenticado es participante
              const isParticipant = isAuthenticated && user && (
                item.requesterName.trim().toLowerCase() === user.name.trim().toLowerCase() ||
                item.ownerName.trim().toLowerCase() === user.name.trim().toLowerCase()
              );

              return (
                <div key={item.id} className="history-timeline-item">
                  <div className="timeline-book-cover">
                    {item.bookImageUrl ? (
                      <img src={item.bookImageUrl} alt={item.bookTitle} onError={(e) => {
                        (e.target as HTMLImageElement).src = ''; // Ocultar para mostrar fallback
                      }} />
                    ) : (
                      <div className="timeline-book-placeholder">📖</div>
                    )}
                  </div>
                  <div className="timeline-item-content">
                    <div className="timeline-item-header">
                      <span className="timeline-user-badge requester">{item.requesterName}</span>
                      <span className="timeline-connector">recibió un libro de</span>
                      <span className="timeline-user-badge owner">{item.ownerName}</span>
                    </div>
                    <div className="timeline-book-details">
                      <strong className="timeline-book-title">{item.bookTitle}</strong>
                      <span className="timeline-book-author">de {item.bookAuthor}</span>
                    </div>

                    {/* Mostrar calificación y comentario si existe (Tarea 42) */}
                    {item.reviewComment && (
                      <div className="timeline-item-review">
                        <div className="review-stars" title={`Calificación: ${item.reviewRating} estrellas`}>
                          {'★'.repeat(item.reviewRating || 0)}{'☆'.repeat(5 - (item.reviewRating || 0))}
                        </div>
                        <p className="review-comment">"{item.reviewComment}"</p>
                      </div>
                    )}

                    <div className="timeline-item-footer">
                      <div className="footer-left-badges">
                        <span className="timeline-logistics-badge">
                          {methodEmoji} {methodLabel}
                        </span>
                        
                        {/* Botón para añadir reseña si es participante y no se ha calificado (Tarea 42) */}
                        {isParticipant && !item.reviewComment && (
                          <button 
                            className="timeline-review-action-btn"
                            onClick={() => handleOpenReviewModal(item.id, item.bookTitle)}
                          >
                            ✍️ Calificar Entrega
                          </button>
                        )}
                      </div>
                      
                      <span className="timeline-date">⏱️ {formattedDate}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // VISTA INVITADO (NO AUTENTICADO)
  if (!isAuthenticated) {
    return (
      <div className="social-guest-container">
        <div className="guest-hero-card">
          <div className="guest-badge-env">🍃 RED CULTURAL ECO-AMIGABLE</div>
          <h1>Únete al Impacto Colectivo</h1>
          <p className="guest-description">
            En Bookmachs cada libro intercambiado o donado disminuye la huella de carbono, evita la tala de árboles
            y fomenta la economía circular de la lectura. Registra tu cuenta para ver tu aporte personal.
          </p>
          <button className="guest-action-btn" onClick={() => setIsAuthModalOpen(true)}>
            Crear mi Cuenta de Impacto 🚀
          </button>
        </div>

        {/* Sección Informativa de Equivalencias de Impacto */}
        <div className="impact-info-section">
          <h2>¿Cómo se calcula el impacto ambiental?</h2>
          <p className="impact-info-subtitle">Calculamos de forma transparente bajo estándares físicos avalados:</p>
          
          <div className="info-grid">
            <div className="info-card">
              <span className="info-icon">📚</span>
              <h3>Peso del Libro</h3>
              <p>Consideramos un peso estándar promedio de <strong>400 gramos</strong> por cada libro físico rescatado.</p>
            </div>
            <div className="info-card">
              <span className="info-icon">🍃</span>
              <h3>Emisiones CO₂</h3>
              <p>Reutilizar papel evita emitir <strong>2.71 kg de CO₂</strong> por cada kilogramo de papel que no debe ser producido de cero.</p>
            </div>
            <div className="info-card">
              <span className="info-icon">🌲</span>
              <h3>Absorción de Árboles</h3>
              <p>Un árbol maduro saludable absorbe aproximadamente <strong>22 kg de CO₂</strong> al año de la atmósfera.</p>
            </div>
          </div>
        </div>

        {/* Historial de Intercambios Global sin restricciones (Tarea 40) */}
        {renderHistorySection()}

        <HardGateModal isOpen={isAuthModalOpen} onSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // PANTALLA CARGANDO
  if (loading) {
    return (
      <div className="social-loading-container">
        <div className="social-spinner"></div>
        <p>Cargando tus métricas de impacto ecológico...</p>
      </div>
    );
  }

  // PANTALLA ERROR
  if (error) {
    return (
      <div className="social-error-container">
        <div className="error-card">
          <h2>⚠️ Error de Carga</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={loadData}>Reintentar</button>
        </div>
      </div>
    );
  }

  // VISTA AUTENTICADO EXITOSA
  return (
    <div className="social-dashboard-container">
      {/* 1. Header / Perfil del Usuario */}
      {user && (
        <div className="profile-header-card">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-gradient">
              <span className="avatar-initials">
                {user.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
              </span>
            </div>
          </div>
          <div className="profile-details-wrapper">
            <div className="profile-name-row">
              <h1>{user.name}</h1>
              <span className={`subscription-badge ${user.isPremium ? 'premium' : 'free'}`}>
                {user.isPremium ? '🏆 Premium' : '⭐ Plan Básico'}
              </span>
            </div>
            <p className="profile-email">✉️ {user.email}</p>
            <p className="profile-meta">
              📍 {user.pais} &bull; 🪪 {user.documentoIdentidad || 'Sin documento de identidad'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Estadísticas de Impacto del Usuario (Grilla) */}
      {metrics && (
        <>
          <div className="metrics-section-title">
            <h2>Mi Huella Ecológica Colectiva 🍃</h2>
            <p>Monitoreo en tiempo real de tu aporte ambiental al dar segundas oportunidades a los libros.</p>
          </div>

          <div className="metrics-grid">
            {/* Tarjeta 1: Libros Salvados */}
            <div className="metric-impact-card">
              <div className="card-glow" style={{ background: 'rgba(255, 209, 102, 0.15)' }}></div>
              <span className="card-emoji">📚</span>
              <span className="card-metric-value">{metrics.userTotalBooks}</span>
              <h3 className="card-metric-title">Libros Rescatados</h3>
              <p className="card-metric-desc">Suma total de libros físicos que salvaste.</p>
              <div className="metric-breakdown">
                <span>🔄 Excl. Intercambios: <strong>{metrics.userBooksExchanged}</strong></span>
                <span>🎁 Donados: <strong>{metrics.userBooksDonated}</strong></span>
              </div>
            </div>

            {/* Tarjeta 2: CO2 Evitado */}
            <div className="metric-impact-card">
              <div className="card-glow" style={{ background: 'rgba(6, 214, 160, 0.15)' }}></div>
              <span className="card-emoji">🍃</span>
              <span className="card-metric-value">{metrics.userCo2AvoidedKg} <small>kg</small></span>
              <h3 className="card-metric-title">Huella de CO₂ Evitada</h3>
              <p className="card-metric-desc">Emisiones que no ingresaron a la atmósfera.</p>
              <div className="metric-extra">
                <span>⚡ Equivalente a salvar {Math.round(metrics.userTotalBooks * 0.4 * 10) / 10} kg de papel</span>
              </div>
            </div>

            {/* Tarjeta 3: Árboles Equivalentes */}
            <div className="metric-impact-card">
              <div className="card-glow" style={{ background: 'rgba(27, 154, 170, 0.15)' }}></div>
              <span className="card-emoji">🌲</span>
              <span className="card-metric-value">{metrics.userEquivalentTrees}</span>
              <h3 className="card-metric-title">Bosque Personal</h3>
              <p className="card-metric-desc">Árboles maduros salvados en base anual.</p>
              <div className="metric-extra">
                <span>🌱 {metrics.userEquivalentTrees >= 1 ? '¡Tu bosque está floreciendo!' : 'Sembrando el mañana.'}</span>
              </div>
            </div>
          </div>

          {/* 3. Bosque Virtual y Gráficos */}
          <div className="visual-dashboard-grid">
            {/* Lado izquierdo: Bosque Virtual */}
            <div className="dashboard-subcard virtual-forest-card">
              <h3>El Bosque Virtual de {user?.name?.split(' ')[0]}</h3>
              <p className="subcard-desc">Tus árboles acumulados cobran vida en este vivero ecológico interactivo.</p>
              {renderVirtualForest(metrics.userEquivalentTrees)}
            </div>

            {/* Lado derecho: Progreso y Comparativa con Comunidad */}
            <div className="dashboard-subcard community-relation-card">
              <h3>Tu Aporte a la Comunidad</h3>
              <p className="subcard-desc">Visualiza cuánto representa tu huella respecto al total de la red.</p>
              
              <div className="comparison-gauge-wrapper">
                {/* SVG Progress Ring */}
                <div className="progress-ring-container">
                  {(() => {
                    const percent = metrics.communityTotalBooks > 0 
                      ? Math.round((metrics.userTotalBooks / metrics.communityTotalBooks) * 1000) / 10 
                      : 0;
                    
                    // Cálculo de strokeDashoffset para un círculo de radio 40 (circunferencia = 251.2)
                    const radius = 40;
                    const strokeDash = 2 * Math.PI * radius;
                    const strokeOffset = strokeDash - (Math.min(percent, 100) / 100) * strokeDash;

                    return (
                      <>
                        <svg className="progress-ring-svg" viewBox="0 0 100 100">
                          <circle className="progress-ring-bg" cx="50" cy="50" r={radius} />
                          <circle 
                            className="progress-ring-fill" 
                            cx="50" 
                            cy="50" 
                            r={radius} 
                            strokeDasharray={strokeDash}
                            strokeDashoffset={strokeOffset}
                          />
                        </svg>
                        <div className="progress-ring-content">
                          <span className="percent-number">{percent}%</span>
                          <span className="percent-text">del total</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="community-stat-breakdown">
                <div className="comm-bar-row">
                  <div className="comm-bar-labels">
                    <span>Libros Rescatados (Tú vs Red)</span>
                    <span>{metrics.userTotalBooks} de {metrics.communityTotalBooks}</span>
                  </div>
                  <div className="comm-bar-track">
                    <div 
                      className="comm-bar-fill" 
                      style={{ 
                        width: `${metrics.communityTotalBooks > 0 ? Math.min((metrics.userTotalBooks / metrics.communityTotalBooks) * 100, 100) : 0}%`,
                        background: 'var(--gradient-primary)'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="comm-bar-row">
                  <div className="comm-bar-labels">
                    <span>CO₂ Evitado en Red (Tú vs Red)</span>
                    <span>{metrics.userCo2AvoidedKg} de {metrics.communityCo2AvoidedKg} kg</span>
                  </div>
                  <div className="comm-bar-track">
                    <div 
                      className="comm-bar-fill" 
                      style={{ 
                        width: `${metrics.communityCo2AvoidedKg > 0 ? Math.min((metrics.userCo2AvoidedKg / metrics.communityCo2AvoidedKg) * 100, 100) : 0}%`,
                        background: 'linear-gradient(90deg, #06d6a0 0%, #1b9aaa 100%)'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Banner Global de Impacto de la Comunidad */}
          <div className="community-global-impact-card">
            <div className="community-glow"></div>
            <div className="community-impact-header">
              <h2>🌎 El Aporte Global de Bookmachs</h2>
              <p>Métricas consolidadas de la comunidad total de lectores ecológicos en la plataforma.</p>
            </div>
            <div className="community-stats-row">
              <div className="comm-stat-box">
                <span className="comm-stat-icon">📚</span>
                <span className="comm-stat-number">{metrics.communityTotalBooks}</span>
                <span className="comm-stat-title">Libros Circulados</span>
              </div>
              <div className="comm-stat-box">
                <span className="comm-stat-icon">🍃</span>
                <span className="comm-stat-number">{metrics.communityCo2AvoidedKg} <small>kg</small></span>
                <span className="comm-stat-title">Emisiones CO₂ Salvadas</span>
              </div>
              <div className="comm-stat-box">
                <span className="comm-stat-icon">🌲</span>
                <span className="comm-stat-number">{metrics.communityEquivalentTrees}</span>
                <span className="comm-stat-title">Bosque Comunitario (Árboles)</span>
              </div>
            </div>
          </div>

          {/* Historial de Intercambios Global sin restricciones (Tarea 40) */}
          {renderHistorySection()}
        </>
      )}

      {/* Modal para ingresar Calificación y Reseña (Tarea 42) */}
      {isReviewModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>✍️ Escribir Reseña / Nota</h2>
              <p>Valora tu experiencia con el libro <strong>"{selectedBookTitle}"</strong></p>
            </div>
            
            {reviewError && <div className="modal-error">{reviewError}</div>}
            
            <form onSubmit={handleSubmitReview} className="modal-form">
              <div className="modal-field">
                <label>Calificación</label>
                <div className="rating-stars-input">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`star-btn ${val <= ratingInput ? 'selected' : ''}`}
                      onClick={() => setRatingInput(val)}
                      title={`Calificar con ${val} estrellas`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-field">
                <label>Tu Reseña / Comentario sobre la Entrega</label>
                <textarea
                  className="modal-textarea"
                  rows={4}
                  placeholder="Describe cómo estuvo el intercambio, la entrega y el estado del libro..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  maxLength={500}
                  required
                />
              </div>

              <div className="modal-actions-row">
                <button 
                  type="button" 
                  className="modal-cancel-btn" 
                  onClick={() => setIsReviewModalOpen(false)}
                  disabled={submittingReview}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="modal-submit-btn" 
                  disabled={submittingReview}
                >
                  {submittingReview ? 'Guardando...' : 'Guardar Reseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
