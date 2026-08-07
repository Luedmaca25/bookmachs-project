import React, { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../features/authentication/store/authStore';
import { apiClient } from '../../lib/apiClient';

export const MainLayout: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      apiClient.get<any>('/auth/me')
        .then((profile) => {
          login(profile, token);
        })
        .catch((err) => {
          console.error('Error al restaurar la sesión:', err);
          logout();
        });
    }
  }, [user, login, logout]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-text"><i className="fa-solid fa-book"></i> Bookmachs</span>
        </div>
        <nav className="app-nav">
          <Link to="/" className="nav-link">Descubrir</Link>
          
          {isAuthenticated && user && (
            <>
              <Link to="/catalogo" className="nav-link">Catálogo <i className="fa-solid fa-gem" style={{ fontSize: '0.85em' }}></i></Link>
              <Link to="/libreta" className="nav-link">Tus libros</Link>
              <Link to="/transacciones" className="nav-link">Matches</Link>
            </>
          )}
          
          <Link to="/planes" className="nav-link">Planes</Link>
          
          {isAuthenticated && user && (
            <>
              <Link to="/social" className="nav-link">Impacto</Link>
              {user.role === 'Admin' && (
                <Link to="/admin" className="nav-link">CMS</Link>
              )}
            </>
          )}
          
          {isAuthenticated && user ? (
            <div className="user-nav-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link to="/auth" className="nav-link user-profile-link" style={{ fontWeight: 600 }}>
                <i className="fa-solid fa-user-circle"></i> {user.name.split(' ')[0]}
              </Link>
              <button 
                onClick={logout} 
                className="nav-link logout-button-nav"
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontFamily: 'inherit',
                  fontSize: 'inherit'
                }}
              >
                Salir
              </button>
            </div>
          ) : (
            <Link to="/auth" className="nav-link login-button">Ingresar</Link>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Bookmachs - Red Social Cultural y Ambiental. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};
