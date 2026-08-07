import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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

  // Estados de animación
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

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

  const triggerSwipe = async (direction: 'left' | 'right') => {
    if (limitReached || !currentBook) return;

    if (!isAuthenticated) {
      // Si es invitado, al interactuar con el libro se le redirige a iniciar sesión
      navigate('/auth');
      return;
    }

    // Activar animación de deslizamiento
    setSwipeDirection(direction);

    try {
      const action = direction === 'right' ? 'like' : 'dislike';
      
      interface SwipeResponse {
        success: boolean;
        swipesConsumed: number;
        swipeLimit: number;
        isMatch: boolean;
        matchTransactionId?: string;
      }

      // Llamada al endpoint de swipe en el backend
      const response = await apiClient.post<SwipeResponse>(`/books/${currentBook.id}/swipe`, { action });

      if (action === 'like' && response.isMatch) {
        setMatchedBook(currentBook);
        setMatchTransactionId(response.matchTransactionId || null);
        setMatchOpen(true);
      }

      // Esperar a que termine la animación (300ms) antes de cambiar de libro
      setTimeout(() => {
        setSwipeDirection(null);
        setCurrentBookIndex((prev) => prev + 1);
      }, 300);

    } catch (err: any) {
      setSwipeDirection(null);
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
            className={`book-swipe-card ${
              swipeDirection === 'right' ? 'swiped-right' : 
              swipeDirection === 'left' ? 'swiped-left' : ''
            } ${limitReached ? 'blurred-card' : ''}`}
          >
            <div className="book-card-image-placeholder">
              {currentBook?.imageUrl ? (
                <div className="book-3d-wrapper">
                  <div className="book-spine"></div>
                  <img src={currentBook.imageUrl} alt={currentBook.title} className="swipe-card-img" />
                </div>
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
              title="Descartar"
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
