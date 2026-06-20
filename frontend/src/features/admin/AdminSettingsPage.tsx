import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

interface GlobalSettings {
  id: number;
  dailySwipeLimitFree: number;
  dailySwipeLimitPremium: number;
  basicPlanPriceUsd: number;
  premiumPlanPriceUsd: number;
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

export const AdminSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'global' | 'tags'>('global');
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
          ⚙️ Ajustes Globales
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
          onClick={() => setActiveTab('tags')}
        >
          🏷️ Catálogo de Gustos
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
                    <label htmlFor="dailySwipeLimitFree">Límite Diario Swipes (Gratis)</label>
                    <input 
                      type="number" 
                      id="dailySwipeLimitFree" 
                      name="dailySwipeLimitFree" 
                      defaultValue={globalSettings?.dailySwipeLimitFree} 
                      min="0"
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="dailySwipeLimitPremium">Límite Diario Swipes (Premium)</label>
                    <input 
                      type="number" 
                      id="dailySwipeLimitPremium" 
                      name="dailySwipeLimitPremium" 
                      defaultValue={globalSettings?.dailySwipeLimitPremium} 
                      min="0"
                      required 
                    />
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
                    <label htmlFor="premiumPlanPriceUsd">Precio Plan Full (USD)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      id="premiumPlanPriceUsd" 
                      name="premiumPlanPriceUsd" 
                      defaultValue={globalSettings?.premiumPlanPriceUsd} 
                      min="0"
                      required 
                    />
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
                {createTagMutation.isPending ? 'Agregando...' : '➕ Agregar'}
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
                        {tag.isActive ? '🟢 Activo' : '🔴 Inactivo'}
                      </button>
                      <button 
                        onClick={() => handleDeleteTag(tag.id)} 
                        className="delete-tag-btn"
                        title="Eliminar permanentemente"
                      >
                        🗑️
                      </button>
                    </div>
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
