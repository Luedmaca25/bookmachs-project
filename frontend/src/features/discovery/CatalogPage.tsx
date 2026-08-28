import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../authentication/store/authStore';
import { BookCard } from './components/BookCard';
import { apiClient } from '../../lib/apiClient';

interface BookItem {
  id: string;
  title: string;
  author: string;
  condition: string;
  description: string;
  imageUrl: string;
  baseValue: number;
  createdAt: string;
  isAvailable: boolean;
}

interface PaginatedBooks {
  items: BookItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface TagItem {
  id: number;
  name: string;
  isActive: boolean;
}

export const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const { data: globalSettings } = useQuery<{ searchKeywordsLimitPremium: number }>({
    queryKey: ['globalSettings'],
    queryFn: () => apiClient.get<any>('/globalsettings'),
  });

  const maxSearchKeywords = globalSettings?.searchKeywordsLimitPremium ?? 10;

  // Estados de catálogo
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de paginación
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');

  // Vista activa: grid o list
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Estado para panel de filtros colapsable (oculto por defecto)
  const [showFilters, setShowFilters] = useState(false);

  // Estado y query para Mis Reservas
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const { data: myReservations, refetch: refetchReservations } = useQuery<BookItem[]>({
    queryKey: ['myReservations'],
    queryFn: () => apiClient.get<BookItem[]>('/books/my-reservations'),
    enabled: isAuthenticated && user?.isPremium === true,
  });

  // Categorías de lectura (tags activos de la BD)
  const [tags, setTags] = useState<string[]>([]);

  // Cargar categorías disponibles
  useEffect(() => {
    if (!isAuthenticated || !user?.isPremium) return;

    const fetchTags = async () => {
      try {
        const response = await apiClient.get<TagItem[]>('/masterpreferencetags?onlyActive=true');
        if (response && response.length > 0) {
          setTags(response.map((t) => t.name));
        } else {
          // Fallback por defecto si la base de datos está vacía
          setTags(['Novela', 'Ciencia Ficción', 'Fantasía', 'Terror', 'Drama', 'Aventura', 'Historia']);
        }
      } catch (err) {
        console.error('Error al cargar tags:', err);
        setTags(['Novela', 'Ciencia Ficción', 'Fantasía', 'Terror', 'Drama', 'Aventura', 'Historia']);
      }
    };

    fetchTags();
  }, [isAuthenticated, user]);

  // Cargar libros con filtros aplicados
  useEffect(() => {
    if (!isAuthenticated || !user?.isPremium) return;

    const loadCatalog = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (searchTerm.trim()) queryParams.append('searchTerm', searchTerm.trim());
        if (category) queryParams.append('category', category);
        if (condition) queryParams.append('condition', condition);
        queryParams.append('pageNumber', pageNumber.toString());
        queryParams.append('pageSize', pageSize.toString());
        queryParams.append('sortBy', sortBy);

        const response = await apiClient.get<PaginatedBooks>(`/books/catalog?${queryParams.toString()}`);
        setBooks(response.items);
        setTotalPages(response.totalPages);
        setTotalCount(response.totalCount);
      } catch (err: any) {
        console.error('Error al cargar catálogo:', err);
        setError('Ocurrió un error al cargar el catálogo avanzado de libros.');
      } finally {
        setLoading(false);
      }
    };

    // Debounce de búsqueda (200ms) para evitar múltiples requests mientras el usuario escribe
    const timer = setTimeout(loadCatalog, 200);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, searchTerm, category, condition, pageNumber, pageSize, sortBy]);

  // Reset de página al cambiar filtros
  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm, category, condition, sortBy]);

  // Determinar si un libro es Recién Llegado (creado en los últimos 7 días)
  const isNewlyArrived = (createdAtString: string) => {
    try {
      const createdDate = new Date(createdAtString);
      const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    } catch {
      return false;
    }
  };

  const handleReserveBook = async (bookId: string, bookTitle: string) => {
    try {
      setLoading(true);
      interface ReserveResponse {
        success: boolean;
        message: string;
        reservedUntil?: string;
      }
      const response = await apiClient.post<ReserveResponse>(`/books/${bookId}/reserve`);
      alert(response.message || `El libro "${bookTitle}" ha sido reservado.`);
      
      // Recargar catálogo para actualizar la disponibilidad virtual de stock
      const queryParams = new URLSearchParams();
      if (searchTerm.trim()) queryParams.append('searchTerm', searchTerm.trim());
      if (category) queryParams.append('category', category);
      if (condition) queryParams.append('condition', condition);
      queryParams.append('pageNumber', pageNumber.toString());
      queryParams.append('pageSize', pageSize.toString());
      queryParams.append('sortBy', sortBy);

      const refreshResponse = await apiClient.get<PaginatedBooks>(`/books/catalog?${queryParams.toString()}`);
      setBooks(refreshResponse.items);
      setTotalPages(refreshResponse.totalPages);
      setTotalCount(refreshResponse.totalCount);
    } catch (err: any) {
      console.error('Error al reservar libro:', err);
      alert(err.message || 'No se pudo reservar el libro. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelReservation = async (bookId: string) => {
    try {
      await apiClient.post(`/books/${bookId}/cancel-reservation`);
      refetchReservations();
      const queryParams = new URLSearchParams();
      if (searchTerm.trim()) queryParams.append('searchTerm', searchTerm.trim());
      if (category) queryParams.append('category', category);
      if (condition) queryParams.append('condition', condition);
      queryParams.append('pageNumber', pageNumber.toString());
      queryParams.append('pageSize', pageSize.toString());
      queryParams.append('sortBy', sortBy);

      const refreshResponse = await apiClient.get<PaginatedBooks>(`/books/catalog?${queryParams.toString()}`);
      setBooks(refreshResponse.items);
      setTotalPages(refreshResponse.totalPages);
      setTotalCount(refreshResponse.totalCount);
    } catch (err: any) {
      alert(err.message || 'No se pudo cancelar la reserva.');
    }
  };

  const handleInterestBook = async (bookId: string, bookTitle: string) => {
    try {
      interface SwipeResponse {
        success: boolean;
        isMatch: boolean;
        matchTransactionId?: string;
      }
      const response = await apiClient.post<SwipeResponse>(`/books/${bookId}/swipe`, { action: 'like' });

      if (response && response.isMatch) {
        alert(`¡ES UN MATCH! 🎉 Te ha interesado "${bookTitle}" y ambos coinciden en el intercambio.`);
      } else {
        alert(`Has marcado "${bookTitle}" como "Me Interesa" ❤️.`);
      }
    } catch (err: any) {
      console.error('Error al marcar me interesa:', err);
      alert(err.message || 'No se pudo registrar tu interés por el libro.');
    }
  };

  // Render para usuarios sin premium (Paywall)
  if (!isAuthenticated || !user?.isPremium) {
    return (
      <div className="catalog-page-container">
        <div className="catalog-header">
           <h1>Catálogo Avanzado</h1>
          <p>Explora y reserva libros directamente de forma personalizada.</p>
        </div>

        <div className="catalog-paywall">
           <span className="paywall-icon"><i className="fa-solid fa-star star-gold"></i></span>
          <h2>Acceso Exclusivo Premium</h2>
          <p>
            El catálogo avanzado en grilla y la búsqueda directa con filtros de categorías, condiciones y fecha de ingreso son beneficios exclusivos de la membresía Premium.
          </p>

          <ul className="paywall-benefits-list">
            <li>
              <span className="benefit-bullet"><i className="fa-solid fa-check"></i></span>
              <span>Búsqueda directa por título, autor o palabras clave (hasta 10)</span>
            </li>
            <li>
              <span className="benefit-bullet"><i className="fa-solid fa-check"></i></span>
              <span>Acceso a Catálogo Avanzado en Grilla interactiva</span>
            </li>
            <li>
              <span className="benefit-bullet"><i className="fa-solid fa-check"></i></span>
              <span>Filtro por géneros y estado de conservación</span>
            </li>
            <li>
              <span className="benefit-bullet"><i className="fa-solid fa-check"></i></span>
              <span>Early Access y alertas de libros recién llegados</span>
            </li>
            <li>
              <span className="benefit-bullet"><i className="fa-solid fa-check"></i></span>
              <span>Reserva de stock en un clic por hasta 48 horas</span>
            </li>
          </ul>

          <button className="paywall-cta-btn font-heading" onClick={() => navigate('/planes')}>
             Ver Planes y Membresías <i className="fa-solid fa-bolt"></i>
          </button>
        </div>
      </div>
    );
  }

  const currentKeywords = searchTerm.trim() ? searchTerm.trim().split(/\s+/).filter(Boolean) : [];
  const isKeywordLimitExceeded = currentKeywords.length > maxSearchKeywords;

  const clearAllFilters = () => {
    setSearchTerm('');
    setCategory('');
    setCondition('');
    setPageNumber(1);
  };

  const activeFiltersCount = (category ? 1 : 0) + (condition ? 1 : 0) + (sortBy !== 'createdAt' ? 1 : 0);

  return (
    <div className="catalog-page-container">
      {/* Header estilo Spotify Search */}
      <div className="spotify-search-header-section">
        <div className="spotify-search-header-titles">
          <h1>Catálogo Avanzado</h1>
          <p>Busca directamente por título, autor o palabras clave entre miles de libros de la comunidad.</p>
        </div>

        {/* Input Principal de Búsqueda Estilo Spotify */}
        <div className="spotify-search-bar-container">
          <div className="spotify-search-input-wrapper">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              id="search-input"
              type="text"
              placeholder="¿Qué libro, autor o palabra clave quieres buscar?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* Alerta de Límite de Palabras Clave de GlobalSettings */}
      {isKeywordLimitExceeded && (
        <div className="search-limit-warning font-body">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>Has ingresado {currentKeywords.length} términos. El límite de palabras clave por búsqueda configurado en GlobalSettings es de {maxSearchKeywords}.</span>
        </div>
      )}

      {/* Barra Superior de Control: Botón Filtros + Mis Reservas + Toggles Grid/List */}
      <div className="catalog-controls-top-bar">
        <div className="left-controls-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className={`toggle-filters-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="fa-solid fa-sliders"></i>
            {activeFiltersCount > 0 && (
              <span className="active-filters-count-badge">{activeFiltersCount}</span>
            )}
            <i className={`fa-solid fa-chevron-${showFilters ? 'up' : 'down'} chevron-icon`}></i>
          </button>

          {/* <button
            type="button"
            className="toggle-filters-btn my-reservations-btn"
            onClick={() => { refetchReservations(); setShowReservationsModal(true); }}
            title="Ver mis reservas de 48 horas"
          >
            <i className="fa-solid fa-bookmark"></i>
            <span>Mis Reservas</span>
            {myReservations && myReservations.length > 0 && (
              <span className="active-filters-count-badge">{myReservations.length}</span>
            )}
          </button> */}
        </div>

        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Vista en Grilla"
            aria-label="Vista en Grilla"
          >
            <i className="fa-solid fa-grip"></i>
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Vista en Lista"
            aria-label="Vista en Lista"
          >
            <i className="fa-solid fa-list-ul"></i>
          </button>
        </div>
      </div>

      {/* Panel de Filtros Colapsable (Oculto de Primera Instancia) */}
      {showFilters && (
        <div className="catalog-filters-collapsible animated-fade-in">
          <div className="catalog-filters-grid">
            <div className="filter-group">
              <label htmlFor="category-select"><i className="fa-solid fa-filter"></i> Categoría</label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="condition-select"><i className="fa-solid fa-sparkles"></i> Estado Físico</label>
              <select
                id="condition-select"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="Excelente">Excelente</option>
                <option value="Bueno">Bueno</option>
                <option value="Aceptable">Aceptable</option>
                <option value="Desgastado">Desgastado</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="sort-select"><i className="fa-solid fa-arrow-down-short-wide"></i> Ordenar Por</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="createdAt">Recién Llegados (Más recientes)</option>
                <option value="title">Título (A-Z)</option>
              </select>
            </div>

            {(category || condition || sortBy !== 'createdAt') && (
              <div className="filter-group filter-actions-group">
                <button 
                  type="button" 
                  className="drawer-reset-btn" 
                  onClick={() => { setCategory(''); setCondition(''); setSortBy('createdAt'); }}
                >
                  <i className="fa-solid fa-rotate-left"></i> Restablecer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chips de Filtros Activos para fácil limpieza */}
      {(searchTerm || category || condition) && (
        <div className="active-filters-bar">
          <span className="active-filters-label">Filtros aplicados:</span>
          {searchTerm && (
            <span className="active-filter-chip">
              Búsqueda: "{searchTerm}"
              <button onClick={() => setSearchTerm('')}><i className="fa-solid fa-xmark"></i></button>
            </span>
          )}
          {category && (
            <span className="active-filter-chip">
              Categoría: {category}
              <button onClick={() => setCategory('')}><i className="fa-solid fa-xmark"></i></button>
            </span>
          )}
          {condition && (
            <span className="active-filter-chip">
              Estado: {condition}
              <button onClick={() => setCondition('')}><i className="fa-solid fa-xmark"></i></button>
            </span>
          )}
        </div>
      )}

      {/* Resultados de la búsqueda */}
      {loading ? (
        <div className="swipe-loading">
          <i className="fa-solid fa-circle-notch fa-spin"></i> Cargando...
        </div>
      ) : error ? (
        <div className="swipe-error-state">
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </div>
      ) : books.length === 0 ? (
        <div className="swipe-empty-state">
          <span className="empty-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
          <h3>No encontramos resultados para tu búsqueda</h3>
          <p>Prueba buscando por un título más general, el nombre del autor o cambiando los filtros seleccionados.</p>
          <button className="reset-search-btn" onClick={clearAllFilters}>
            Ver todos los libros
          </button>
        </div>
      ) : (
        <>
          {/* Contador de resultados con formato de miles (es-CL) */}
          <div className="results-count-bar font-body">
            <span>Mostrando {books.length.toLocaleString('es-CL')} de {totalCount.toLocaleString('es-CL')} libros en catálogo</span>
          </div>

          {viewMode === 'grid' ? (
            /* Vista en Grilla usando el componente común BookCard */
            <div className="catalog-grid">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  isNewlyArrived={isNewlyArrived(book.createdAt)}
                  className="catalog-card"
                  showInterestButton={true}
                  onInterest={(id, title) => handleInterestBook(id, title)}
                  onReserve={(id, title) => handleReserveBook(id, title)}
                />
              ))}
            </div>
          ) : (
            /* Vista en Lista usando el componente común BookCard */
            <div className="catalog-list">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  isNewlyArrived={isNewlyArrived(book.createdAt)}
                  className="catalog-list-item"
                  showInterestButton={true}
                  onInterest={(id, title) => handleInterestBook(id, title)}
                  onReserve={(id, title) => handleReserveBook(id, title)}
                />
              ))}
            </div>
          )}

          {/* Paginación Elegante */}
          {totalPages > 1 && (
            <div className="catalog-pagination">
              <button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(p - 1, 1))}
                className="pagination-btn"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span className="pagination-info">
                Página <strong>{pageNumber}</strong> de <strong>{totalPages}</strong>
              </span>
              <button
                disabled={pageNumber >= totalPages}
                onClick={() => setPageNumber((p) => Math.min(p + 1, totalPages))}
                className="pagination-btn"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Mis Reservas Activas */}
      {showReservationsModal && (
        <div className="modal-overlay animated-fade-in" onClick={() => setShowReservationsModal(false)}>
          <div className="modal-content catalog-reservations-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-bookmark text-accent"></i> Mis Reservas Activas (48 hrs)</h3>
              <button type="button" className="close-modal-btn" onClick={() => setShowReservationsModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              {!myReservations || myReservations.length === 0 ? (
                <div className="empty-reservations-state" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <i className="fa-solid fa-book-bookmark" style={{ fontSize: '3rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'block' }}></i>
                  <h4>No tienes ninguna reserva activa</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Cuando encuentres un libro de tu interés en el catálogo, puedes usar la función de reserva para asegurar tu stock durante 48 horas.
                  </p>
                </div>
              ) : (
                <div className="reservations-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {myReservations.map((item) => (
                    <div key={item.id} className="reservation-item-card" style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px', alignItems: 'center' }}>
                      <div className="reservation-item-cover" style={{ width: '60px', height: '80px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-book"></i>
                          </div>
                        )}
                      </div>
                      <div className="reservation-item-details" style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#fff' }}>{item.title}</h4>
                        <span style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)', display: 'block', marginBottom: '6px' }}>por {item.author}</span>
                        <span className="reservation-timer-pill" style={{ fontSize: '0.78rem', background: 'rgba(255, 209, 102, 0.15)', color: 'var(--accent-primary)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <i className="fa-solid fa-clock"></i> Reserva Activa (48 hrs)
                        </span>
                      </div>
                      <button
                        type="button"
                        className="cancel-reservation-btn"
                        style={{ background: 'rgba(239, 71, 111, 0.15)', border: '1px solid rgba(239, 71, 111, 0.3)', color: '#ef476f', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                        onClick={() => handleCancelReservation(item.id)}
                      >
                        Liberar <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
