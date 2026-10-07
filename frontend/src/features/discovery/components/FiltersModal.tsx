import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

export interface FilterOptions {
  category: string;
  condition: string;
  author: string;
  sortBy: string;
  // Opciones de "Libros que buscas..."
  isNewlyArrived: boolean;
  availableNow: boolean;
  showFallbackOptions: boolean;
  categories?: string[];
  conditions?: string[];
}

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPremium?: boolean;
  tags: string[];
  initialFilters: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
  onResetFilters: () => void;
}

export const FiltersModal: React.FC<FiltersModalProps> = ({
  isOpen,
  onClose,
  isPremium = false,
  tags = [],
  initialFilters,
  onApplyFilters,
  onResetFilters,
}) => {
  const navigate = useNavigate();

  // Tab activo: 'basicos' | 'avanzados'
  const [activeTab, setActiveTab] = useState<'basicos' | 'avanzados'>('avanzados');

  const normalizeFilters = (raw: FilterOptions): FilterOptions => {
    const cats = raw.categories
      ? raw.categories
      : raw.category
      ? (raw.category.includes('|') ? raw.category.split('|') : [raw.category]).map((s) => s.trim()).filter(Boolean)
      : [];
    const conds = raw.conditions
      ? raw.conditions
      : raw.condition
      ? raw.condition.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    return {
      ...raw,
      categories: cats,
      conditions: conds,
      category: cats.join('|'),
      condition: conds.join(','),
    };
  };

  // Estado local de filtros dentro del modal
  const [filters, setFilters] = useState<FilterOptions>(() => normalizeFilters(initialFilters));

  // Selector abierto actualmente para edición inline de filtro
  const [openSelector, setOpenSelector] = useState<string | null>(null);

  // Sincronizar estado local cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setFilters(normalizeFilters(initialFilters));
      setOpenSelector(null);
    }
  }, [isOpen, initialFilters]);

  // Bloquear scroll mientras el modal esté abierto
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleCheckbox = (key: keyof FilterOptions) => {
    setFilters((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleToggleFilterItem = (key: 'categories' | 'conditions', item: string) => {
    setFilters((prev) => {
      const currentList = prev[key] || [];
      const exists = currentList.includes(item);
      const updatedList = exists
        ? currentList.filter((x) => x !== item)
        : [...currentList, item];
      return {
        ...prev,
        [key]: updatedList,
        [key === 'categories' ? 'category' : 'condition']: key === 'categories' ? updatedList.join('|') : updatedList.join(','),
      };
    });
  };

  const handleClearFilterList = (key: 'categories' | 'conditions', e: React.MouseEvent) => {
    e.stopPropagation();
    setFilters((prev) => ({
      ...prev,
      [key]: [],
      [key === 'categories' ? 'category' : 'condition']: '',
    }));
  };

  const handleUpdateFilter = (key: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setOpenSelector(null);
  };

  const handleClearSingleFilter = (key: keyof FilterOptions, e: React.MouseEvent) => {
    e.stopPropagation();
    setFilters((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? false : '',
    }));
  };

  const handleResetAll = () => {
    onResetFilters();
    setFilters({
      categories: [],
      conditions: [],
      category: '',
      condition: '',
      author: '',
      sortBy: 'createdAt',
      isNewlyArrived: false,
      availableNow: false,
      showFallbackOptions: false,
    });
  };

  const handleApply = () => {
    if (!isPremium) {
      navigate('/planes');
      onClose();
      return;
    }
    const finalFilters: FilterOptions = {
      ...filters,
      categories: filters.categories || [],
      conditions: filters.conditions || [],
      category: (filters.categories || []).join('|'),
      condition: (filters.conditions || []).join(','),
    };
    onApplyFilters(finalFilters);
    onClose();
  };

  const modalContent = (
    <div className="filters-modal-overlay" onClick={onClose}>
      <div
        className="filters-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-modal-title"
      >
        {/* Cabecera del modal */}
        <div className="filters-modal-header">
          <button
            type="button"
            className="filters-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar filtros"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Título y subtítulo */}
        <div className="filters-modal-titles">
          <h2 id="filters-modal-title" className="filters-main-title">Acota tu búsqueda</h2>
          <p className="filters-main-subtitle">
            Encuentra libros que coincidan con tus intereses y conecta con personas de la comunidad.
          </p>
        </div>

        {/* Pestañas: Filtros básicos | Filtros avanzados */}
        <div className="filters-tab-segmented-control">
          <button
            type="button"
            className={`tab-segment-btn ${activeTab === 'basicos' ? 'active' : ''}`}
            onClick={() => setActiveTab('basicos')}
          >
            Filtros básicos
          </button>
          <button
            type="button"
            className={`tab-segment-btn ${activeTab === 'avanzados' ? 'active' : ''}`}
            onClick={() => setActiveTab('avanzados')}
          >
            Filtros avanzados
          </button>
        </div>

        {/* Cuerpo scrolleable de filtros */}
        <div className="filters-modal-scrollable-body">
          {/* Lista de Filas de Filtros */}
          <div className="filters-rows-list">
            {/* 1. Categoría */}
            <div className="filter-row-card">
              <div className="filter-row-main" onClick={() => setOpenSelector(openSelector === 'category' ? null : 'category')}>
                <div className="filter-row-left">
                  <i className="fa-solid fa-book-open filter-row-icon"></i>
                  <span className="filter-row-label">Categoría</span>
                  {filters.categories && filters.categories.length > 0 && (
                    <span className="filter-selected-pill">
                      {filters.categories.length === 1 
                        ? filters.categories[0] 
                        : `${filters.categories.length} seleccionadas`}
                      <button
                        type="button"
                        onClick={(e) => handleClearFilterList('categories', e)}
                        className="pill-clear-btn"
                        title="Quitar categorías"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="filter-row-action-btn"
                >
                  {filters.categories && filters.categories.length > 0 ? 'Editar' : 'Añadir filtro +'}
                </button>
              </div>

              {openSelector === 'category' && (
                <div className="filter-inline-selector animated-fade-in">
                  <div className="selector-options-chips">
                    {tags.length > 0 ? (
                      tags.map((t) => {
                        const isSelected = (filters.categories || []).includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            className={`selector-chip ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleToggleFilterItem('categories', t)}
                          >
                            {isSelected && <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>}
                            {t}
                          </button>
                        );
                      })
                    ) : (
                      <p className="no-tags-notice">No hay categorías disponibles.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Estado físico */}
            <div className="filter-row-card">
              <div className="filter-row-main" onClick={() => setOpenSelector(openSelector === 'condition' ? null : 'condition')}>
                <div className="filter-row-left">
                  <i className="fa-regular fa-bookmark filter-row-icon"></i>
                  <span className="filter-row-label">Estado físico</span>
                  {filters.conditions && filters.conditions.length > 0 && (
                    <span className="filter-selected-pill">
                      {filters.conditions.length === 1 
                        ? filters.conditions[0] 
                        : `${filters.conditions.length} seleccionados`}
                      <button
                        type="button"
                        onClick={(e) => handleClearFilterList('conditions', e)}
                        className="pill-clear-btn"
                        title="Quitar estados físicos"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="filter-row-action-btn"
                >
                  {filters.conditions && filters.conditions.length > 0 ? 'Editar' : 'Añadir filtro +'}
                </button>
              </div>

              {openSelector === 'condition' && (
                <div className="filter-inline-selector animated-fade-in">
                  <div className="selector-options-chips">
                    {['Excelente', 'Muy bueno', 'Bueno', 'Aceptable', 'Desgastado'].map((c) => {
                      const isSelected = (filters.conditions || []).includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          className={`selector-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleFilterItem('conditions', c)}
                        >
                          {isSelected && <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>}
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Autor (Solo en avanzados o cuando se requiere mayor detalle) */}
            {activeTab === 'avanzados' && (
              <div className="filter-row-card">
                <div className="filter-row-main" onClick={() => setOpenSelector(openSelector === 'author' ? null : 'author')}>
                  <div className="filter-row-left">
                    <i className="fa-regular fa-user filter-row-icon"></i>
                    <span className="filter-row-label">Autor</span>
                    {filters.author && (
                      <span className="filter-selected-pill">
                        {filters.author}
                        <button
                          type="button"
                          onClick={(e) => handleClearSingleFilter('author', e)}
                          className="pill-clear-btn"
                          title="Quitar filtro"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="filter-row-action-btn"
                  >
                    {filters.author ? 'Editar' : 'Añadir filtro +'}
                  </button>
                </div>

                {openSelector === 'author' && (
                  <div className="filter-inline-selector animated-fade-in">
                    <div className="inline-input-group">
                      <input
                        type="text"
                        placeholder="Ej: Gabriel García Márquez, Stephen King..."
                        defaultValue={filters.author}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateFilter('author', (e.target as HTMLInputElement).value);
                          }
                        }}
                        onBlur={(e) => handleUpdateFilter('author', e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Ordenar Por */}
            <div className="filter-row-card">
              <div className="filter-row-main" onClick={() => setOpenSelector(openSelector === 'sortBy' ? null : 'sortBy')}>
                <div className="filter-row-left">
                  <i className="fa-solid fa-arrow-down-short-wide filter-row-icon"></i>
                  <span className="filter-row-label">Ordenar por</span>
                  {filters.sortBy && filters.sortBy !== 'createdAt' && (
                    <span className="filter-selected-pill">
                      {filters.sortBy === 'title' ? 'Título (A-Z)' : 'Precio'}
                      <button
                        type="button"
                        onClick={(e) => handleClearSingleFilter('sortBy', e)}
                        className="pill-clear-btn"
                        title="Quitar filtro"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="filter-row-action-btn"
                >
                  {filters.sortBy && filters.sortBy !== 'createdAt' ? 'Cambiar' : 'Añadir filtro +'}
                </button>
              </div>

              {openSelector === 'sortBy' && (
                <div className="filter-inline-selector animated-fade-in">
                  <div className="selector-options-chips">
                    {[
                      { key: 'createdAt', label: 'Recién llegados (Más recientes)' },
                      { key: 'title', label: 'Título (A-Z)' },
                      { key: 'baseValue', label: 'Menor a mayor precio' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        className={`selector-chip ${filters.sortBy === opt.key ? 'selected' : ''}`}
                        onClick={() => handleUpdateFilter('sortBy', opt.key)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tarjeta Enmarcada: "Libros que buscas..." (Solo en Filtros Avanzados) */}
          {activeTab === 'avanzados' && (
            <div className="filters-preferences-card">
              <div className="preferences-card-header">
                <i className="fa-solid fa-book preference-header-icon"></i>
                <h3 className="preferences-card-title">Libros que buscas...</h3>
              </div>

              <div className="preferences-checklist">
                {/* Recién llegados */}
                <label className="preference-check-item">
                  <input
                    type="checkbox"
                    checked={filters.isNewlyArrived}
                    onChange={() => handleToggleCheckbox('isNewlyArrived')}
                  />
                  <span className="custom-square-checkbox">
                    {filters.isNewlyArrived && <i className="fa-solid fa-check"></i>}
                  </span>
                  <span className="preference-item-name">Recién llegados</span>
                  <span className="preference-item-desc">Los últimos libros agregados por la comunidad</span>
                </label>

                {/* Disponibles ahora */}
                <label className="preference-check-item">
                  <input
                    type="checkbox"
                    checked={filters.availableNow}
                    onChange={() => handleToggleCheckbox('availableNow')}
                  />
                  <span className="custom-square-checkbox">
                    {filters.availableNow && <i className="fa-solid fa-check"></i>}
                  </span>
                  <span className="preference-item-name">Disponibles ahora</span>
                  <span className="preference-item-desc">Muestra libros con stock activo disponible</span>
                </label>
              </div>

              {/* Switch iOS inferior */}
              <div className="preferences-fallback-toggle">
                <span className="fallback-toggle-label">Mostrar más opciones si no hay resultados</span>
                <label className="ios-toggle-switch">
                  <input
                    type="checkbox"
                    checked={filters.showFallbackOptions}
                    onChange={() => handleToggleCheckbox('showFallbackOptions')}
                  />
                  <span className="ios-toggle-slider" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Botón Pill y Botón Limpiar */}
        <div className="filters-modal-footer">
          <button
            type="button"
            className="filters-submit-pill-btn font-heading"
            onClick={handleApply}
          >
            {isPremium ? (
              'Aplicar filtros'
            ) : (
              <>
                <i className="fa-solid fa-crown crown-icon"></i> Desbloquear Premium
              </>
            )}
          </button>

          <button
            type="button"
            className="filters-modal-clear-below-btn font-heading"
            onClick={handleResetAll}
            title="Restablecer todos los filtros"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
