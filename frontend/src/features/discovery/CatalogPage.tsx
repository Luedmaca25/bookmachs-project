import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../authentication/store/authStore';
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

  const handleReserveBook = (bookTitle: string) => {
    alert(`⚡ [DEMO] Solicitud de Reserva de "${bookTitle}" por 48 horas enviada correctamente.`);
  };

  // Render para usuarios sin premium (Paywall)
  if (!isAuthenticated || !user?.isPremium) {
    return (
      <div className="catalog-page-container">
        <div className="catalog-header">
          <h1>Catálogo Avanzado 💎</h1>
          <p>Explora y reserva libros directamente de forma personalizada.</p>
        </div>

        <div className="catalog-paywall">
          <span className="paywall-icon">⭐</span>
          <h2>Acceso Exclusivo Premium</h2>
          <p>
            El catálogo avanzado en grilla y la búsqueda directa con filtros de categorías, condiciones y fecha de ingreso son beneficios exclusivos de la membresía Premium.
          </p>

          <ul className="paywall-benefits-list">
            <li>
              <span className="benefit-bullet">✓</span>
              <span>Búsqueda directa por título, autor o palabras clave.</span>
            </li>
            <li>
              <span className="benefit-bullet">✓</span>
              <span>Grilla interactiva con múltiples libros al mismo tiempo.</span>
            </li>
            <li>
              <span className="benefit-bullet">✓</span>
              <span>Filtro de géneros y estado de conservación.</span>
            </li>
            <li>
              <span className="benefit-bullet">✓</span>
              <span>Visualización y alertas de libros recién llegados.</span>
            </li>
            <li>
              <span className="benefit-bullet">✓</span>
              <span>Reserva de stock en un clic por hasta 48 horas.</span>
            </li>
          </ul>

          <button className="paywall-cta-btn font-heading" onClick={() => navigate('/planes')}>
            Ver Planes y Membresías ⚡
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-page-container">
      <div className="catalog-header">
        <h1>Catálogo Avanzado 💎</h1>
        <p>Busca y reserva directamente entre todos los libros listados en la plataforma.</p>
      </div>

      {/* Panel de Filtros */}
      <div className="catalog-filters-row">
        <div className="filter-group">
          <label htmlFor="search-input">Buscar</label>
          <input
            id="search-input"
            type="text"
            placeholder="Título, autor o palabra clave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="category-select">Categoría</label>
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
          <label htmlFor="condition-select">Estado Físico</label>
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
          <label htmlFor="sort-select">Ordenar Por</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Recién Llegados 🆕</option>
            <option value="title">Título (A-Z) 🔤</option>
            <option value="baseValue">Valor Base (Menor a Mayor) 💰</option>
          </select>
        </div>

        {/* Toggles de Vista Grid/List */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Vista de Grilla"
          >
            🎴 Grilla
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Vista de Lista"
          >
            📝 Lista
          </button>
        </div>
      </div>

      {/* Resultados de la búsqueda */}
      {loading ? (
        <div className="swipe-loading">Cargando catálogo avanzado en tiempo real...</div>
      ) : error ? (
        <div className="swipe-error-state">{error}</div>
      ) : books.length === 0 ? (
        <div className="swipe-empty-state">
          <span className="empty-icon">🔍</span>
          <h3>No se encontraron libros coincidentes</h3>
          <p>Intenta cambiar los términos de búsqueda o limpiar los filtros seleccionados.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Vista en Grilla */
        <div className="catalog-grid">
          {books.map((book) => (
            <div key={book.id} className="catalog-card">
              {isNewlyArrived(book.createdAt) && (
                <span className="new-arrival-badge">✨ Recién Llegado</span>
              )}
              <div className="catalog-card-cover">
                {book.imageUrl ? (
                  <img src={book.imageUrl} alt={book.title} />
                ) : (
                  <span className="no-cover-placeholder">📖</span>
                )}
                <span className={`condition-badge ${book.condition.toLowerCase()}`}>
                  {book.condition}
                </span>
              </div>
              <div className="catalog-card-info">
                <h3>{book.title}</h3>
                <span className="author">por {book.author}</span>
                <p className="description">{book.description || 'Sin sinopsis disponible.'}</p>
                <div className="catalog-card-footer">
                  <div className="catalog-price-tag">
                    <span>${book.baseValue.toLocaleString('es-CL')} CLP</span>
                    <small>Valor Base del libro</small>
                  </div>
                  <button
                    className="catalog-reserve-btn"
                    onClick={() => handleReserveBook(book.title)}
                  >
                    Reservar 🔒
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Vista en Lista */
        <div className="catalog-list">
          {books.map((book) => (
            <div key={book.id} className="catalog-list-item">
              <div className="catalog-list-item-cover">
                {isNewlyArrived(book.createdAt) && (
                  <span className="new-arrival-badge">✨ Recién Llegado</span>
                )}
                {book.imageUrl ? (
                  <img src={book.imageUrl} alt={book.title} />
                ) : (
                  <span className="no-cover-placeholder">📖</span>
                )}
              </div>
              <div className="catalog-list-item-info">
                <span className={`condition-badge ${book.condition.toLowerCase()}`}>
                  {book.condition}
                </span>
                <h3>{book.title}</h3>
                <span className="author">por {book.author}</span>
                <p className="description">{book.description || 'Sin sinopsis disponible.'}</p>
              </div>
              <div className="catalog-list-item-actions">
                <div className="price-section">
                  <h4>${book.baseValue.toLocaleString('es-CL')} CLP</h4>
                  <p>Valor Base</p>
                </div>
                <div className="action-buttons">
                  <button
                    className="catalog-reserve-btn"
                    onClick={() => handleReserveBook(book.title)}
                  >
                    Reservar 🔒
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="catalog-pagination">
          <button
            className="pagination-btn"
            disabled={pageNumber === 1}
            onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
          >
            ◀ Anterior
          </button>
          <span className="pagination-info">
            Página {pageNumber} de {totalPages} ({totalCount} libros)
          </span>
          <button
            className="pagination-btn"
            disabled={pageNumber === totalPages}
            onClick={() => setPageNumber((prev) => Math.min(prev + 1, totalPages))}
          >
            Siguiente ▶
          </button>
        </div>
      )}
    </div>
  );
};
