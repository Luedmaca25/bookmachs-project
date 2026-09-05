import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../authentication/store/authStore';
import { OnboardingWizard } from '../authentication/components/OnboardingWizard';
import { MatchModal } from '../transactions/components/MatchModal';
import { BookCard } from './components/BookCard';
import { StepByStepTutorialModal } from './components/StepByStepTutorialModal';
import { apiClient } from '../../lib/apiClient';

const COUNTRIES_LIST = [
  { name: 'Chile', flag: '/flags/chile.png' },
  { name: 'Argentina', flag: '/flags/argentina.png' },
  { name: 'Perú', flag: '/flags/peru.png' },
  { name: 'México', flag: '/flags/mexico.png' },
  { name: 'Ecuador', flag: '/flags/ecuador.png' },
  { name: 'España', flag: '/flags/espana.png' }
];

interface BookItem {
  id: string;
  title: string;
  author: string;
  condition: string;
  description: string;
  imageUrl: string;
  isInternalStock?: boolean;
  isFallbackCategory?: boolean;
}

export const SwipePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, token, logout } = useAuthStore();
  
  // Control de Onboarding
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Control del Tutorial Paso a Paso (Solo se abre al presionar el botón)
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);



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
        return apiClient.get<BookItem[]>('/books/recommendations?limit=100');
      } else {
        return apiClient.get<BookItem[]>('/books/guest-random?count=10');
      }
    },
    enabled: !isRestoringSession && !showWizard,
    staleTime: 5000, // Evitar refetches inmediatos en transiciones rápidas
  });

  const rawBooks = queryBooks || [];
  const error = queryError ? 'Ocurrió un error al cargar las recomendaciones de libros.' : null;
  const [booksList, setBooksList] = useState<BookItem[]>([]);
  const [currentBookIndex, setCurrentBookIndex] = useState(0);
  const [swipedHistory, setSwipedHistory] = useState<number[]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Control de límites diarios (Fase 6)
  const [limitReached, setLimitReached] = useState(false);

  // Inicializar la lista de libros cuando se recibe la respuesta inicial de React Query
  useEffect(() => {
    if (rawBooks && rawBooks.length > 0) {
      setBooksList(rawBooks);
      setCurrentBookIndex(0);
      setSwipedHistory([]);
    }
  }, [queryBooks]);

  // Cargar automáticamente los siguientes 100 libros cuando el usuario se aproxima al final de la lista actual
  const fetchMoreBooks = async () => {
    if (isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const endpoint = isAuthenticated
        ? '/books/recommendations?limit=100'
        : '/books/guest-random?count=20';
      const newBooks = await apiClient.get<BookItem[]>(endpoint);
      if (newBooks && newBooks.length > 0) {
        setBooksList((prev) => {
          const existingIds = new Set(prev.map((b) => b.id));
          const filteredNew = newBooks.filter((b) => !existingIds.has(b.id));
          return [...prev, ...filteredNew];
        });
      }
    } catch (err) {
      console.error('Error al cargar más recomendaciones de libros:', err);
    } finally {
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    if (
      booksList.length > 0 &&
      currentBookIndex >= booksList.length - 5 &&
      !isFetchingMore &&
      !limitReached
    ) {
      fetchMoreBooks();
    }
  }, [currentBookIndex, booksList.length, isFetchingMore, limitReached]);

  const books = booksList;

  // Estados de animación y arrastre (Drag / Slide Gesture)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragModeRef = useRef<'none' | 'horizontal' | 'vertical'>('none');

  // Control de cuota y contador de swipes persisitido en base de datos
  const [swipesConsumed, setSwipesConsumed] = useState(user?.dailySwipesConsumed ?? 0);
  const [swipeLimit, setSwipeLimit] = useState(user?.dailySwipeLimit ?? (user?.isPremium ? 1000 : 40));

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

  // Control de Match (Fase 7)
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchedBook, setMatchedBook] = useState<BookItem | null>(null);
  const [matchTransactionId, setMatchTransactionId] = useState<string | null>(null);

  // Control de swipes para usuarios invitados (hasta 5 swipes gratis acumulando me gusta)
  const [guestSwipesCount, setGuestSwipesCount] = useState<number>(() => {
    const saved = localStorage.getItem('guest_swipes_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [showGuestLimitModal, setShowGuestLimitModal] = useState<boolean>(false);

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
  };

  const currentBook = books[currentBookIndex];

  // Gestos de arrastre Touch (Móvil) y Mouse (Escritorio)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (limitReached || !currentBook || swipeDirection) return;
    setIsDragging(true);
    dragModeRef.current = 'none';
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setDragOffset({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || dragModeRef.current === 'vertical') return;

    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;

    // Discriminar intención de scroll vertical vs swipe horizontal en los primeros píxeles
    if (dragModeRef.current === 'none') {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      if (absX > 6 || absY > 6) {
        if (absY > absX) {
          // El usuario está haciendo scroll vertical en el teléfono: ignorar swipe horizontal
          dragModeRef.current = 'vertical';
          setDragOffset({ x: 0, y: 0 });
          return;
        } else {
          // El usuario está deslizando la tarjeta horizontalmente
          dragModeRef.current = 'horizontal';
        }
      }
    }

    if (dragModeRef.current === 'horizontal') {
      setDragOffset({ x: deltaX, y: 0 });
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const mode = dragModeRef.current;
    setIsDragging(false);
    dragModeRef.current = 'none';

    if (mode === 'horizontal') {
      if (dragOffset.x > 100) {
        triggerSwipe('right');
      } else if (dragOffset.x < -100) {
        triggerSwipe('left');
      }
    }
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (limitReached || !currentBook || swipeDirection) return;
    setIsDragging(true);
    dragModeRef.current = 'none';
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
    if (dragOffset.x > 100) {
      triggerSwipe('right');
    } else if (dragOffset.x < -100) {
      triggerSwipe('left');
    }
    setDragOffset({ x: 0, y: 0 });
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const handleUndoSwipe = async () => {
    if (currentBookIndex > 0 || swipedHistory.length > 0) {
      let targetIndex = currentBookIndex - 1;
      if (swipedHistory.length > 0) {
        targetIndex = swipedHistory[swipedHistory.length - 1];
        setSwipedHistory((prev) => prev.slice(0, -1));
      }

      const undoneBook = booksList[targetIndex];
      setCurrentBookIndex(Math.max(0, targetIndex));
      setSwipeDirection(null);

      if (isAuthenticated) {
        try {
          interface SwipeStatusResponse {
            swipesConsumed: number;
            swipeLimit: number;
            limitReached: boolean;
          }
          const endpoint = undoneBook ? `/books/${undoneBook.id}/undo-swipe` : '/books/undo-swipe';
          const response = await apiClient.post<SwipeStatusResponse>(endpoint);

          if (response) {
            if (typeof response.swipesConsumed === 'number') {
              setSwipesConsumed(response.swipesConsumed);
            }
            if (typeof response.swipeLimit === 'number') {
              setSwipeLimit(response.swipeLimit);
            }
            setLimitReached(!!response.limitReached);
          }
        } catch (err) {
          console.error('Error al sincronizar deshacer swipe con el servidor:', err);
          if (!user?.isPremium) {
            setSwipesConsumed((prev) => Math.max(0, prev - 1));
          }
          setLimitReached(false);
        }
      } else {
        if (guestSwipesCount > 0) {
          const newCount = guestSwipesCount - 1;
          setGuestSwipesCount(newCount);
          localStorage.setItem('guest_swipes_count', newCount.toString());
        }
        if (undoneBook) {
          try {
            const existingLikesStr = localStorage.getItem('guest_pending_likes');
            if (existingLikesStr) {
              const existingLikes: string[] = JSON.parse(existingLikesStr);
              const updatedLikes = existingLikes.filter((id) => id !== undoneBook.id);
              localStorage.setItem('guest_pending_likes', JSON.stringify(updatedLikes));
            }
          } catch (e) {
            console.error('Error al actualizar me gusta de invitado:', e);
          }
        }
        setLimitReached(false);
      }
    }
  };

  const triggerSwipe = async (direction: 'left' | 'right') => {
    // Si la acción es "like" (derecha) y ya se alcanzó el límite de likes, no permitir más likes
    if (direction === 'right' && limitReached) return;
    if (!currentBook) return;

    // Guardar el índice del libro actual en el historial antes de avanzar
    setSwipedHistory((prev) => [...prev, currentBookIndex]);

    if (!isAuthenticated) {
      const swipedBook = currentBook;
      let newCount = guestSwipesCount;

      // Los invitados solo consumen su cuota de 5 swipes al dar LIKE a la derecha
      if (direction === 'right') {
        if (guestSwipesCount >= 5) {
          setShowGuestLimitModal(true);
          return;
        }
        newCount = guestSwipesCount + 1;
        setGuestSwipesCount(newCount);
        localStorage.setItem('guest_swipes_count', newCount.toString());

        if (swipedBook) {
          try {
            const existingLikesStr = localStorage.getItem('guest_pending_likes');
            const existingLikes: string[] = existingLikesStr ? JSON.parse(existingLikesStr) : [];
            if (!existingLikes.includes(swipedBook.id)) {
              existingLikes.push(swipedBook.id);
              localStorage.setItem('guest_pending_likes', JSON.stringify(existingLikes));
            }
          } catch (e) {
            console.error('Error al guardar me gusta de invitado:', e);
          }
        }
      }

      setSwipeDirection(direction);

      setTimeout(() => {
        setSwipeDirection(null);
        setCurrentBookIndex((prev) => prev + 1);
        if (direction === 'right' && newCount >= 5) {
          setShowGuestLimitModal(true);
        }
      }, 220);

      return;
    }

    const swipedBook = currentBook;

    // 1. Iniciar animación de deslizamiento de forma optimista
    setSwipeDirection(direction);

    // 2. Incrementar el contador local de swipes únicamente al dar "like" (derecha)
    if (direction === 'right' && !user?.isPremium) {
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
      // Validar si el error fue por límite mensual (403 Forbidden o código MonthlyLimitExceeded)
      const isLimitError = err.message && (
        err.message.includes('403') || 
        err.message.includes('DailyLimitExceeded') ||
        err.message.includes('MonthlyLimitExceeded')
      );
      
      if (isLimitError) {
        setLimitReached(true);
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
      {!isAuthenticated ? (
        <div className="guest-hero-container">
          <h1 className="guest-hero-title">
            ¡Intercambio de libros <br />
            <span className="guest-hero-title-highlight">a un Machs!</span>
          </h1>
          <p className="guest-hero-subtitle">
            Más de 100.000 libros para intercambiar, <br />
            actualizados todos los días.
          </p>

          <button
            onClick={() => setIsTutorialOpen(true)}
            className="guest-tutorial-trigger-btn font-heading"
          >
            <i className="fa-solid fa-circle-play icon-neon"></i> Ver cómo funciona
          </button>

          <div className="guest-flags-row">
            {COUNTRIES_LIST.map((country, idx) => (
              <React.Fragment key={country.name}>
                <div className="guest-flag-item">
                  <img src={country.flag} alt={country.name} className="guest-flag-img" />
                  <span>{country.name}</span>
                </div>
                {idx < COUNTRIES_LIST.length - 1 && <span className="guest-flag-dot">&bull;</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="swipe-header">
          <h1 className="guest-hero-title">
            ¡Intercambio de libros <br />
            <span className="guest-hero-title-highlight">a un Machs!</span>
          </h1>
          <div className="user-auth-badge" style={{ gap: '10px' }}>
            <button
              onClick={() => setIsTutorialOpen(true)}
              className="header-tutorial-btn font-heading"
              title="Ver guía paso a paso"
            >
              <i className="fa-solid fa-circle-question icon-neon"></i> ¿Cómo funciona?
            </button>
            <span>
              Hola, <strong>{user?.name}</strong>
            </span>
          </div>
        </div>
      )}

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
                  Swipes restantes este mes: <strong>{Math.max(0, swipeLimit - swipesConsumed)}</strong> / {swipeLimit}
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


          {currentBook && (
            <BookCard
              key={currentBook.id}
              book={currentBook}
              showUndoButton={true}
              canUndo={currentBookIndex > 0 || swipedHistory.length > 0}
              onUndo={handleUndoSwipe}
              className={`${
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
            />
          )}

          <div className="swipe-controls">
            <button 
              className="control-btn dislike-btn" 
              onClick={() => triggerSwipe('left')}
              disabled={!currentBook}
              title="No me interesa (Infinito)"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <button 
              className="control-btn like-btn" 
              onClick={() => triggerSwipe('right')}
              disabled={limitReached}
              title={limitReached ? "Límite de me gusta alcanzado" : "Me interesa"}
            >
              <i className="fa-solid fa-heart"></i>
            </button>
          </div>

          <div 
            onClick={() => {
              if (!isAuthenticated) {
                navigate('/auth');
              } else {
                navigate('/libreta');
              }
            }}
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
              <h3>Límite de swipes alcanzado</h3>
              <p>Has consumido tu cuota de swipes del plan gratuito. Pásate a un plan Premium hoy mismo para continuar explorando sin límites.</p>
              <button className="upsell-trigger-btn font-heading" onClick={() => navigate('/planes')}>
                <i className="fa-solid fa-crown icon-gold"></i> Ver Planes Premium <i className="fa-solid fa-arrow-right-long"></i>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Tutorial Paso a Paso */}
      <StepByStepTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onStartSwiping={() => {
          setIsTutorialOpen(false);
        }}
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

      {showGuestLimitModal && (
        <div className="modal-overlay">
          <div className="modal-card match-modal-card text-center" style={{ maxWidth: '460px', padding: '2.2rem 1.8rem', borderRadius: '20px' }}>
            <div style={{ fontSize: '3.2rem', marginBottom: '0.8rem', color: '#e67e22' }}>
              <i className="fa-solid fa-fire-flame-curved"></i>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '0.8rem', color: '#2c3e50' }}>
              ¡Alcanzaste el límite de 5 swipes como invitado!
            </h2>
            <p style={{ color: '#555', fontSize: '0.95rem', marginBottom: '1.6rem', lineHeight: '1.5' }}>
              Has explorado 5 libros como invitado. Inicia sesión o regístrate en Bookmachs para conservar los libros que te gustaron en tu libreta y recibir propuestas de intercambio.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="pay-fee-btn font-heading" 
                onClick={() => navigate('/auth')}
                style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
              >
                🚀 Registrarme / Iniciar Sesión
              </button>
              <button 
                className="cancel-btn" 
                onClick={() => setShowGuestLimitModal(false)}
                style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
