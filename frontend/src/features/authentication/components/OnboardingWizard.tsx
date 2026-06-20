import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../../../lib/apiClient';

interface OnboardingWizardProps {
  onComplete: () => void;
}

interface PreferenceTag {
  id: number;
  name: string;
  isActive: boolean;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const { user, login } = useAuthStore();
  
  // Determinar el paso inicial
  const needsProfileUpdate = !user?.pais || !user?.documentoIdentidad;
  const [step, setStep] = useState(needsProfileUpdate ? 1 : 2);
  
  // Paso 1: Datos faltantes (SSO Google)
  const [pais, setPais] = useState('Chile');
  const [documento, setDocumento] = useState('');
  
  // Paso 2: Cuestionario de gustos
  const [tags, setTags] = useState<PreferenceTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar etiquetas del catálogo maestro
  useEffect(() => {
    if (step === 2) {
      const fetchTags = async () => {
        setLoadingTags(true);
        setError(null);
        try {
          const response = await apiClient.get<PreferenceTag[]>('/MasterPreferenceTags?onlyActive=true');
          setTags(response);
        } catch (err: unknown) {
          if (err instanceof Error) {
            setError(err.message || 'Error al cargar el catálogo de gustos.');
          } else {
            setError('Error inesperado al cargar las preferencias.');
          }
        } finally {
          setLoadingTags(false);
        }
      };
      fetchTags();
    }
  }, [step]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post<{
        id: string;
        email: string;
        name: string;
        documentoIdentidad: string;
        pais: string;
        role: string;
        isPremium: boolean;
        token: string;
      }>('/auth/update-profile', {
        pais,
        documentoIdentidad: documento
      });

      // Actualizar el store de auth
      login(response, response.token);
      
      // Ir al paso 2
      setStep(2);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Error al guardar los datos del perfil.');
      } else {
        setError('Error inesperado al guardar los datos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleFinish = async () => {
    setError(null);

    // US-03 Escenario 2: No permitir avanzar sin seleccionar al menos 1 preferencia
    if (selectedTags.length === 0) {
      setError('Debes seleccionar al menos una preferencia de lectura para que la IA personalice tus recomendaciones.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post<boolean>('/auth/preferences', selectedTags);
      onComplete();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Error al guardar tus gustos de lectura.');
      } else {
        setError('Error inesperado al guardar tus gustos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-wizard-container">
      <div className="wizard-progress-bar">
        <div className={`progress-step ${step >= 1 ? 'active font-heading' : 'font-heading'}`}>
          1. Datos de Registro
        </div>
        <div className={`progress-step ${step >= 2 ? 'active font-heading' : 'font-heading'}`}>
          2. Gustos de Lectura
        </div>
      </div>

      {error && <div className="wizard-error">{error}</div>}

      {step === 1 && (
        <div className="wizard-step-card">
          <h2>📝 Completa tu perfil</h2>
          <p>Para habilitar los intercambios seguros, necesitamos confirmar tu identidad.</p>
          
          <form onSubmit={handleStep1Submit} className="wizard-form">
            <div className="wizard-field">
              <label>País de Residencia</label>
              <select value={pais} onChange={(e) => setPais(e.target.value)} required>
                <option value="Chile">Chile</option>
                <option value="Argentina">Argentina</option>
                <option value="Colombia">Colombia</option>
                <option value="México">México</option>
                <option value="Perú">Perú</option>
              </select>
            </div>

            <div className="wizard-field">
              <label>{pais === 'Chile' ? 'RUT' : 'Documento de Identidad'}</label>
              <input
                type="text"
                placeholder={pais === 'Chile' ? '12.345.678-9' : 'Número de Documento'}
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="wizard-btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Siguiente Paso ➡️'}
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-step-card">
          <h2>📚 ¿Cuáles son tus intereses de lectura?</h2>
          <p>Selecciona las categorías que más te gusten. Esto afinará el algoritmo de IA en vivo.</p>

          {loadingTags ? (
            <div className="wizard-loading">Cargando catálogo maestro...</div>
          ) : (
            <>
              <div className="wizard-tags-grid">
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`wizard-tag-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleTagToggle(tag.name)}
                    >
                      <span className="tag-icon">{isSelected ? '✓' : '📖'}</span>
                      <span className="tag-label">{tag.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="wizard-actions">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="wizard-btn-primary"
                  disabled={loading || selectedTags.length === 0}
                >
                  {loading ? 'Guardando...' : 'Finalizar y Empezar a Swipear 🎉'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
