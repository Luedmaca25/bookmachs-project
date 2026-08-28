import React, { useState } from 'react';
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

interface MasterPreferenceTag {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
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

export const AdminSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'global' | 'tags' | 'logistics'>('global');
  const [newTagName, setNewTagName] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  const { data: pendingLogistics, isLoading: loadingLogistics, error: errorLogistics } = useQuery<PendingMatch[]>({
    queryKey: ['pendingLogistics'],
    queryFn: () => apiClient.get<PendingMatch[]>('/transactions/pending-admin'),
  });

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

  // Mutations
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
    mutationFn: (newTag: { name: string; isActive: boolean }) => apiClient.post<MasterPreferenceTag>('/masterpreferencetags', newTag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferenceTags'] });
      setNewTagName('');
      showToast('Etiqueta agregada al catálogo maestro.', 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || 'Error al agregar la etiqueta.', 'error');
    }
  });

  const updateTagMutation = useMutation({
    mutationFn: (tag: { id: number; name: string; isActive: boolean }) => apiClient.put<MasterPreferenceTag>(`/masterpreferencetags/${tag.id}`, tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferenceTags'] });
      showToast('Etiqueta actualizada correctamente.', 'success');
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
      feePercentage: parseFloat(formData.get('feePercentage') as string) / 100, // guardar como fraccion (ej: 0.30)
      minFeeAmount: parseFloat(formData.get('minFeeAmount') as string),
      maxFeeAmount: parseFloat(formData.get('maxFeeAmount') as string),
    };

    updateSettingsMutation.mutate(updated);
  };

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    createTagMutation.mutate({ name: newTagName.trim(), isActive: true });
  };

  const handleToggleTagActive = (tag: MasterPreferenceTag) => {
    updateTagMutation.mutate({
      id: tag.id,
      name: tag.name,
      isActive: !tag.isActive
    });
  };

  const handleDeleteTag = (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta etiqueta? Esto podría afectar a los perfiles de usuario que la tengan seleccionada.')) {
      deleteTagMutation.mutate(id);
    }
  };

  return (
    <div className="admin-cms-container">
      <div className="admin-cms-header">
        <h2>Panel CMS de Administración</h2>
        <p>Configura las reglas del negocio, los límites del sistema y alimenta el cuestionario dinámico.</p>
      </div>

      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`}
          onClick={() => setActiveTab('global')}
        >
          <i className="fa-solid fa-gears"></i> Ajustes Globales
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          <i className="fa-solid fa-tags"></i> Catálogo de Gustos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'logistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('logistics')}
        >
          <i className="fa-solid fa-boxes-packing"></i> Intercambios en Espera
        </button>
      </div>

      <div className="admin-tab-content">
        {activeTab === 'global' && (
          <div className="admin-settings-section">
            <h3>Parametrización del Sistema</h3>
            {loadingSettings ? (
              <div className="loading-spinner">Cargando configuraciones...</div>
            ) : errorSettings ? (
              <div className="error-box">Error al cargar configuraciones: {errorSettings.message}</div>
            ) : (
              <form onSubmit={handleSettingsSubmit} className="admin-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="dailySwipeLimitFree">Límite Mensual Swipes (Plan Gratuito)</label>
                    <input 
                      type="number" 
                      id="dailySwipeLimitFree" 
                      name="dailySwipeLimitFree" 
                      defaultValue={globalSettings?.dailySwipeLimitFree} 
                      min="0"
                      required 
                    />
                    <small className="form-help-text">Ciclo del 1° al último día del mes en curso.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="dailySwipeLimitPremium">Límite Mensual Swipes (Plan Premium)</label>
                    <input 
                      type="number" 
                      id="dailySwipeLimitPremium" 
                      name="dailySwipeLimitPremium" 
                      defaultValue={globalSettings?.dailySwipeLimitPremium} 
                      min="0"
                      required 
                    />
                    <small className="form-help-text">Establece 1000 o más para cuota ilimitada.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="monthlyMatchLimitFree">Límite Mensual Intercambios (Plan Gratuito)</label>
                    <input 
                      type="number" 
                      id="monthlyMatchLimitFree" 
                      name="monthlyMatchLimitFree" 
                      defaultValue={globalSettings?.monthlyMatchLimitFree ?? 2} 
                      min="0"
                      required 
                    />
                    <small className="form-help-text">Cantidad máxima de trueques creados por mes.</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="monthlyMatchLimitPremium">Límite Mensual Intercambios (Plan Premium)</label>
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

        {activeTab === 'tags' && (
          <div className="admin-tags-section">
            <h3>Catálogo Maestro de Preferencias</h3>
            <p className="section-desc">Agrega o administra los géneros literarios que verán los usuarios durante el Onboarding.</p>

            <form onSubmit={handleCreateTag} className="add-tag-form">
              <input 
                type="text" 
                placeholder="Nueva categoría (ej: Ciencia Ficción)" 
                value={newTagName} 
                onChange={(e) => setNewTagName(e.target.value)}
                maxLength={50}
                required
              />
              <button 
                type="submit" 
                className="add-btn" 
                disabled={createTagMutation.isPending}
              >
                {createTagMutation.isPending ? 'Agregando...' : <><i className="fa-solid fa-plus"></i> Agregar</>}
              </button>
            </form>

            {loadingTags ? (
              <div className="loading-spinner">Cargando catálogo maestro...</div>
            ) : errorTags ? (
              <div className="error-box">Error al cargar etiquetas: {errorTags.message}</div>
            ) : (
              <div className="tags-grid">
                {preferenceTags?.map((tag) => (
                  <div key={tag.id} className={`tag-card ${tag.isActive ? 'active' : 'inactive'}`}>
                    <span className="tag-name">{tag.name}</span>
                    <div className="tag-actions">
                      <button 
                        onClick={() => handleToggleTagActive(tag)} 
                        className={`status-toggle-btn ${tag.isActive ? 'deactivate' : 'activate'}`}
                        title={tag.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {tag.isActive ? <><i className="fa-solid fa-circle-check icon-active-green"></i> Activo</> : <><i className="fa-solid fa-circle-xmark icon-inactive-red"></i> Inactivo</>}
                      </button>
                      <button 
                        onClick={() => handleDeleteTag(tag.id)} 
                        className="delete-tag-btn"
                        title="Eliminar permanentemente"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
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
            <p className="section-subtitle" style={{ marginBottom: '1.2rem' }}>
              Revisa los intercambios que se encuentran en estatus <strong>"En Espera"</strong> por entrega presencial o envío por encomienda. Haz clic en "Confirmar Recepción" para marcar el libro como recibido.
            </p>

            {loadingLogistics ? (
              <div className="loading-spinner">Cargando intercambios en espera...</div>
            ) : errorLogistics ? (
              <div className="error-box">Error al cargar intercambios: {errorLogistics.message}</div>
            ) : !pendingLogistics || pendingLogistics.length === 0 ? (
              <div className="warning-requirements-box" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                ✓ No hay intercambios pendientes de confirmación en este momento.
              </div>
            ) : (
              <div className="tags-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {pendingLogistics.map((item) => (
                  <div key={item.id} className="tag-card active" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', gap: '0.8rem', width: '100%', alignItems: 'center' }}>
                      <img src={item.bookImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100'} alt={item.bookTitle} style={{ width: '48px', height: '64px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.bookTitle}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Solicitado por: <strong>{item.requesterName}</strong></div>
                        <div style={{ fontSize: '0.75rem', color: '#e67e22', fontWeight: 700, marginTop: '2px' }}>
                          Estatus: {item.logisticsStatus} ({item.logisticsMethod || 'Presencial'})
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={confirmReceiptMutation.isPending}
                      onClick={() => confirmReceiptMutation.mutate(item.id)}
                      className="checkout-proceed-btn font-heading btn-accept-checkout"
                      style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', marginTop: '0.2rem' }}
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
    </div>
  );
};
