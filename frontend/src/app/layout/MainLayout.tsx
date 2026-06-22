import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export const MainLayout: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-text">📚 Bookmachs</span>
        </div>
        <nav className="app-nav">
          <Link to="/" className="nav-link">Descubrir</Link>
          <Link to="/libreta" className="nav-link">Tu Libreta</Link>
          <Link to="/transacciones" className="nav-link">Matches</Link>
          <Link to="/planes" className="nav-link">Planes</Link>
          <Link to="/social" className="nav-link">Impacto</Link>
          <Link to="/admin" className="nav-link">CMS</Link>
          <Link to="/auth" className="nav-link login-button">Ingresar</Link>
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
