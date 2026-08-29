import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { OnboardingWizard } from './components/OnboardingWizard';
import { PreferencesCard } from './components/PreferencesCard';
import { apiClient } from '../../lib/apiClient';
import { formatRut, formatPhoneByCountry, getPhonePlaceholder, getFileUrl } from '../../lib/formatters';

export const AuthenticationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login: loginAction, logout } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [documento, setDocumento] = useState('');
  const [pais, setPais] = useState('Chile');
  const [telefono, setTelefono] = useState('');

  // Profile preferences states
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [prefSuccess, setPrefSuccess] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Avatar upload states
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarError(null);
    setAvatarSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('token') || '';
      await apiClient.post<any>('/auth/avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const updatedProfile = await apiClient.get<any>('/auth/me');
      const timestampedProfile = {
        ...updatedProfile,
        profileImageUrl: updatedProfile.profileImageUrl
          ? `${updatedProfile.profileImageUrl.split('?')[0]}?t=${Date.now()}`
          : updatedProfile.profileImageUrl
      };
      loginAction(timestampedProfile, token);
      setAvatarSuccess('¡Imagen de perfil actualizada con éxito!');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAvatarError(err.message || 'Error al actualizar la imagen de perfil.');
      } else {
        setAvatarError('Error al subir la imagen de perfil.');
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  const resetFormFields = () => {
    setEmail('');
    setPassword('');
    setName('');
    setDocumento('');
    setPais('Chile');
    setTelefono('');
    setError(null);
  };

  const handleLogout = () => {
    resetFormFields();
    logout();
  };

  // Redirigir a la pantalla principal (Swipe) si el usuario ya completó el perfil y preferencias
  const checkAndRedirect = (profileData: any) => {
    const hasProfileDetails = profileData?.pais && profileData?.documentoIdentidad;
    const hasPreferences = profileData?.preferences && profileData.preferences.length > 0;
    if (hasProfileDetails && hasPreferences) {
      navigate('/');
    }
  };

  // Determine if onboarding is required
  const needsOnboarding = isAuthenticated && (
    !user?.pais || 
    !user?.documentoIdentidad || 
    (!user?.preferences || user.preferences.length === 0)
  );
  
  const showWizard = needsOnboarding && !onboardingCompleted;

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
    navigate('/');
  };

  // Google SSO Initialization
  useEffect(() => {
    if (isAuthenticated) return;

    const initializeGoogleSignIn = () => {
      const gWindow = window as any;
      if (gWindow.google) {
        gWindow.google.accounts.id.initialize({
          client_id: '417947069163-edg96tr3fgveliu5q7qq23g1kdlc98j9.apps.googleusercontent.com',
          callback: async (response: any) => {
            setLoading(true);
            setError(null);
            try {
              const apiResponse = await apiClient.post<{ 
                id: string; 
                email: string; 
                name: string; 
                documentoIdentidad: string; 
                pais: string; 
                role: string; 
                isPremium: boolean; 
                token: string 
              }>('/auth/google', { idToken: response.credential });
              
              const profile = await apiClient.get<any>('/auth/me', {
                headers: { Authorization: `Bearer ${apiResponse.token}` }
              });
              loginAction(profile, apiResponse.token);
              resetFormFields();
              checkAndRedirect(profile);
            } catch (err: unknown) {
              if (err instanceof Error) {
                setError(err.message || 'Error al iniciar sesión con Google.');
              } else {
                setError('Error inesperado al iniciar sesión con Google.');
              }
            } finally {
              setLoading(false);
            }
          }
        });

        const btnContainer = document.getElementById('google-btn-container');
        if (btnContainer) {
          const containerWidth = btnContainer.parentElement?.clientWidth || btnContainer.clientWidth || 320;
          const targetWidth = Math.min(Math.max(containerWidth, 240), 380).toString();
          gWindow.google.accounts.id.renderButton(
            btnContainer,
            { theme: 'outline', size: 'large', type: 'standard', text: 'continue_with', width: targetWidth }
          );
        }
      }
    };

    const gWindow = window as any;
    if (gWindow.google) {
      const timer = setTimeout(initializeGoogleSignIn, 100);
      return () => clearTimeout(timer);
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.body.appendChild(script);
      return () => {};
    }
  }, [isLogin, isAuthenticated]);

  // Load preference tags for Profile view
  useEffect(() => {
    if (isAuthenticated && user) {
      const fetchTags = async () => {
        setLoadingTags(true);
        setPrefError(null);
        try {
          const response = await apiClient.get<any[]>('/MasterPreferenceTags?onlyActive=true');
          const sortedTags = [...response].sort((a: any, b: any) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
          setTags(sortedTags);
        } catch (err: unknown) {
          console.error(err);
          setPrefError('Error al cargar el catálogo de gustos.');
        } finally {
          setLoadingTags(false);
        }
      };
      fetchTags();
    }
  }, [isAuthenticated, user?.id]);

  // Set initial selected tags from user preferences
  useEffect(() => {
    if (user?.preferences) {
      setSelectedTags(user.preferences);
    }
  }, [user?.preferences]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const response = await apiClient.post<{ 
          id: string; 
          email: string; 
          name: string; 
          documentoIdentidad: string; 
          pais: string; 
          role: string; 
          isPremium: boolean; 
          token: string 
        }>('/auth/login', { email, password });
        
        const profile = await apiClient.get<any>('/auth/me', {
          headers: { Authorization: `Bearer ${response.token}` }
        });
        loginAction(profile, response.token);
        resetFormFields();
        checkAndRedirect(profile);
      } else {
        const response = await apiClient.post<{ 
          id: string; 
          email: string; 
          name: string; 
          documentoIdentidad: string; 
          pais: string; 
          telefono?: string;
          role: string; 
          isPremium: boolean; 
          token: string 
        }>('/auth/register', {
          email,
          password,
          name,
          documentoIdentidad: documento,
          pais,
          telefono
        });
        
        const profile = await apiClient.get<any>('/auth/me', {
          headers: { Authorization: `Bearer ${response.token}` }
        });
        loginAction(profile, response.token);
        resetFormFields();
        checkAndRedirect(profile);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Ocurrió un error al procesar la solicitud.');
      } else {
        setError('Ocurrió un error inesperado al procesar la solicitud.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagName: string) => {
    setPrefSuccess(false);
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const handleSavePreferences = async () => {
    setPrefError(null);
    setPrefSuccess(false);

    if (selectedTags.length === 0) {
      setPrefError('Debes seleccionar al menos una preferencia de lectura.');
      return;
    }

    setSavingPrefs(true);
    try {
      await apiClient.post<boolean>('/auth/preferences', selectedTags);
      
      const token = localStorage.getItem('token');
      if (token) {
        const updatedProfile = await apiClient.get<any>('/auth/me');
        loginAction(updatedProfile, token);
      }
      setPrefSuccess(true);
      navigate('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPrefError(err.message || 'Error al guardar tus gustos de lectura.');
      } else {
        setPrefError('Error inesperado al guardar tus gustos.');
      }
    } finally {
      setSavingPrefs(false);
    }
  };

  // Render Onboarding
  if (showWizard) {
    return (
      <div className="onboarding-page-wrapper">
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  // Render Profile when authenticated and onboarding finished
  if (isAuthenticated && user) {
    return (
      <div className="profile-container">
        <div className="profile-header">
          <h1 className="neon-text">
            Perfil de usuario
          </h1>
          <p className="profile-subtitle">Gestiona tu cuenta y personaliza tu recomendación de lectura por IA</p>
        </div>

        <div className="profile-grid">
          {/* Personal Info Card */}
          <div className="profile-card">
            <h2>
              Datos Personales
            </h2>

            <div className="profile-avatar-edit-container">
              <div className="profile-avatar-wrapper">
                {user.profileImageUrl ? (
                  <img src={getFileUrl(user.profileImageUrl)} alt={user.name} className="profile-avatar-img" />
                ) : (
                  <div className="profile-avatar-gradient">
                    <span className="avatar-initials">
                      {user.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
                    </span>
                  </div>
                )}
              </div>

              <div className="avatar-actions">
                <label className="avatar-upload-btn">
                  <i className="fa-solid fa-camera"></i> {avatarUploading ? 'Subiendo...' : 'Cambiar Foto de Perfil'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarFileChange} 
                    disabled={avatarUploading}
                    style={{ display: 'none' }}
                  />
                </label>
                {avatarUploading && <span className="avatar-status-text">Procesando imagen...</span>}
              </div>
            </div>

            {avatarError && <div className="modal-error">{avatarError}</div>}
            {avatarSuccess && (
              <div className="pref-success-alert">
                <i className="fa-solid fa-circle-check"></i> {avatarSuccess}
              </div>
            )}

            <div className="profile-details-list">
              <div>
                <label className="profile-label">Nombre</label>
                <div className="profile-value">{user.name}</div>
              </div>

              <div>
                <label className="profile-label">Correo Electrónico</label>
                <div className="profile-value">{user.email}</div>
              </div>

              <div className="profile-row-two-col">
                <div className="col-flex-1">
                  <label className="profile-label">País</label>
                  <div className="profile-value">{user.pais}</div>
                </div>

                <div className="col-flex-1">
                  <label className="profile-label">
                    {user.pais === 'Chile' ? 'RUT' : 'Identificación'}
                  </label>
                  <div className="profile-value">{user.documentoIdentidad}</div>
                </div>
              </div>

              {user.telefono && (
                <div>
                  <label className="profile-label">Teléfono Celular</label>
                  <div className="profile-value">{user.telefono}</div>
                </div>
              )}
            </div>

            {/* Upgrade Card / Premium Info */}
            <div className={`profile-plan-status ${user.isPremium ? 'premium' : 'free'}`}>
              {user.isPremium ? (
                <>
                  <div className="profile-plan-title-premium">
                    <span><i className="fa-solid fa-crown icon-gold"></i> Suscripción Premium Activa</span>
                  </div>
                  <p className="profile-plan-desc">
                    ¡Tienes swipes ilimitados y prioridad en matches de libros!
                  </p>
                </>
              ) : (
                <>
                  <div className="profile-plan-title-free">
                    <span>Plan Gratuito (Free)</span>
                  </div>
                  <p className="profile-plan-desc">
                    Tu plan actual está limitado a 40 swipes mensuales (1° al último día del mes).
                  </p>
                  <Link to="/planes" className="profile-plan-upgrade-link">
                    Ver Planes y Convertirme en Premium <i className="fa-solid fa-arrow-right-long icon-arrow-right"></i>
                  </Link>
                </>
              )}
            </div>

            <button 
              onClick={handleLogout} 
              className="modal-submit-btn profile-logout-btn"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Preferences / Tags Card */}
          <PreferencesCard
            tags={tags}
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
            onSave={handleSavePreferences}
            loadingTags={loadingTags}
            saving={savingPrefs}
            error={prefError}
            successMessage={prefSuccess ? '¡Preferencias de lectura actualizadas con éxito!' : null}
            submitButtonText="Guardar Preferencias"
          />
        </div>
      </div>
    );
  }

  // Render Login/Registration Form when NOT authenticated
  return (
    <div className="auth-page-container">
      <div className="modal-card modal-card-no-anim">
        <div className="modal-header">
          <h2>{isLogin ? 'Iniciar sesión' : 'Únete a Bookmachs'}</h2>
          <p>
            {isLogin 
              ? 'Ingresa a tu cuenta para continuar intercambiando libros.' 
              : 'Para deslizar libros y empezar a intercambiar, debes tener una cuenta activa.'}
          </p>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {!isLogin && (
            <>
              <div className="modal-field">
                <label>Nombre Completo</label>
                <input 
                  type="text" 
                  placeholder="Tu Nombre" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>

              <div className="modal-field-group">
                <div className="modal-field">
                  <label>País</label>
                  <select 
                    value={pais} 
                    onChange={(e) => {
                      const newPais = e.target.value;
                      setPais(newPais);
                      setTelefono(formatPhoneByCountry(telefono, newPais));
                      if (newPais === 'Chile') {
                        setDocumento(formatRut(documento));
                      }
                    }} 
                    required
                  >
                    <option value="Chile">Chile</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Colombia">Colombia</option>
                    <option value="México">México</option>
                    <option value="Perú">Perú</option>
                  </select>
                </div>

                <div className="modal-field">
                  <label>{pais === 'Chile' ? 'RUT' : 'Documento'}</label>
                  <input 
                    type="text" 
                    placeholder={pais === 'Chile' ? '12.345.678-9' : 'Número de Documento'} 
                    value={documento} 
                    onChange={(e) => setDocumento(pais === 'Chile' ? formatRut(e.target.value) : e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="modal-field">
                <label>Teléfono Celular ({pais})</label>
                <input 
                  type="tel" 
                  placeholder={getPhonePlaceholder(pais)} 
                  value={telefono} 
                  onChange={(e) => setTelefono(formatPhoneByCountry(e.target.value, pais))} 
                  required 
                />
              </div>
            </>
          )}

          <div className="modal-field">
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="correo@ejemplo.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="modal-field">
            <label>Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="modal-submit-btn" disabled={loading}>
            {loading ? 'Procesando...' : isLogin ? 'Ingresar' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="modal-divider">
          <span>o</span>
        </div>

        <div className="google-sso-wrapper">
          <div id="google-btn-container" className="google-btn-flex-center"></div>
        </div>

        <div className="modal-footer">
          <button 
            type="button" 
            className="toggle-auth-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión aquí'}
          </button>
        </div>
      </div>
    </div>
  );
};
