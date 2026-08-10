import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../authentication/store/authStore';
import { OnboardingWizard } from '../authentication/components/OnboardingWizard';
import { UpsellModal } from './components/UpsellModal';
import { MatchModal } from '../transactions/components/MatchModal';
import { apiClient } from '../../lib/apiClient';

interface BookItem {
  id: string;
  title: string;
  author: string;
  condition: string;
  description: string;
  imageUrl: string;
}

export const SwipePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, token, logout } = useAuthStore();
  
  // Control de Onboarding
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const needsOnboarding = isAuthenticated && (
    !user?.pais || 
    !user?.documentoIdentidad || 
    (!user?.preferences || user.preferences.length === 0)
  );

  const showWizard = needsOnboarding && !onboardingCompleted;

  // Si se está restaurando la sesión (tenemos token pero aún no se carga el perfil del usuario),
  // evitamos hacer consultas para no causar llamados duplicados de invitados.
  const isRestoringSession = !!token && !user;

  // React Query para cargar libros según estado de autenticación (deduplica y maneja caché)
  const { data: queryBooks, isLoading: loading, error: queryError } = useQuery<BookItem[]>({
    queryKey: ['books', isAuthenticated],
    queryFn: async () => {
      if (isAuthenticated) {
        return apiClient.get<BookItem[]>('/books/recommendations?limit=20');
      } else {
        const response = await apiClient.get<BookItem>('/books/guest-random');
        return [response];
      }
    },
    enabled: !isRestoringSession && !showWizard,
    staleTime: 5000, // Evitar refetches inmediatos en transiciones rápidas
  });

  const books = queryBooks || [];
  const error = queryError ? 'Ocurrió un error al cargar las recomendaciones de libros.' : null;
  const [currentBookIndex, setCurrentBookIndex] = useState(0);

  // Reiniciar el índice de libro actual cuando cambia la lista de libros cargados
  useEffect(() => {
    setCurrentBookIndex(0);
    setLimitReached(false);
  }, [queryBooks]);

  // Estados de animación y arrastre (Drag / Slide Gesture)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Control de cuota y contador de swipes persisitido en base de datos
  const [swipesConsumed, setSwipesConsumed] = useState(user?.dailySwipesConsumed ?? 0);
  const [swipeLimit, setSwipeLimit] = useState(user?.dailySwipeLimit ?? (user?.isPremium ? 1000 : 100));

  // Cargar estado real de swipes consumidos en el día directamente desde la Base de Datos al entrar
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchSwipeStatus = async () => {
      try {
        interface SwipeStatusResponse {
          swipesConsumed: number;
          swipeLimit: number;
          limitReached: boolean;
        }
        const data = await apiClient.get<SwipeStatusResponse>('/books/swipe-status');
        if (data) {
          setSwipesConsumed(data.swipesConsumed);
          setSwipeLimit(data.swipeLimit);
          if (data.limitReached || data.swipesConsumed >= data.swipeLimit) {
            setLimitReached(true);
            setLimitValue(data.swipeLimit);
          }
        }
      } catch (err) {
        // Fallback a datos del usuario si endpoint devuelve error
        if (user) {
          if (typeof user.dailySwipesConsumed === 'number') {
            setSwipesConsumed(user.dailySwipesConsumed);
          }
          if (typeof user.dailySwipeLimit === 'number') {
            setSwipeLimit(user.dailySwipeLimit);
            if (user.dailySwipesConsumed !== undefined && user.dailySwipesConsumed >= user.dailySwipeLimit) {
              setLimitReached(true);
              setLimitValue(user.dailySwipeLimit);
            }
          }
        }
      }
    };

    fetchSwipeStatus();
  }, [isAuthenticated, user]);

  // Pre-carga preventiva (Preload) de las imágenes de las siguientes tarjetas para eliminar cualquier delay visual
  useEffect(() => {
    if (books && books.length > 0) {
      for (let i = currentBookIndex + 1; i <= currentBookIndex + 3 && i < books.length; i++) {
        if (books[i]?.imageUrl) {
          const img = new Image();
          img.src = books[i].imageUrl;
        }
      }
    }
  }, [books, currentBookIndex]);

  // Control de límites diarios (Fase 6)
  const [limitReached, setLimitReached] = useState(false);
  const [limitValue, setLimitValue] = useState(100);
  const [upsellOpen, setUpsellOpen] = useState(false);

  // Control de Match (Fase 7)
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchedBook, setMatchedBook] = useState<BookItem | null>(null);
  const [matchTransactionId, setMatchTransactionId] = useState<string | null>(null);

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
  };

  const currentBook = books[currentBookIndex];

  // Gestos de arrastre Touch y Mouse
  const handleTouchStart = (e: React.TouchEvent) => {
    if (limitReached || !currentBook || swipeDirection) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setDragOffset({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset.x > 80) {
      triggerSwipe('right');
    } else if (dragOffset.x < -80) {
      triggerSwipe('left');
    }
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (limitReached || !currentBook || swipeDirection) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset.x > 80) {
      triggerSwipe('right');
    } else if (dragOffset.x < -80) {
      triggerSwipe('left');
    }
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const triggerSwipe = async (direction: 'left' | 'right') => {
    if (limitReached || !currentBook) return;

    if (!isAuthenticated) {
      // Si es invitado, al interactuar con el libro se le redirige a iniciar sesión
      navigate('/auth');
      return;
    }

    const swipedBook = currentBook;

    // 1. Iniciar animación de deslizamiento de forma optimista
    setSwipeDirection(direction);

    // 2. Incrementar el contador local de swipes optimistamente para respuesta UI instantánea
    if (!user?.isPremium) {
      setSwipesConsumed((prev) => prev + 1);
    }

    // 3. Programar el cambio de tarjeta al finalizar la animación de salida (220ms)
    setTimeout(() => {
      setSwipeDirection(null);
      setCurrentBookIndex((prev) => prev + 1);
    }, 220);

    // 4. Enviar el registro del swipe al servidor en segundo plano
    try {
      const action = direction === 'right' ? 'like' : 'dislike';
      
      interface SwipeResponse {
        success: boolean;
        swipesConsumed: number;
        swipeLimit: number;
        isMatch: boolean;
        matchTransactionId?: string;
      }

      const response = await apiClient.post<SwipeResponse>(`/books/${swipedBook.id}/swipe`, { action });

      if (response) {
        if (typeof response.swipesConsumed === 'number') {
          setSwipesConsumed(response.swipesConsumed);
        }
        if (typeof response.swipeLimit === 'number') {
          setSwipeLimit(response.swipeLimit);
        }
      }

      if (action === 'like') {
        if (response.isMatch && response.matchTransactionId) {
          setMatchedBook(swipedBook);
          setMatchTransactionId(response.matchTransactionId);
        }
      }
    } catch (err: any) {
      // Validar si el error fue por límite diario (403 Forbidden o código DailyLimitExceeded)
      const isLimitError = err.message && (
        err.message.includes('403') || 
        err.message.includes('DailyLimitExceeded')
      );
      
      if (isLimitError) {
        setLimitReached(true);
        setUpsellOpen(true);
        
        let limit = user?.isPremium ? 1000 : 100;
        try {
          const parsed = JSON.parse(err.message);
          if (parsed && typeof parsed.swipeLimit === 'number') {
            limit = parsed.swipeLimit;
          }
        } catch (e) {
          // No es un JSON válido o no tiene swipeLimit, usamos fallback
        }
        setLimitValue(limit);
      } else {
        console.error('Error al registrar swipe:', err);
      }
    }
  };

  if (showWizard) {
    return (
      <div className="swipe-page-container">
        <div className="swipe-header">
          <h1>Completar Onboarding</h1>
          <div className="user-auth-badge">
            <span>Hola, <strong>{user?.name}</strong></span>
            <button onClick={logout} className="logout-btn">Cerrar Sesión</button>
          </div>
        </div>
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <div className="swipe-page-container">
      <div className="swipe-header">
        <h1>Explorar libros</h1>
        {isAuthenticated ? (
          <div className="user-auth-badge">
            <span>
              Hola, <strong>{user?.name}</strong> 
              {/* ({user?.pais}) */}
            </span>
            {/* <button onClick={logout} className="logout-btn">Cerrar Sesión</button> */}
          </div>
        ) : (
          <p>Mira este libro destacado. Regístrate para ver más recomendaciones afines a tus gustos.</p>
        )}
      </div>

      {/* Contador y Estado del Plan de Swipes */}
      {isAuthenticated && user && (
        <div className="swipe-tracker-bar">
          <div className="tracker-pill">
            <span className="tracker-icon"><i className="fa-solid fa-bolt"></i></span>
            <span className="tracker-label">
              {user.isPremium ? (
                <>Plan Premium &bull; Swipes <strong>Ilimitados</strong> ♾️</>
              ) : (
                <>
                  Swipes restantes hoy: <strong>{Math.max(0, swipeLimit - swipesConsumed)}</strong> / {swipeLimit}
                </>
              )}
            </span>
          </div>
          {!user.isPremium && (
            <Link to="/planes" className="upgrade-pill-btn">
              <i className="fa-solid fa-crown icon-gold"></i> Obtener Ilimitados
            </Link>
          )}
        </div>
      )}

      {loading ? (
        <div className="swipe-loading">Cargando recomendaciones personalizadas...</div>
      ) : error ? (
        <div className="swipe-error-state">{error}</div>
      ) : !currentBook && !limitReached ? (
        <div className="swipe-empty-state">
          <span className="empty-icon"><i className="fa-solid fa-book-open"></i></span>
          <h3>No hay más recomendaciones por ahora</h3>
          <p>Sube más libros a tu libreta o actualiza tus preferencias de lectura para refinar las recomendaciones de la IA.</p>
        </div>
      ) : (
        <div className="swipe-card-wrapper">
          <div 
            key={currentBook?.id || currentBookIndex}
            className={`book-swipe-card ${
              swipeDirection === 'right' ? 'swiped-right' : 
              swipeDirection === 'left' ? 'swiped-left' : ''
            } ${limitReached ? 'blurred-card' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={
              isDragging
                ? {
                    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.08}deg)`,
                    transition: 'none',
                    cursor: 'grabbing',
                    userSelect: 'none'
                  }
                : undefined
            }
          >
            <div className="book-card-image-placeholder">
              {currentBook?.imageUrl ? (
                <img 
                  key={currentBook.id} 
                  src={currentBook.imageUrl} 
                  alt={currentBook.title} 
                  className="swipe-card-img" 
                />
              ) : (
                <span className="book-fallback-icon"><i className="fa-solid fa-book"></i></span>
              )}
              
              {currentBook && (
                <span className={`condition-badge ${currentBook.condition.toLowerCase()}`}>
                  {currentBook.condition}
                </span>
              )}
            </div>
            
            <div className="book-card-info">
              <h3>{currentBook?.title || 'Descubre Libros'}</h3>
              <span className="book-author">{currentBook?.author || 'Bookmachs'}</span>
              <p className="book-desc">{currentBook?.description || 'Encuentra tu próximo match.'}</p>
            </div>
          </div>

          <div className="swipe-controls">
            <button 
              className="control-btn dislike-btn" 
              onClick={() => triggerSwipe('left')}
              disabled={limitReached}
              title="No me interesa"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <button 
              className="control-btn like-btn" 
              onClick={() => triggerSwipe('right')}
              disabled={limitReached}
              title="Me interesa"
            >
              <i className="fa-solid fa-heart"></i>
            </button>
          </div>

          <div 
            onClick={() => navigate('/libreta')}
            className="notebook-banner-card"
          >
            <span className="notebook-banner-icon"><i className="fa-solid fa-book-bookmark icon-neon"></i></span>
            <div className="notebook-banner-body">
              <div className="notebook-banner-title">Intercambiálos en tu libreta</div>
              <div className="notebook-banner-subtitle">Tus likes se guardan automáticamente</div>
            </div>
          </div>

          {limitReached && (
            <div className="card-blur-overlay">
              <span className="lock-icon"><i className="fa-solid fa-lock"></i></span>
              <h3>Límite diario alcanzado</h3>
              <p>Regresa mañana para seguir descubriendo libros o pásate a un plan Premium hoy mismo.</p>
              <button className="upsell-trigger-btn font-heading" onClick={() => setUpsellOpen(true)}>
                Ver Planes Premium <i className="fa-solid fa-bolt"></i>
              </button>
            </div>
          )}
        </div>
      )}

      <UpsellModal
        isOpen={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        limitValue={limitValue}
      />

      <MatchModal
        isOpen={matchOpen}
        onClose={() => setMatchOpen(false)}
        book={matchedBook}
        matchTransactionId={matchTransactionId}
        onProceedToCheckout={(txId) => {
          navigate(`/transacciones?checkout=${txId}`);
          setMatchOpen(false);
        }}
      />
    </div>
  );
};
