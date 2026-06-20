import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../authentication/store/authStore';
import { HardGateModal } from '../authentication/components/HardGateModal';
import { OnboardingWizard } from '../authentication/components/OnboardingWizard';
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
  const { user, isAuthenticated, logout } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  
  // Lista de libros recomendados
  const [books, setBooks] = useState<BookItem[]>([]);
  const [currentBookIndex, setCurrentBookIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de animación
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Control de límites diarios (se implementará en la Tarea 25)

  // Control de Onboarding
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  const needsOnboarding = isAuthenticated && (
    !user?.pais || 
    !user?.documentoIdentidad || 
    !localStorage.getItem(`onboarding_completed_${user?.id}`)
  );

  const showWizard = needsOnboarding && !onboardingCompleted;

  // Cargar libros según estado de autenticación
  useEffect(() => {
    if (showWizard) return;
    
    const loadBooks = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isAuthenticated) {
          // Usuario autenticado: cargar recomendaciones
          const response = await apiClient.get<BookItem[]>('/books/recommendations?limit=20');
          setBooks(response);
          setCurrentBookIndex(0);
        } else {
          // Invitado: cargar libro señuelo aleatorio
          const response = await apiClient.get<BookItem>('/books/guest-random');
          setBooks([response]);
          setCurrentBookIndex(0);
        }
      } catch (err: unknown) {
        console.error('Error al cargar libros:', err);
        setError('Ocurrió un error al cargar las recomendaciones de libros.');
      } finally {
        setLoading(false);
      }
    };

    loadBooks();
  }, [isAuthenticated, showWizard]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    }
    setOnboardingCompleted(true);
  };

  const currentBook = books[currentBookIndex];

  const triggerSwipe = async (direction: 'left' | 'right') => {
    if (!currentBook) return;

    if (!isAuthenticated) {
      // Si es invitado, cualquier swipe abre el Hard Gate
      setModalOpen(true);
      return;
    }

    // Activar animación de deslizamiento
    setSwipeDirection(direction);

    try {
      const action = direction === 'right' ? 'like' : 'dislike';
      
      // Llamada al endpoint de swipe en el backend
      await apiClient.post(`/books/${currentBook.id}/swipe`, { action });

      // Esperar a que termine la animación (300ms) antes de cambiar de libro
      setTimeout(() => {
        setSwipeDirection(null);
        setCurrentBookIndex((prev) => prev + 1);
      }, 300);

    } catch (err: any) {
      setSwipeDirection(null);
      // Validar si el error fue por límite diario (403 Forbidden)
      if (err.message && err.message.includes('403')) {
        console.warn('Daily limit reached');
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
        <h1>Explorar Libros</h1>
        {isAuthenticated ? (
          <div className="user-auth-badge">
            <span>Hola, <strong>{user?.name}</strong> ({user?.pais})</span>
            <button onClick={logout} className="logout-btn">Cerrar Sesión</button>
          </div>
        ) : (
          <p>Mira este libro destacado. Regístrate para ver más recomendaciones afines a tus gustos.</p>
        )}
      </div>

      {loading ? (
        <div className="swipe-loading">Cargando recomendaciones personalizadas...</div>
      ) : error ? (
        <div className="swipe-error-state">{error}</div>
      ) : !currentBook ? (
        <div className="swipe-empty-state">
          <span className="empty-icon">📚</span>
          <h3>No hay más recomendaciones por ahora</h3>
          <p>Sube más libros a tu libreta o actualiza tus preferencias de lectura para refinar las recomendaciones de la IA.</p>
        </div>
      ) : (
        <div className="swipe-card-wrapper">
          <div 
            className={`book-swipe-card ${
              swipeDirection === 'right' ? 'swiped-right' : 
              swipeDirection === 'left' ? 'swiped-left' : ''
            }`}
          >
            <div className="book-card-image-placeholder">
              {currentBook.imageUrl ? (
                <img src={currentBook.imageUrl} alt={currentBook.title} className="swipe-card-img" />
              ) : (
                <span className="book-fallback-icon">📖</span>
              )}
              
              <span className={`condition-badge ${currentBook.condition.toLowerCase()}`}>
                {currentBook.condition}
              </span>
            </div>
            
            <div className="book-card-info">
              <h3>{currentBook.title}</h3>
              <span className="book-author">{currentBook.author}</span>
              <p className="book-desc">{currentBook.description}</p>
            </div>
          </div>

          <div className="swipe-controls">
            <button 
              className="control-btn dislike-btn" 
              onClick={() => triggerSwipe('left')}
              title="Descartar"
            >
              ❌
            </button>
            <button 
              className="control-btn like-btn" 
              onClick={() => triggerSwipe('right')}
              title="Me interesa"
            >
              ❤️
            </button>
          </div>
        </div>
      )}

      <HardGateModal 
        isOpen={modalOpen} 
        onSuccess={() => setModalOpen(false)} 
      />
    </div>
  );
};
