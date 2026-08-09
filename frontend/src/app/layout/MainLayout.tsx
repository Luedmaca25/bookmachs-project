import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../features/authentication/store/authStore';
import { apiClient } from '../../lib/apiClient';

export const MainLayout: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

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

  // Bloquear el scroll de html y body cuando el Offcanvas está activo
  useEffect(() => {
    if (mobileMenuOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Cerrar menú offcanvas al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-logo">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span className="logo-text"><i className="fa-solid fa-book"></i> Bookmachs</span>
          </Link>
        </div>

        {/* MENÚ DESKTOP (Pantallas > 768px) */}
        <nav className="app-nav desktop-nav">
          <Link to="/" className="nav-link">Descubrir</Link>
          
          {isAuthenticated && user && (
            <>
              <Link to="/catalogo" className="nav-link">Catálogo</Link>
              <Link to="/libreta" className="nav-link">Tu libreta</Link>
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
            <div className="user-nav-container" style={{ display: 'flex', alignItems: 'center', gap: '2.2rem' }}>
              <Link to="/auth" className="nav-link user-profile-link">
                Mi perfil
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

        {/* BOTÓN HAMBURGUESA MÓVIL */}
        <button 
          className="mobile-hamburger-btn"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menú de navegación"
        >
          <i className="fa-solid fa-bars"></i>
        </button>
      </header>

      {/* OVERLAY & PANEL OFFCANVAS MÓVIL (ESTILO BOOTSTRAP 5 - FUERA DEL HEADER PARA COBRIR 100% DE LA PANTALLA) */}
      {mobileMenuOpen && (
        <div className="offcanvas-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="offcanvas-panel" onClick={(e) => e.stopPropagation()}>
            <div className="offcanvas-header">
              <span className="logo-text"><i className="fa-solid fa-book"></i> Bookmachs</span>
              <button className="offcanvas-close-btn" onClick={() => setMobileMenuOpen(false)}>✕</button>
            </div>

            <div className="offcanvas-body">
              <Link to="/" className="offcanvas-link"><i className="fa-solid fa-compass"></i> Descubrir</Link>

              {isAuthenticated && user && (
                <>
                  <Link to="/catalogo" className="offcanvas-link">Catálogo</Link>
                  <Link to="/libreta" className="offcanvas-link"><i className="fa-solid fa-book-bookmark"></i> Tu libreta</Link>
                  <Link to="/transacciones" className="offcanvas-link"><i className="fa-solid fa-handshake"></i> Matches</Link>
                </>
              )}

              <Link to="/planes" className="offcanvas-link"><i className="fa-solid fa-tags"></i> Planes</Link>

              {isAuthenticated && user && (
                <>
                  <Link to="/social" className="offcanvas-link"><i className="fa-solid fa-earth-americas"></i> Impacto</Link>
                  {user.role === 'Admin' && (
                    <Link to="/admin" className="offcanvas-link"><i className="fa-solid fa-sliders"></i> CMS Admin</Link>
                  )}
                </>
              )}

              <div className="offcanvas-divider" />

              {isAuthenticated && user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <Link to="/auth" className="offcanvas-user-info">
                    Mi perfil
                  </Link>
                  <button 
                    onClick={logout} 
                    className="offcanvas-logout-btn"
                  >
                    <i className="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
                  </button>
                </div>
              ) : (
                <Link to="/auth" className="offcanvas-login-btn">
                  <i className="fa-solid fa-right-to-bracket"></i> Ingresar a Bookmachs
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Bookmachs - Red Social Cultural y Ambiental. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};
