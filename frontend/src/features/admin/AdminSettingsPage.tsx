import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

interface GlobalSettings {
  id: number;
  dailySwipeLimitFree: number;
  dailySwipeLimitPremium: number;
  monthlyMatchLimitFree: number;
  monthlyMatchLimitPremium: number;
  basicPlanPriceUsd: number;
  premiumPlanPriceUsd: number;
  searchKeywordsLimitPremium: number;
  feePercentage: number;
  minFeeAmount: number;
  maxFeeAmount: number;
  lastUpdatedAt: string;
}

interface PreferenceCategoryMapping {
  id?: number;
  categoryId: number;
  categoryName: string;
  subcategoryId?: number | null;
  subcategoryName?: string | null;
}

interface MasterPreferenceTag {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  mappedCategories?: PreferenceCategoryMapping[];
}

interface EcolecturaSubcategory {
  subcategoryId: number;
  subcategoryName: string;
  activo: boolean;
}

interface EcolecturaCategoryTree {
  categoryId: number;
  categoryName: string;
  activo: boolean;
  subcategories: EcolecturaSubcategory[];
}

interface PendingMatch {
  id: string;
  requesterName: string;
  bookTitle: string;
  bookAuthor: string;
  bookImageUrl: string;
  logisticsStatus: string;
  logisticsMethod: string | null;
  createdAt: string;
}

interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  documentoIdentidad: string;
  pais: string;
  telefono: string;
  profileImageUrl: string | null;
  isPremium: boolean;
  subscriptionPlan: string;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  booksCount: number;
  preferences: string[];
}

export const AdminSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'global' | 'tags' | 'users' | 'logistics'>('global');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Estados para Modal de Edición de Gustos y Mapeos
  const [editingTag, setEditingTag] = useState<MasterPreferenceTag | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tagNameInput, setTagNameInput] = useState('');
  const [tagDescInput, setTagDescInput] = useState('');
  const [tagActiveInput, setTagActiveInput] = useState(true);
  const [selectedMappings, setSelectedMappings] = useState<PreferenceCategoryMapping[]>([]);

  // Estados para Módulo Senior de Usuarios
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetail | null>(null);
  const [userSearchFilter, setUserSearchFilter] = useState('');
  const [userFilterTab, setUserFilterTab] = useState<'all' | 'active' | 'blocked' | 'premium' | 'admin'>('all');
  const [userViewMode, setUserViewMode] = useState<'grid' | 'table'>('table');
  void userViewMode;
  void setUserViewMode;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Queries
  const { data: globalSettings, isLoading: loadingSettings, error: errorSettings } = useQuery<GlobalSettings>({
    queryKey: ['globalSettings'],
    queryFn: () => apiClient.get<GlobalSettings>('/globalsettings'),
  });

  const { data: preferenceTags, isLoading: loadingTags, error: errorTags } = useQuery<MasterPreferenceTag[]>({
    queryKey: ['preferenceTags'],
    queryFn: () => apiClient.get<MasterPreferenceTag[]>('/masterpreferencetags'),
  });

  const { data: categoryTree } = useQuery<EcolecturaCategoryTree[]>({
    queryKey: ['ecolecturaCategories'],
    queryFn: () => apiClient.get<EcolecturaCategoryTree[]>('/masterpreferencetags/ecolectura-categories'),
  });

  const { data: pendingLogistics, isLoading: loadingLogistics, error: errorLogistics } = useQuery<PendingMatch[]>({
    queryKey: ['pendingLogistics'],
    queryFn: () => apiClient.get<PendingMatch[]>('/transactions/pending-admin'),
  });

  const { data: adminUsers, isLoading: loadingUsers, error: errorUsers } = useQuery<AdminUserDetail[]>({
    queryKey: ['adminUsers'],
    queryFn: () => apiClient.get<AdminUserDetail[]>('/users/admin-list'),
  });

  // KPI Analytics Metrics Computations
  const userMetrics = useMemo(() => {
    if (!adminUsers) return { total: 0, active: 0, blocked: 0, premium: 0, totalBooks: 0 };
    return {
      total: adminUsers.length,
      active: adminUsers.filter(u => !u.isBlocked).length,
      blocked: adminUsers.filter(u => u.isBlocked).length,
      premium: adminUsers.filter(u => u.isPremium).length,
      totalBooks: adminUsers.reduce((sum, u) => sum + (u.booksCount || 0), 0)
    };
  }, [adminUsers]);

  // Filtering Logic
  const filteredUsers = useMemo(() => {
    if (!adminUsers) return [];
    return adminUsers.filter(u => {
      // 1. Category Filter
      if (userFilterTab === 'active' && u.isBlocked) return false;
      if (userFilterTab === 'blocked' && !u.isBlocked) return false;
      if (userFilterTab === 'premium' && !u.isPremium) return false;
      if (userFilterTab === 'admin' && u.role !== 'Admin') return false;

      // 2. Search Text Query
      if (!userSearchFilter.trim()) return true;
      const q = userSearchFilter.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.documentoIdentidad?.toLowerCase().includes(q) ||
        u.pais?.toLowerCase().includes(q) ||
        u.telefono?.toLowerCase().includes(q)
      );
    });
  }, [adminUsers, userFilterTab, userSearchFilter]);

  // Mutations
  const confirmReceiptMutation = useMutation({
    mutationFn: (matchId: string) => apiClient.post<any>(`/transactions/confirm-receipt/${matchId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingLogistics'] });
      showToast('Recepción del libro confirmada con éxito por el administrador.', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || 'Error al confirmar la recepción.', 'error');
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (updated: Partial<GlobalSettings>) => apiClient.put<GlobalSettings>('/globalsettings', updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalSettings'] });
      showToast('Configuraciones globales actualizadas con éxito.', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || 'Error al guardar configuraciones.', 'error');
    }
  });

  const createTagMutation = useMutation({
    mutationFn: (newTag: { name: string; description: string; isActive: boolean; mappedCategories: PreferenceCategoryMapping[] }) =>
      apiClient.post<MasterPreferenceTag>('/masterpreferencetags', newTag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferenceTags'] });
      closeModal();
      showToast('Concepto de gusto y mapeo creados con éxito.', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || 'Error al agregar la etiqueta.', 'error');
    }
  });

  const updateTagMutation = useMutation({
    mutationFn: (tag: { id: number; name: string; description: string; isActive: boolean; mappedCategories: PreferenceCategoryMapping[] }) =>
      apiClient.put<MasterPreferenceTag>(`/masterpreferencetags/${tag.id}`, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferenceTags'] });
      closeModal();
      showToast('Concepto de gusto y mapeo actualizados correctamente.', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || 'Error al actualizar la etiqueta.', 'error');
    }
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete<boolean>(`/masterpreferencetags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferenceTags'] });
      showToast('Etiqueta eliminada con éxito.', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || 'Error al eliminar la etiqueta.', 'error');
    }
  });

  const toggleBlockUserMutation = useMutation({
    mutationFn: (userId: string) => apiClient.post<AdminUserDetail>(`/users/${userId}/toggle-block`),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      if (selectedUserDetail && selectedUserDetail.id === updatedUser.id) {
        setSelectedUserDetail(updatedUser);
      }
      showToast(
        updatedUser.isBlocked 
          ? `El usuario ${updatedUser.name || updatedUser.email} ha sido bloqueado.` 
          : `El usuario ${updatedUser.name || updatedUser.email} ha sido desbloqueado.`, 
        updatedUser.isBlocked ? 'error' : 'success'
      );
    },
    onError: (err: Error) => {
      showToast(err.message || 'Error al modificar estado de bloqueo del usuario.', 'error');
    }
  });

  const toggleAdminRoleMutation = useMutation({
    mutationFn: (userId: string) => apiClient.post<AdminUserDetail>(`/users/${userId}/toggle-admin`),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      if (selectedUserDetail && selectedUserDetail.id === updatedUser.id) {
        setSelectedUserDetail(updatedUser);
      }
      showToast(
        updatedUser.role === 'Admin'
          ? `El usuario ${updatedUser.name || updatedUser.email} ahora tiene el rol de Administrador.`
          : `El usuario ${updatedUser.name || updatedUser.email} ahora es un Usuario estándar.`,
        'success'
      );
    },
    onError: (err: Error) => {
      showToast(err.message || 'Error al modificar el rol de administrador.', 'error');
    }
  });

  // Form Handlers
  const handleSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const updated: Partial<GlobalSettings> = {
      dailySwipeLimitFree: parseInt(formData.get('dailySwipeLimitFree') as string, 10),
      dailySwipeLimitPremium: parseInt(formData.get('dailySwipeLimitPremium') as string, 10),
      monthlyMatchLimitFree: parseInt(formData.get('monthlyMatchLimitFree') as string, 10),
      monthlyMatchLimitPremium: parseInt(formData.get('monthlyMatchLimitPremium') as string, 10),
      basicPlanPriceUsd: parseFloat(formData.get('basicPlanPriceUsd') as string),
      premiumPlanPriceUsd: parseFloat(formData.get('premiumPlanPriceUsd') as string),
      feePercentage: parseFloat(formData.get('feePercentage') as string) / 100,
      minFeeAmount: parseFloat(formData.get('minFeeAmount') as string),
      maxFeeAmount: parseFloat(formData.get('maxFeeAmount') as string),
    };

    updateSettingsMutation.mutate(updated);
  };

  const openCreateModal = () => {
    setEditingTag(null);
    setTagNameInput('');
    setTagDescInput('');
    setTagActiveInput(true);
    setSelectedMappings([]);
    setIsModalOpen(true);
  };

  const openEditModal = (tag: MasterPreferenceTag) => {
    setEditingTag(tag);
    setTagNameInput(tag.name);
    setTagDescInput(tag.description || '');
    setTagActiveInput(tag.isActive);
    setSelectedMappings(tag.mappedCategories || []);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTag(null);
  };

  const isMappingSelected = (catId: number, subId?: number | null) => {
    return selectedMappings.some(m => m.categoryId === catId && (subId === undefined || m.subcategoryId === subId));
  };

  const toggleMapping = (catId: number, catName: string, subId?: number | null, subName?: string | null) => {
    const exists = isMappingSelected(catId, subId);
    if (exists) {
      setSelectedMappings(prev => prev.filter(m => !(m.categoryId === catId && m.subcategoryId === subId)));
    } else {
      setSelectedMappings(prev => [
        ...prev,
        { categoryId: catId, categoryName: catName, subcategoryId: subId, subcategoryName: subName }
      ]);
    }
  };

  const handleSaveTagModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagNameInput.trim()) {
      showToast('Ingresa un nombre para el concepto.', 'error');
      return;
    }

    const payload = {
      name: tagNameInput.trim(),
      description: tagDescInput.trim(),
      isActive: tagActiveInput,
      mappedCategories: selectedMappings
    };

    if (editingTag) {
      updateTagMutation.mutate({ id: editingTag.id, ...payload });
    } else {
      createTagMutation.mutate(payload);
    }
  };

  const handleToggleTagActive = (tag: MasterPreferenceTag) => {
    updateTagMutation.mutate({
      id: tag.id,
      name: tag.name,
      description: tag.description || '',
      isActive: !tag.isActive,
      mappedCategories: tag.mappedCategories || []
    });
  };

  const handleDeleteTag = (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este concepto de gusto?')) {
      deleteTagMutation.mutate(id);
    }
  };
  void handleDeleteTag;
  void deleteTagMutation;

  return (
    <div className="admin-settings-container page-container">
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="admin-header">
        <h2>Panel CMS de Administración</h2>
        <p>Configura parámetros del sistema, gestiona usuarios y administra el catálogo dinámico de gustos.</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`}
          onClick={() => setActiveTab('global')}
        >
          <i className="fa-solid fa-sliders"></i> Ajustes Generales
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <i className="fa-solid fa-users"></i> Gestión de Usuarios
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          <i className="fa-solid fa-tags"></i> Catálogo de Gustos & Mapeo
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('logistics')}
        >
          <i className="fa-solid fa-boxes-packing"></i> Confirmar Envíos Presenciales
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'global' && (
          <div className="admin-settings-section">
            <h3>Límites Globales y Parámetros de Suscripción</h3>
            <p className="section-desc">Estos valores alteran en tiempo real el comportamiento de cuotas de swipes y costos en la plataforma.</p>

            {loadingSettings ? (
              <div className="loading-spinner">Cargando configuraciones...</div>
            ) : errorSettings ? (
              <div className="error-box">Error al cargar configuraciones: {errorSettings.message}</div>
            ) : (
              <form onSubmit={handleSettingsSubmit} className="admin-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="dailySwipeLimitFree">Límite Swipes Diarios (Free)</label>
                    <input 
                      type="number" 
                      id="dailySwipeLimitFree" 
                      name="dailySwipeLimitFree" 
                      defaultValue={globalSettings?.dailySwipeLimitFree} 
                      min="0"
                      required 
                    />
                    <small className="form-help-text">Cantidad máxima de tarjetas que puede deslizar un usuario gratuito por día.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="dailySwipeLimitPremium">Límite Swipes Diarios (Premium)</label>
                    <input 
                      type="number" 
                      id="dailySwipeLimitPremium" 
                      name="dailySwipeLimitPremium" 
                      defaultValue={globalSettings?.dailySwipeLimitPremium} 
                      min="0"
                      required 
                    />
                    <small className="form-help-text">Cuota asignada para cuentas Premium.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="monthlyMatchLimitFree">Límite Matches Mensuales (Free)</label>
                    <input 
                      type="number" 
                      id="monthlyMatchLimitFree" 
                      name="monthlyMatchLimitFree" 
                      defaultValue={globalSettings?.monthlyMatchLimitFree ?? 2} 
                      min="0"
                      required 
                    />
                    <small className="form-help-text">Cantidad de trueques permitidos por mes para cuentas gratuitas.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="monthlyMatchLimitPremium">Límite Matches Mensuales (Premium)</label>
                    <input 
                      type="number" 
                      id="monthlyMatchLimitPremium" 
                      name="monthlyMatchLimitPremium" 
                      defaultValue={globalSettings?.monthlyMatchLimitPremium ?? 5} 
                      min="0"
                      required 
                    />
                    <small className="form-help-text">Cantidad máxima de trueques creados por mes.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="basicPlanPriceUsd">Precio Plan Básico (USD)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      id="basicPlanPriceUsd" 
                      name="basicPlanPriceUsd" 
                      defaultValue={globalSettings?.basicPlanPriceUsd} 
                      min="0"
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="premiumPlanPriceUsd">Precio Plan Premium (CLP)</label>
                    <input 
                      type="number" 
                      step="1" 
                      id="premiumPlanPriceUsd" 
                      name="premiumPlanPriceUsd" 
                      defaultValue={globalSettings?.premiumPlanPriceUsd} 
                      min="0"
                      required 
                    />
                    <small className="form-help-text">Monto cobrado en Webpay Plus para activar la membresía Premium.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="searchKeywordsLimitPremium">Límite Palabras Clave por Búsqueda (Premium)</label>
                    <input 
                      type="number" 
                      id="searchKeywordsLimitPremium" 
                      name="searchKeywordsLimitPremium" 
                      defaultValue={globalSettings?.searchKeywordsLimitPremium ?? 10} 
                      min="1"
                      required 
                    />
                    <small className="form-help-text">Máximo de palabras clave / términos permitidos en las búsquedas del catálogo avanzado.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="feePercentage">Fee de Intercambio (%)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      id="feePercentage" 
                      name="feePercentage" 
                      defaultValue={globalSettings ? globalSettings.feePercentage * 100 : 30} 
                      min="0"
                      max="100"
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="minFeeAmount">Monto Mínimo Fee (CLP)</label>
                    <input 
                      type="number" 
                      id="minFeeAmount" 
                      name="minFeeAmount" 
                      defaultValue={globalSettings?.minFeeAmount} 
                      min="0"
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="maxFeeAmount">Monto Máximo Fee (CLP)</label>
                    <input 
                      type="number" 
                      id="maxFeeAmount" 
                      name="maxFeeAmount" 
                      defaultValue={globalSettings?.maxFeeAmount} 
                      min="0"
                      required 
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="save-btn" 
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? 'Guardando...' : 'Guardar Ajustes'}
                  </button>
                  {globalSettings?.lastUpdatedAt && (
                    <span className="last-updated">
                      Última modificación: {new Date(globalSettings.lastUpdatedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB GESTIÓN SENIOR DE USUARIOS */}
        {activeTab === 'users' && (
          <div className="admin-settings-section">
            {/* KPI Metrics Summary Bar */}
            <div className="admin-metrics-bar">
              <div className="admin-metric-card">
                <div className="admin-metric-icon users">
                  <i className="fa-solid fa-users"></i>
                </div>
                <div>
                  <div className="admin-metric-value">{userMetrics.total}</div>
                  <div className="admin-metric-label">Usuarios Registrados</div>
                </div>
              </div>

              <div className="admin-metric-card">
                <div className="admin-metric-icon active">
                  <i className="fa-solid fa-user-check"></i>
                </div>
                <div>
                  <div className="admin-metric-value">{userMetrics.active}</div>
                  <div className="admin-metric-label">Cuentas Activas</div>
                </div>
              </div>

              <div className="admin-metric-card">
                <div className="admin-metric-icon blocked">
                  <i className="fa-solid fa-user-slash"></i>
                </div>
                <div>
                  <div className="admin-metric-value">{userMetrics.blocked}</div>
                  <div className="admin-metric-label">Cuentas Bloqueadas</div>
                </div>
              </div>

              <div className="admin-metric-card">
                <div className="admin-metric-icon premium">
                  <i className="fa-solid fa-crown"></i>
                </div>
                <div>
                  <div className="admin-metric-value">{userMetrics.premium}</div>
                  <div className="admin-metric-label">Membresías Premium</div>
                </div>
              </div>
            </div>

            {/* Controls Toolbar: Search, Category Filter Pills & View Switcher */}
            <div className="admin-toolbar">
              <div className="admin-search-wrapper">
                <i className="fa-solid fa-magnifying-glass admin-search-icon"></i>
                <input 
                  type="text" 
                  placeholder="Buscar por Nombre, Email, DNI/RUT, País o Teléfono..." 
                  value={userSearchFilter}
                  onChange={(e) => setUserSearchFilter(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              <div className="admin-filter-pills">
                <button 
                  className={`admin-filter-pill ${userFilterTab === 'all' ? 'active' : ''}`}
                  onClick={() => setUserFilterTab('all')}
                >
                  Todos ({adminUsers?.length || 0})
                </button>
                <button 
                  className={`admin-filter-pill ${userFilterTab === 'active' ? 'active' : ''}`}
                  onClick={() => setUserFilterTab('active')}
                >
                  🟢 Activos ({userMetrics.active})
                </button>
                <button 
                  className={`admin-filter-pill ${userFilterTab === 'blocked' ? 'active' : ''}`}
                  onClick={() => setUserFilterTab('blocked')}
                >
                  🔴 Bloqueados ({userMetrics.blocked})
                </button>
                <button 
                  className={`admin-filter-pill ${userFilterTab === 'premium' ? 'active' : ''}`}
                  onClick={() => setUserFilterTab('premium')}
                >
                  ⭐ Premium ({userMetrics.premium})
                </button>
                <button 
                  className={`admin-filter-pill ${userFilterTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setUserFilterTab('admin')}
                >
                  🛡️ Admins
                </button>
              </div>

              {/* <div className="admin-view-toggle">
                <button 
                  className={`admin-view-toggle-btn ${userViewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setUserViewMode('table')}
                  title="Vista de Tabla Analítica"
                >
                  <i className="fa-solid fa-table-list"></i>
                </button>
                <button 
                  className={`admin-view-toggle-btn ${userViewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setUserViewMode('grid')}
                  title="Vista de Tarjetas"
                >
                  <i className="fa-solid fa-border-all"></i>
                </button>
              </div> */}
            </div>

            {loadingUsers ? (
              <div className="loading-spinner">Cargando directorio de usuarios...</div>
            ) : errorUsers ? (
              <div className="error-box">Error al cargar usuarios: {errorUsers.message}</div>
            ) : !filteredUsers || filteredUsers.length === 0 ? (
              <div className="warning-requirements-box admin-empty-logistics-box">
                No se encontraron usuarios que coincidan con los criterios de búsqueda o filtro.
              </div>
            ) : userViewMode === 'table' ? (
              /* VISTA DE TABLA ANALÍTICA */
              <div className="admin-table-container">
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Documento & País</th>
                      <th>Plan / Rol</th>
                      <th>Estatus</th>
                      <th>Libros</th>
                      <th>Registro</th>
                      <th className="admin-table-header-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className={u.isBlocked ? 'blocked-row' : ''}>
                        <td>
                          <div className="admin-table-user-cell">
                            {u.profileImageUrl ? (
                              <img src={u.profileImageUrl} alt={u.name} className="admin-user-avatar admin-user-avatar-sm" />
                            ) : (
                              <div className="admin-user-avatar-placeholder admin-user-avatar-sm">
                                {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}
                            <div>
                              <div className="admin-user-name-cell">{u.name || 'Sin nombre'}</div>
                              <div className="admin-user-email-cell">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="admin-user-doc-cell">{u.documentoIdentidad || 'Sin registro'}</div>
                          <div className="admin-user-country-cell">📍 {u.pais || 'No especificado'}</div>
                        </td>
                        <td>
                          <div className="admin-badges-cell">
                            <span className={`admin-badge ${u.isPremium ? 'premium' : 'free'}`}>
                              {u.isPremium ? `⭐ ${u.subscriptionPlan}` : 'Free'}
                            </span>
                            {u.role === 'Admin' && (
                              <span className="admin-badge admin">Admin</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="admin-status-cell">
                            <span className={`admin-status-dot ${u.isBlocked ? 'blocked' : 'active'}`}></span>
                            <span className={`admin-badge ${u.isBlocked ? 'blocked' : 'active'}`}>
                              {u.isBlocked ? '🔴 Bloqueada' : '🟢 Activa'}
                            </span>
                          </span>
                        </td>
                        <td>
                          <strong className="admin-books-count-val">📚 {u.booksCount}</strong>
                        </td>
                        <td>
                          <span className="admin-date-cell">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="admin-table-header-right">
                          <div className="admin-table-actions-cell">
                            <button 
                              type="button"
                              onClick={() => setSelectedUserDetail(u)}
                              className="admin-view-user-btn admin-table-action-btn"
                            >
                              <i className="fa-solid fa-eye"></i> Detalle
                            </button>

                            <button 
                              type="button"
                              disabled={toggleBlockUserMutation.isPending}
                              onClick={() => {
                                const action = u.isBlocked ? 'desbloquear' : 'bloquear';
                                if (window.confirm(`¿Estás seguro de que deseas ${action} a ${u.name || u.email}?`)) {
                                  toggleBlockUserMutation.mutate(u.id);
                                }
                              }}
                              className={`admin-block-user-btn ${u.isBlocked ? 'unblock' : 'block'} admin-table-action-btn`}
                            >
                              {u.isBlocked ? <><i className="fa-solid fa-unlock"></i> Desbloquear</> : <><i className="fa-solid fa-ban"></i> Bloquear</>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* VISTA DE TARJETAS VISUALES GRID */
              <div className="admin-users-grid">
                {filteredUsers.map((u) => (
                  <div key={u.id} className={`admin-user-card ${u.isBlocked ? 'blocked' : ''}`}>
                    <div className="admin-user-card-header">
                      {u.profileImageUrl ? (
                        <img src={u.profileImageUrl} alt={u.name} className="admin-user-avatar" />
                      ) : (
                        <div className="admin-user-avatar-placeholder">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="admin-user-info">
                        <div className="admin-user-name">{u.name || 'Sin nombre'}</div>
                        <div className="admin-user-email">{u.email}</div>
                        <div className="admin-user-badges">
                          <span className={`admin-badge ${u.role === 'Admin' ? 'admin' : 'user'}`}>
                            {u.role}
                          </span>
                          <span className={`admin-badge ${u.isPremium ? 'premium' : 'free'}`}>
                            {u.isPremium ? `⭐ ${u.subscriptionPlan}` : 'Free'}
                          </span>
                          <span className={`admin-badge ${u.isBlocked ? 'blocked' : 'active'}`}>
                            {u.isBlocked ? '🔴 Bloqueado' : '🟢 Activo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="admin-user-details-mini">
                      <div>📚 Libros: <strong>{u.booksCount}</strong></div>
                      <div>📍 País: <strong>{u.pais || 'N/D'}</strong></div>
                      <div>🆔 Doc: <strong>{u.documentoIdentidad || 'N/D'}</strong></div>
                      <div>📅 Registro: <strong>{new Date(u.createdAt).toLocaleDateString()}</strong></div>
                    </div>

                    <div className="admin-user-actions">
                      <button 
                        type="button"
                        onClick={() => setSelectedUserDetail(u)}
                        className="admin-view-user-btn"
                      >
                        <i className="fa-solid fa-eye"></i> Detalle
                      </button>

                      <button 
                        type="button"
                        disabled={toggleBlockUserMutation.isPending}
                        onClick={() => {
                          const action = u.isBlocked ? 'desbloquear' : 'bloquear';
                          if (window.confirm(`¿Estás seguro de que deseas ${action} a ${u.name || u.email}?`)) {
                            toggleBlockUserMutation.mutate(u.id);
                          }
                        }}
                        className={`admin-block-user-btn ${u.isBlocked ? 'unblock' : 'block'}`}
                      >
                        {u.isBlocked ? <><i className="fa-solid fa-unlock"></i> Desbloquear</> : <><i className="fa-solid fa-ban"></i> Bloquear</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="admin-tags-section">
            <div className="admin-tags-header">
              <div>
                <h3>Catálogo Maestro de Gustos & Mapeo Dinámico</h3>
                <p className="section-desc">Administra las opciones de gustos que ven los usuarios y asigna dinámicamente qué categorías o subcategorías reales de la tienda le corresponden a cada gusto.</p>
              </div>
              <button 
                type="button"
                onClick={openCreateModal}
                className="add-btn admin-add-gusto-btn"
              >
                <i className="fa-solid fa-plus"></i> Crear Nuevo Gusto
              </button>
            </div>

            {loadingTags ? (
              <div className="loading-spinner">Cargando catálogo de gustos dinámico...</div>
            ) : errorTags ? (
              <div className="error-box">Error al cargar gustos: {errorTags.message}</div>
            ) : (
              <div className="tags-grid admin-tags-grid">
                {preferenceTags?.map((tag) => (
                  <div key={tag.id} className={`tag-card admin-tag-card-content ${tag.isActive ? 'active' : 'inactive'}`}>
                    <div className="admin-tag-card-header">
                      <span className="tag-name admin-tag-card-title">{tag.name}</span>
                      <button 
                        onClick={() => handleToggleTagActive(tag)} 
                        className={`status-toggle-btn ${tag.isActive ? 'deactivate' : 'activate'}`}
                        title={tag.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {tag.isActive ? <><i className="fa-solid fa-circle-check icon-active-green"></i> Activo</> : <><i className="fa-solid fa-circle-xmark icon-inactive-red"></i> Inactivo</>}
                      </button>
                    </div>

                    {tag.description && (
                      <p className="admin-tag-card-desc">
                        {tag.description}
                      </p>
                    )}

                    <div className="admin-tag-mapping-box">
                      <div className="admin-tag-mapping-title">
                        🎯 Mapeo ({tag.mappedCategories?.length || 0} asignadas):
                      </div>
                      <div className="admin-tag-mapping-list">
                        {tag.mappedCategories && tag.mappedCategories.length > 0 ? (
                          tag.mappedCategories.map((m, idx) => (
                            <span key={idx} className="admin-tag-mapping-badge">
                              {m.subcategoryName ? `${m.categoryName} > ${m.subcategoryName}` : m.categoryName}
                            </span>
                          ))
                        ) : (
                          <span className="admin-tag-mapping-empty">Sin categorías asignadas aún.</span>
                        )}
                      </div>
                    </div>

                    <div className="tag-actions admin-tag-card-actions">
                      <button 
                        onClick={() => openEditModal(tag)} 
                        className="upgrade-pill-btn admin-map-categories-btn"
                      >
                        <i className="fa-solid fa-pen-to-square"></i> Mapear Categorías
                      </button>

                      {/* <button 
                        onClick={() => handleDeleteTag(tag.id)} 
                        className="delete-tag-btn"
                        title="Eliminar permanentemente"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button> */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logistics' && (
          <div className="admin-settings-section">
            <h3>Gestión de Recepción de Libros Físicos (Administración Bookmachs)</h3>
            <p className="section-subtitle admin-section-subtitle">
              Revisa los intercambios que se encuentran en estatus <strong>"En Espera"</strong> por entrega presencial o envío por encomienda. Haz clic en "Confirmar Recepción" para marcar el libro como recibido.
            </p>

            {loadingLogistics ? (
              <div className="loading-spinner">Cargando intercambios en espera...</div>
            ) : errorLogistics ? (
              <div className="error-box">Error al cargar intercambios: {errorLogistics.message}</div>
            ) : !pendingLogistics || pendingLogistics.length === 0 ? (
              <div className="warning-requirements-box admin-empty-logistics-box">
                ✓ No hay intercambios pendientes de confirmación en este momento.
              </div>
            ) : (
              <div className="tags-grid admin-logistics-grid">
                {pendingLogistics.map((item) => (
                  <div key={item.id} className="tag-card active admin-logistics-card">
                    <div className="admin-logistics-card-body">
                      <img src={item.bookImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100'} alt={item.bookTitle} className="admin-logistics-book-img" />
                      <div>
                        <strong className="admin-logistics-book-title">{item.bookTitle}</strong>
                        <div className="admin-logistics-book-user">Solicitado por: <strong>{item.requesterName}</strong></div>
                        <div className="admin-logistics-book-status">
                          Estatus: {item.logisticsStatus} ({item.logisticsMethod || 'Presencial'})
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={confirmReceiptMutation.isPending}
                      onClick={() => confirmReceiptMutation.mutate(item.id)}
                      className="checkout-proceed-btn font-heading btn-accept-checkout admin-confirm-receipt-btn"
                    >
                      {confirmReceiptMutation.isPending ? 'Confirmando...' : '✓ Confirmar Recepción de Libro'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SENIOR UX MODAL DETALLE DE USUARIO */}
      {selectedUserDetail && (
        <div className="modal-overlay">
          <div className="modal-card admin-modal-card-user">
            <div className="admin-modal-user-banner">
              <button 
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="admin-modal-user-banner-close"
                title="Cerrar ventana"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>

              <div className="admin-modal-user-profile-header">
                {selectedUserDetail.profileImageUrl ? (
                  <img src={selectedUserDetail.profileImageUrl} alt={selectedUserDetail.name} className="admin-modal-user-avatar-large" />
                ) : (
                  <div className="admin-modal-user-avatar-placeholder-large">
                    {selectedUserDetail.name ? selectedUserDetail.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="admin-modal-user-info-large">
                  <h2>{selectedUserDetail.name || 'Usuario Sin Nombre'}</h2>
                  <p>{selectedUserDetail.email}</p>
                  <div className="admin-user-badges">
                    <span className={`admin-badge ${selectedUserDetail.role === 'Admin' ? 'admin' : 'user'}`}>
                      Rol: {selectedUserDetail.role}
                    </span>
                    <span className={`admin-badge ${selectedUserDetail.isPremium ? 'premium' : 'free'}`}>
                      Plan: {selectedUserDetail.subscriptionPlan}
                    </span>
                    <span className={`admin-badge ${selectedUserDetail.isBlocked ? 'blocked' : 'active'}`}>
                      {selectedUserDetail.isBlocked ? '🔴 Bloqueada' : '🟢 Activa'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal-user-grid-info">
              <div className="admin-info-group">
                <div className="admin-info-group-title">
                  <i className="fa-solid fa-address-card"></i> Identidad y Contacto
                </div>

                <div className="admin-user-detail-row">
                  <span className="admin-user-detail-label">RUT / DNI:</span>
                  <span className="admin-user-detail-val">{selectedUserDetail.documentoIdentidad || 'No registrado'}</span>
                </div>

                <div className="admin-user-detail-row">
                  <span className="admin-user-detail-label">País:</span>
                  <span className="admin-user-detail-val">📍 {selectedUserDetail.pais || 'No especificado'}</span>
                </div>

                <div className="admin-user-detail-row">
                  <span className="admin-user-detail-label">Teléfono:</span>
                  <span className="admin-user-detail-val">📞 {selectedUserDetail.telefono || 'No especificado'}</span>
                </div>

                <div className="admin-user-detail-row">
                  <span className="admin-user-detail-label">Fecha Registro:</span>
                  <span className="admin-user-detail-val">{new Date(selectedUserDetail.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="admin-info-group">
                <div className="admin-info-group-title">
                  <i className="fa-solid fa-book-bookmark"></i> Actividad y Suscripción
                </div>

                <div className="admin-user-detail-row">
                  <span className="admin-user-detail-label">Libros en Libreta:</span>
                  <span className="admin-user-detail-val admin-books-count-neon">📚 {selectedUserDetail.booksCount} publicaciones</span>
                </div>

                <div className="admin-user-detail-row">
                  <span className="admin-user-detail-label">Estado de Cuenta:</span>
                  <span className="admin-user-detail-val">
                    {selectedUserDetail.isBlocked ? '🔴 Bloqueada por Admin' : '🟢 Activo en Plataforma'}
                  </span>
                </div>

                <div className="admin-pref-block">
                  <span className="admin-pref-block-label">
                    🎯 Preferencias Registradas ({selectedUserDetail.preferences?.length || 0}):
                  </span>
                  <div className="admin-pref-tags-container">
                    {selectedUserDetail.preferences && selectedUserDetail.preferences.length > 0 ? (
                      selectedUserDetail.preferences.map((pref, idx) => (
                        <span key={idx} className="admin-tag-mapping-badge">
                          {pref}
                        </span>
                      ))
                    ) : (
                      <span className="admin-pref-tags-empty">Sin etiquetas guardadas.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal-user-footer">
              <div className="admin-modal-btn-group">
                <button
                  type="button"
                  disabled={toggleAdminRoleMutation.isPending}
                  onClick={() => {
                    const action = selectedUserDetail.role === 'Admin' ? 'revocar el rol de Administrador a' : 'conceder el rol de Administrador a';
                    if (window.confirm(`¿Estás seguro de que deseas ${action} ${selectedUserDetail.name || selectedUserDetail.email}?`)) {
                      toggleAdminRoleMutation.mutate(selectedUserDetail.id);
                    }
                  }}
                  className="admin-role-toggle-btn"
                >
                  {selectedUserDetail.role === 'Admin' ? (
                    <><i className="fa-solid fa-user-minus"></i> Quitar Rol Admin</>
                  ) : (
                    <><i className="fa-solid fa-user-shield"></i> Hacer Administrador</>
                  )}
                </button>

                <button 
                  type="button"
                  disabled={toggleBlockUserMutation.isPending}
                  onClick={() => {
                    const action = selectedUserDetail.isBlocked ? 'desbloquear' : 'bloquear';
                    if (window.confirm(`¿Estás seguro de que deseas ${action} a ${selectedUserDetail.name || selectedUserDetail.email}?`)) {
                      toggleBlockUserMutation.mutate(selectedUserDetail.id);
                    }
                  }}
                  className={`admin-block-user-btn ${selectedUserDetail.isBlocked ? 'unblock' : 'block'}`}
                >
                  {selectedUserDetail.isBlocked ? <><i className="fa-solid fa-unlock"></i> Desbloquear Cuenta</> : <><i className="fa-solid fa-ban"></i> Bloquear Acceso</>}
                </button>
              </div>

              <button 
                type="button" 
                onClick={() => setSelectedUserDetail(null)} 
                className="cancel-btn"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDICIÓN DE GUSTO Y MAPEO DE CATEGORÍAS REALES */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card admin-modal-card">
            <div className="admin-modal-close-bar">
              <button 
                type="button" 
                onClick={closeModal} 
                className="admin-modal-banner-close"
                title="Cerrar ventana"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveTagModal} className="admin-modal-form-body">
              <div className="modal-header">
                <h2>{editingTag ? 'Editar Gusto y Mapeo' : 'Nuevo Gusto de Usuario'}</h2>
                <p>Asigna qué categorías y subcategorías reales de la tienda le corresponden a este concepto.</p>
              </div>
              <div className="modal-field admin-modal-field-gap">
                <label>Nombre del Gusto / Concepto</label>
                <input 
                  type="text" 
                  placeholder="Ej: Ficción, Novelas y Relatos" 
                  value={tagNameInput} 
                  onChange={(e) => setTagNameInput(e.target.value)} 
                  required 
                />
              </div>

              <div className="modal-field admin-modal-field-gap">
                <label>Descripción Informativa</label>
                <textarea 
                  placeholder="Ej: Novelas de ficción, histórica, ciencia ficción, romance y misterio." 
                  value={tagDescInput} 
                  onChange={(e) => setTagDescInput(e.target.value)} 
                  rows={2}
                  className="admin-modal-textarea"
                />
              </div>

              <div className="modal-field admin-modal-field-checkbox">
                <input 
                  type="checkbox" 
                  id="tagActiveCheck"
                  checked={tagActiveInput}
                  onChange={(e) => setTagActiveInput(e.target.checked)}
                />
                <label htmlFor="tagActiveCheck" className="admin-checkbox-label">Gusto Activo en Cuestionario</label>
              </div>

              <div className="admin-modal-tree-section">
                <label className="admin-modal-tree-label">
                  📂 Selecciona las Categorías y Subcategorías Reales (Ecolectura)
                </label>
                <p className="admin-modal-tree-desc">
                  Los libros que pertenezcan a las subcategorías marcadas serán recomendados a los usuarios que elijan este gusto.
                </p>

                <div className="admin-modal-tree-container">
                  {categoryTree && categoryTree.length > 0 ? (
                    categoryTree.map((cat) => (
                      <div key={cat.categoryId} className="admin-tree-cat-group">
                        <div className="admin-tree-cat-header">
                          <input 
                            type="checkbox"
                            checked={isMappingSelected(cat.categoryId, null)}
                            onChange={() => toggleMapping(cat.categoryId, cat.categoryName, null, null)}
                          />
                          <span>{cat.categoryName} (Toda la categoría)</span>
                        </div>

                        <div className="admin-tree-subcat-grid">
                          {cat.subcategories && cat.subcategories.map((sub) => {
                            const selected = isMappingSelected(cat.categoryId, sub.subcategoryId);
                            return (
                              <label key={sub.subcategoryId} className={`admin-tree-subcat-item ${selected ? 'selected' : ''}`}>
                                <input 
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleMapping(cat.categoryId, cat.categoryName, sub.subcategoryId, sub.subcategoryName)}
                                />
                                {sub.subcategoryName}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="admin-tree-loading">Cargando árbol de categorías reales...</div>
                  )}
                </div>
              </div>

              <div className="admin-modal-actions">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="cancel-btn"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="modal-submit-btn admin-modal-submit-btn"
                  disabled={createTagMutation.isPending || updateTagMutation.isPending}
                >
                  {createTagMutation.isPending || updateTagMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
