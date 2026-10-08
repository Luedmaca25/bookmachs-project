import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../authentication/store/authStore';
import { apiClient } from '../../lib/apiClient';
import { BookCard } from './components/BookCard';
import { MatchModal } from '../transactions/components/MatchModal';
import { FiltersModal, type FilterOptions } from './components/FiltersModal';

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
  searchesConsumed?: number;
  searchLimit?: number;
  searchesRemaining?: number;
}

interface CatalogSearchStatus {
  searchesConsumed: number;
  searchLimit: number;
  searchesRemaining: number;
  limitReached: boolean;
}

interface TagItem {
  id: number;
  name: string;
  isActive: boolean;
}

export const CatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const { data: globalSettings } = useQuery<{ searchKeywordsLimitPremium: number; catalogSearchLimitPremium: number }>({
    queryKey: ['globalSettings'],
    queryFn: () => apiClient.get<any>('/globalsettings'),
  });

  const maxSearchKeywords = globalSettings?.searchKeywordsLimitPremium ?? 10;

  // Estado de límite y conteo de búsquedas en el catálogo
  const { data: searchStatus, refetch: refetchSearchStatus } = useQuery<CatalogSearchStatus>({
    queryKey: ['catalogSearchStatus'],
    queryFn: () => apiClient.get<CatalogSearchStatus>('/books/catalog-search-status'),
    enabled: isAuthenticated && user?.isPremium === true,
  });

  const searchesConsumed = searchStatus?.searchesConsumed ?? 0;
  const searchLimit = searchStatus?.searchLimit ?? (globalSettings?.catalogSearchLimitPremium ?? 10);
  const searchesRemaining = searchStatus ? Math.max(0, searchLimit - searchesConsumed) : searchLimit;
  const isSearchLimitReached = searchStatus?.limitReached ?? (searchesRemaining <= 0);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Estados de catálogo
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de paginación
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(8);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchParams] = useSearchParams();
  const initialSearchParam = searchParams.get('search') || searchParams.get('searchTerm') || '';

  // Estados de filtros
  const [searchInput, setSearchInput] = useState(initialSearchParam);
  const [searchTerm, setSearchTerm] = useState(initialSearchParam);
  const [categories, setCategories] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('createdAt');

  const defaultFilterOptions: FilterOptions = {
    categories: [],
    conditions: [],
    category: '',
    condition: '',
    author: '',
    sortBy: 'createdAt',
    isNewlyArrived: false,
    availableNow: false,
    showFallbackOptions: false,
  };

  const [filterOptions, setFilterOptions] = useState<FilterOptions>(defaultFilterOptions);

  // Sincronizar con parámetros de búsqueda de la URL si cambian
  useEffect(() => {
    const query = searchParams.get('search') || searchParams.get('searchTerm');
    if (query !== null) {
      setSearchInput(query);
      setSearchTerm(query);
    }
  }, [searchParams]);

  const hasSearchCriteria = searchTerm.trim().length > 0 || categories.length > 0 || conditions.length > 0;

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
        if (categories.length > 0) queryParams.append('category', categories.join('|'));
        if (conditions.length > 0) queryParams.append('condition', conditions.join(','));
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
        refetchSearchStatus();
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Error al cargar catálogo:', err);
        const errMsg = err?.message || 'Ocurrió un error al cargar el catálogo avanzado de libros.';
        setError(errMsg);
        refetchSearchStatus();
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();

    return () => {
      abortController.abort();
    };
  }, [isAuthenticated, user, searchTerm, categories, conditions, pageNumber, pageSize, sortBy, hasSearchCriteria]);

  // Reset de página al cambiar filtros
  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm, categories, conditions, sortBy]);

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
      if (categories.length > 0) queryParams.append('category', categories.join('|'));
      if (conditions.length > 0) queryParams.append('condition', conditions.join(','));
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
      if (categories.length > 0) queryParams.append('category', categories.join('|'));
      if (conditions.length > 0) queryParams.append('condition', conditions.join(','));
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
    if (isSearchLimitReached) {
      setLimitWarning(`Has alcanzado el límite de ${searchLimit} búsquedas de tu membresía Premium para este periodo.`);
      return;
    }
    setLimitWarning(null);
    setSearchTerm(searchInput.trim());
    setPageNumber(1);
  };

  const handleApplyFilters = (newFilters: FilterOptions) => {
    if (isSearchLimitReached) {
      alert(`Has alcanzado el límite de ${searchLimit} búsquedas en el catálogo para tu plan Premium en este periodo.`);
      return;
    }
    setLimitWarning(null);
    const cats = newFilters.categories
      ? newFilters.categories
      : newFilters.category
      ? (newFilters.category.includes('|') ? newFilters.category.split('|') : [newFilters.category]).map((s) => s.trim()).filter(Boolean)
      : [];
    const conds = newFilters.conditions
      ? newFilters.conditions
      : newFilters.condition
      ? newFilters.condition.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    setFilterOptions({
      ...newFilters,
      categories: cats,
      conditions: conds,
      category: cats.join('|'),
      condition: conds.join(','),
    });
    setCategories(cats);
    setConditions(conds);
    if (newFilters.author) {
      setSearchTerm(newFilters.author);
      setSearchInput(newFilters.author);
    }
    if (newFilters.isNewlyArrived) {
      setSortBy('createdAt');
    } else if (newFilters.sortBy) {
      setSortBy(newFilters.sortBy);
    }
    setShowFilters(false);
    setPageNumber(1);
  };

  const handleResetFilters = () => {
    setFilterOptions(defaultFilterOptions);
    setCategories([]);
    setConditions([]);
    setSortBy('createdAt');
    setPageNumber(1);
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setCategories([]);
    setConditions([]);
    setSortBy('createdAt');
    setFilterOptions(defaultFilterOptions);
    setPageNumber(1);
  };

  const activeFiltersCount =
    categories.length +
    conditions.length +
    (filterOptions.author ? 1 : 0) +
    (filterOptions.sortBy && filterOptions.sortBy !== 'createdAt' ? 1 : 0) +
    (filterOptions.isNewlyArrived ? 1 : 0) +
    (filterOptions.availableNow ? 1 : 0);

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
                title="Buscar"
                aria-label="Buscar"
              >
                <i className="fa-solid fa-magnifying-glass search-icon"></i>
              </button>
              <input
                id="search-input"
                type="text"
                placeholder="¿Qué libro, autor o palabra clave quieres buscar?"
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
                className={`spotify-search-action-btn font-heading ${isSearchLimitReached ? 'disabled' : ''}`}
                title={isSearchLimitReached ? 'Límite de búsquedas alcanzado' : 'Buscar libro'}
                disabled={isSearchLimitReached}
              >
                Buscar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Alerta de Límite de Búsquedas Agotadas */}
      {(limitWarning || isSearchLimitReached) && (
        <div className="search-limit-warning search-limit-depleted font-body">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>
            {limitWarning || `Has utilizado todas tus ${searchLimit} búsquedas permitidas de este ciclo mensual. Tus búsquedas se renovarán con tu ciclo de suscripción.`}
          </span>
        </div>
      )}

      {/* Alerta de Límite de Palabras Clave de GlobalSettings */}
      {isKeywordLimitExceeded && (
        <div className="search-limit-warning font-body">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>Has ingresado {currentKeywords.length} términos. El límite de palabras clave por búsqueda configurado en GlobalSettings es de {maxSearchKeywords}.</span>
        </div>
      )}

      {/* Barra Superior de Control: Botón Filtros + Contador de Búsquedas + Mis Reservas */}
      <div className="catalog-controls-top-bar">
        <div className="left-controls-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Contador de Búsquedas del Catálogo (Plan Premium) */}
          <div 
            className={`catalog-search-counter-badge ${isSearchLimitReached ? 'depleted' : searchesRemaining <= 2 ? 'warning' : ''}`}
            title={`Cuota mensual de búsquedas en catálogo: ${searchesConsumed} realizadas de ${searchLimit} permitidas`}
          >
            <i className={`fa-solid ${isSearchLimitReached ? 'fa-lock' : 'fa-magnifying-glass'}`}></i>
            <span className="counter-text">
              Búsquedas: <strong>{searchesConsumed}</strong> usadas <span className="counter-divider">/</span> <strong>{searchesRemaining}</strong> restantes
            </span>
          </div>
          
          <button
            type="button"
            className={`toggle-filters-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(true)}
            title="Abrir filtros de búsqueda"
          >
            <i className="fa-solid fa-sliders"></i>
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="active-filters-count-badge">{activeFiltersCount}</span>
            )}
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

      {/* Chips de Filtros Activos para fácil limpieza */}
      {(searchTerm || categories.length > 0 || conditions.length > 0 || filterOptions.author || (filterOptions.sortBy && filterOptions.sortBy !== 'createdAt') || filterOptions.isNewlyArrived || filterOptions.availableNow) && (
        <div className="active-filters-bar">
          <span className="active-filters-label">Filtros aplicados:</span>
          {searchTerm && (
            <span className="active-filter-chip">
              Búsqueda: "{searchTerm}"
              <button 
                type="button"
                onClick={() => { setSearchTerm(''); setSearchInput(''); setFilterOptions(prev => ({ ...prev, author: '' })); setPageNumber(1); }}
                title="Quitar búsqueda"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </span>
          )}
          {categories.map((cat) => (
            <span key={cat} className="active-filter-chip">
              Categoría: {cat}
              <button
                type="button"
                onClick={() => {
                  const updated = categories.filter((c) => c !== cat);
                  setCategories(updated);
                  setFilterOptions((prev) => ({
                    ...prev,
                    categories: updated,
                    category: updated.join('|'),
                  }));
                }}
                title={`Quitar categoría ${cat}`}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </span>
          ))}
          {conditions.map((cond) => (
            <span key={cond} className="active-filter-chip">
              Estado: {cond}
              <button
                type="button"
                onClick={() => {
                  const updated = conditions.filter((c) => c !== cond);
                  setConditions(updated);
                  setFilterOptions((prev) => ({
                    ...prev,
                    conditions: updated,
                    condition: updated.join(','),
                  }));
                }}
                title={`Quitar estado ${cond}`}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </span>
          ))}
          {filterOptions.author && !searchTerm.includes(filterOptions.author) && (
            <span className="active-filter-chip">
              Autor: {filterOptions.author}
              <button type="button" onClick={() => setFilterOptions(prev => ({ ...prev, author: '' }))} title="Quitar autor"><i className="fa-solid fa-xmark"></i></button>
            </span>
          )}
          {filterOptions.sortBy && filterOptions.sortBy !== 'createdAt' && (
            <span className="active-filter-chip">
              Orden: {filterOptions.sortBy === 'title' ? 'Título (A-Z)' : 'Precio'}
              <button type="button" onClick={() => { setSortBy('createdAt'); setFilterOptions(prev => ({ ...prev, sortBy: 'createdAt' })); }} title="Restablecer orden"><i className="fa-solid fa-xmark"></i></button>
            </span>
          )}
          {filterOptions.isNewlyArrived && (
            <span className="active-filter-chip">
              Recién llegados
              <button type="button" onClick={() => setFilterOptions(prev => ({ ...prev, isNewlyArrived: false }))} title="Quitar recién llegados"><i className="fa-solid fa-xmark"></i></button>
            </span>
          )}
          {filterOptions.availableNow && (
            <span className="active-filter-chip">
              Disponibles ahora
              <button type="button" onClick={() => setFilterOptions(prev => ({ ...prev, availableNow: false }))} title="Quitar disponibles ahora"><i className="fa-solid fa-xmark"></i></button>
            </span>
          )}
          <button 
            type="button" 
            className="clear-all-filters-btn"
            onClick={clearAllFilters}
          >
            Limpiar todo
          </button>
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

      {/* Modal de Filtros Avanzados y Básicos estilo mockup filtros.jpeg */}
      <FiltersModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        isPremium={!!user?.isPremium}
        tags={tags}
        initialFilters={filterOptions}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />
    </div>
  );
};
