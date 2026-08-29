import React from 'react';
import { getPreferenceTagIcon } from '../../../lib/formatters';

export interface PreferenceTag {
  id: number;
  name: string;
  isActive: boolean;
}

export interface PreferencesCardProps {
  tags: PreferenceTag[];
  selectedTags: string[];
  onTagToggle: (tagName: string) => void;
  onSave: () => void;
  loadingTags?: boolean;
  saving?: boolean;
  error?: string | null;
  successMessage?: string | null;
  submitButtonText?: string;
  submitButtonIcon?: string;
  title?: string;
  subtitle?: string;
}

export const PreferencesCard: React.FC<PreferencesCardProps> = ({
  tags,
  selectedTags,
  onTagToggle,
  onSave,
  loadingTags = false,
  saving = false,
  error = null,
  successMessage = null,
  submitButtonText = 'Guardar Preferencias',
  submitButtonIcon,
  title = 'Intereses y Preferencias',
  subtitle = 'Selecciona tus categorías literarias de preferencia. El algoritmo de IA priorizará los libros que coincidan con estos intereses.'
}) => {
  return (
    <div className="profile-card">
      <h2>{title}</h2>
      <p className="profile-subtitle">{subtitle}</p>

      {error && <div className="wizard-error">{error}</div>}
      {successMessage && (
        <div className="pref-success-alert">
          <i className="fa-solid fa-circle-check"></i> {successMessage}
        </div>
      )}

      {loadingTags ? (
        <div className="wizard-loading wizard-loading-padded">Cargando tus gustos de lectura...</div>
      ) : (
        <>
          <div className="profile-tags-grid">
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`wizard-tag-item profile-tag-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onTagToggle(tag.name)}
                >
                  <span className="tag-icon">
                    {isSelected ? (
                      <i className="fa-solid fa-check"></i>
                    ) : (
                      <i className={`fa-solid ${getPreferenceTagIcon(tag.name)}`}></i>
                    )}
                  </span>
                  <span className="tag-label">{tag.name}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onSave}
            className="modal-submit-btn profile-save-prefs-btn"
            disabled={saving || selectedTags.length === 0}
          >
            {saving ? (
              'Guardando...'
            ) : (
              <>
                {submitButtonText}
                {submitButtonIcon && <i className={submitButtonIcon} style={{ marginLeft: '0.5rem' }}></i>}
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
};
