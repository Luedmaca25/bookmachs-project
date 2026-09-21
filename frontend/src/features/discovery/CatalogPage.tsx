import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../authentication/store/authStore';
import { apiClient } from '../../lib/apiClient';
import { BookCard } from './components/BookCard';
import { MatchModal } from '../transactions/components/MatchModal';

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
  category?: string;
  isInternalStock?: boolean;
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
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');

  const hasSearchCriteria = searchTerm.trim().length > 0 || !!category || !!condition;

  // Estado para panel de filtros colapsable (oculto por defecto)
  const [showFilters, setShowFilters] = useState(false);

  // Estado y query para Mis Reservas
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const { data: myReservations, refetch: refetchReservations } = useQuery<BookItem[]>({
    queryKey: ['myReservations'],
    queryFn: () => apiClient.get<BookItem[]>('/books/my-reservations'),
    enabled: isAuthenticated && user?.isPremium === true,
  });

  // Estados para MatchModal e iniciar intercambio directo
  const [matchedBook, setMatchedBook] = useState<BookItem | null>(null);
  const [matchTransactionId, setMatchTransactionId] = useState<string | null>(null);
  const [matchOpen, setMatchOpen] = useState(false);
  const [actionLoadingBookId, setActionLoadingBookId] = useState<string | null>(null);

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

  // Cargar libros con filtros aplicados (solo si hay criterio de búsqueda y cancela peticiones anteriores)
  useEffect(() => {
    if (!isAuthenticated || !user?.isPremium) return;

    if (!hasSearchCriteria) {
      setBooks([]);
      setTotalPages(1);
      setTotalCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    const abortController = new AbortController();

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

        const response = await apiClient.get<PaginatedBooks>(
          `/books/catalog?${queryParams.toString()}`,
          { signal: abortController.signal }
        );
        setBooks(response.items);
        setTotalPages(response.totalPages);
        setTotalCount(response.totalCount);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Error al cargar catálogo:', err);
        setError('Ocurrió un error al cargar el catálogo avanzado de libros.');
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();

    return () => {
      abortController.abort();
    };
  }, [isAuthenticated, user, searchTerm, category, condition, pageNumber, pageSize, sortBy, hasSearchCriteria]);

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

      if (response && response.isMatch && response.matchTransactionId) {
        const found = books.find((b) => b.id === bookId);
        setMatchedBook(found || null);
        setMatchTransactionId(response.matchTransactionId);
        setMatchOpen(true);
      } else {
        alert(`Has marcado "${bookTitle}" como "Me Interesa" ❤️. Se ha guardado en tu libreta.`);
      }
    } catch (err: any) {
      console.error('Error al marcar me interesa:', err);
      alert(err.message || 'No se pudo registrar tu interés por el libro.');
    }
  };

  const handleInitiateExchange = async (book: BookItem) => {
    try {
      setActionLoadingBookId(book.id);
      interface SwipeResponse {
        success: boolean;
        isMatch: boolean;
        matchTransactionId?: string;
      }
      // Damos "like" al libro para registrarlo en la libreta y buscar match inmediato
      const response = await apiClient.post<SwipeResponse>(`/books/${book.id}/swipe`, { action: 'like' });

      setShowReservationsModal(false);

      if (response && response.isMatch && response.matchTransactionId) {
        setMatchedBook(book);
        setMatchTransactionId(response.matchTransactionId);
        setMatchOpen(true);
      } else {
        alert(`¡Excelente! "${book.title}" ha sido añadido a tu lista de libros deseados ❤️. Te llevamos a tu Libreta para que selecciones con qué libro intercambiarlo.`);
        navigate('/libreta');
      }
    } catch (err: any) {
      console.error('Error al iniciar intercambio:', err);
      alert(err.message || 'No se pudo iniciar el intercambio para este libro.');
    } finally {
      setActionLoadingBookId(null);
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

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchTerm(searchInput.trim());
    setPageNumber(1);
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setCategory('');
    setCondition('');
    setSortBy('createdAt');
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
          <form onSubmit={handleSearchSubmit} className="spotify-search-form">
            <div className="spotify-search-input-wrapper">
              <button
                type="submit"
                className="search-submit-btn"
                title="Buscar (Presiona Enter)"
                aria-label="Buscar"
              >
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
              </button>
              <input
                id="search-input"
                type="text"
                placeholder="¿Qué libro, autor o palabra clave quieres buscar? (Presiona Enter)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                autoComplete="off"
              />
              {searchInput && (
                <button
                  type="button"
                  className="spotify-search-clear-btn"
                  onClick={() => {
                    setSearchInput('');
                    setSearchTerm('');
                    setPageNumber(1);
                  }}
                  title="Limpiar texto"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
              <button
                type="submit"
                className="spotify-search-action-btn font-heading"
                title="Buscar libro"
              >
                Buscar
              </button>
            </div>
          </form>
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

          <button
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
                <option value="Muy bueno">Muy bueno</option>
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
              <button 
                type="button"
                onClick={() => { setSearchTerm(''); setSearchInput(''); setPageNumber(1); }}
                title="Quitar búsqueda"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </span>
          )}
          {category && (
            <span className="active-filter-chip">
              Categoría: {category}
              <button type="button" onClick={() => setCategory('')} title="Quitar categoría"><i className="fa-solid fa-xmark"></i></button>
            </span>
          )}
          {condition && (
            <span className="active-filter-chip">
              Estado: {condition}
              <button type="button" onClick={() => setCondition('')} title="Quitar estado"><i className="fa-solid fa-xmark"></i></button>
            </span>
          )}
        </div>
      )}

      {/* Resultados de la búsqueda */}
      {!hasSearchCriteria ? (
        <div className="swipe-empty-state catalog-initial-state">
          <span className="empty-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
          <h3>Busca en el catálogo</h3>
          <p>Escribe el título, autor o palabra clave del libro que deseas encontrar para ver los resultados disponibles.</p>
        </div>
      ) : loading ? (
        <div className="swipe-loading">
          <i className="fa-solid fa-circle-notch fa-spin"></i> Buscando libros...
        </div>
      ) : error ? (
        <div className="swipe-error-state">
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </div>
      ) : books.length === 0 ? (
        <div className="swipe-empty-state">
          <span className="empty-icon"><i className="fa-solid fa-book-open"></i></span>
          <h3>No encontramos resultados para tu búsqueda</h3>
          <p>Prueba buscando con otro término, autor o cambiando los filtros seleccionados.</p>
          <button type="button" className="reset-search-btn font-heading" onClick={clearAllFilters}>
            <i className="fa-solid fa-rotate-left"></i> Limpiar filtros y búsqueda
          </button>
        </div>
      ) : (
        <>
          {/* Contador de resultados con formato de miles (es-CL) */}
          <div className="results-count-bar font-body">
            <span>Mostrando {books.length.toLocaleString('es-CL')} de {totalCount.toLocaleString('es-CL')} libros encontrados</span>
          </div>

          {/* Grilla con diseño de tarjetas de SwipePage */}
          <div className="catalog-grid">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={{
                  id: book.id,
                  title: book.title,
                  author: book.author,
                  condition: book.condition,
                  description: book.description,
                  imageUrl: book.imageUrl,
                  baseValue: book.baseValue,
                  isInternalStock: book.isInternalStock,
                  createdAt: book.createdAt,
                }}
                isNewlyArrived={isNewlyArrived(book.createdAt)}
                className="catalog-swipe-card"
                showInterestButton={true}
                onInterest={handleInterestBook}
                showReserveButton={true}
                onReserve={handleReserveBook}
                showUndoButton={false}
              />
            ))}
          </div>

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

      {/* Modal de Mis Reservas Activas (Portal a document.body) */}
      {showReservationsModal && createPortal(
        <div className="modal-overlay tutorial-modal-overlay animated-fade-in" onClick={() => setShowReservationsModal(false)}>
          <div className="tutorial-modal-card catalog-reservations-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="tutorial-close-btn"
              onClick={() => setShowReservationsModal(false)}
              title="Cerrar modal"
              aria-label="Cerrar modal"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <div className="reservations-modal-header">
              <div className="reservations-icon-circle">
                <i className="fa-solid fa-bookmark"></i>
              </div>
              <h3 className="reservations-modal-title font-heading">
                Mis Reservas Activas (48 hrs)
              </h3>
              <p className="reservations-modal-subtitle">
                Estos libros están apartados exclusivamente para ti. Nadie más puede tomarlos ni reservarlos mientras continúe tu reserva activa.
              </p>
            </div>

            <div className="reservations-modal-body">
              {!myReservations || myReservations.length === 0 ? (
                <div className="empty-reservations-state">
                  <div className="empty-reservations-icon">
                    <i className="fa-solid fa-book-bookmark"></i>
                  </div>
                  <h4>No tienes ninguna reserva activa</h4>
                  <p>
                    Cuando encuentres un libro de tu interés en el catálogo, usa el botón <strong>Reservar</strong> para congelar el stock a tu favor durante 48 horas.
                  </p>
                </div>
              ) : (
                <div className="reservations-list">
                  {myReservations.map((item) => (
                    <div key={item.id} className="reservation-item-card">
                      <div className="reservation-item-cover">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} />
                        ) : (
                          <div className="reservation-item-fallback">
                            <i className="fa-solid fa-book"></i>
                          </div>
                        )}
                      </div>

                      <div className="reservation-item-details">
                        <h4 className="reservation-item-title font-heading">{item.title}</h4>
                        <span className="reservation-item-author">por {item.author}</span>
                        <div className="reservation-pills-row">
                          <span className="reservation-timer-pill">
                            <i className="fa-solid fa-clock"></i> Reserva Activa (48 hrs)
                          </span>
                          {item.condition && (
                            <span className="reservation-condition-pill">
                              {item.condition}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="reservation-item-actions">
                        <button
                          type="button"
                          className="reservation-exchange-btn font-heading"
                          onClick={() => handleInitiateExchange(item)}
                          disabled={actionLoadingBookId === item.id}
                          title="Iniciar propuesta de intercambio para este libro"
                        >
                          {actionLoadingBookId === item.id ? (
                            <><i className="fa-solid fa-circle-notch fa-spin"></i> Conectando...</>
                          ) : (
                            <><i className="fa-solid fa-arrows-rotate"></i> Iniciar Intercambio</>
                          )}
                        </button>

                        <button
                          type="button"
                          className="reservation-cancel-btn"
                          onClick={() => handleCancelReservation(item.id)}
                          title="Liberar reserva"
                        >
                          <i className="fa-solid fa-trash-can"></i> Liberar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Match al concretarse el intercambio */}
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
