import React, { useState } from 'react';
import { useAuthStore } from '../authentication/store/authStore';
import { HardGateModal } from '../authentication/components/HardGateModal';

export const SwipePage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [swiped, setSwiped] = useState(false);

  const handleSwipeAction = () => {
    if (!isAuthenticated) {
      setModalOpen(true);
    } else {
      setSwiped(true);
      setTimeout(() => setSwiped(false), 1500);
    }
  };

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

      <div className="swipe-card-wrapper">
        <div className={`book-swipe-card ${swiped ? 'swiped-right' : ''}`}>
          <div className="book-card-image-placeholder">
            📖
          </div>
          <div className="book-card-info">
            <h3>Cien años de soledad</h3>
            <span className="book-author">Gabriel García Márquez</span>
            <span className="book-badge">Estado: Excelente</span>
            <p className="book-desc">
              La obra maestra de la literatura hispanoamericana que narra la historia de la familia Buendía a lo largo de siete generaciones en el pueblo ficticio de Macondo.
            </p>
          </div>
        </div>

        <div className="swipe-controls">
          <button className="control-btn dislike-btn" onClick={handleSwipeAction}>
            ❌
          </button>
          <button className="control-btn like-btn" onClick={handleSwipeAction}>
            ❤️
          </button>
        </div>
      </div>

      {isAuthenticated && swiped && (
        <div className="swipe-feedback">
          ¡Libro deslizado! Cargando recomendaciones personalizadas...
        </div>
      )}

      <HardGateModal 
        isOpen={modalOpen} 
        onSuccess={() => setModalOpen(false)} 
      />
    </div>
  );
};
