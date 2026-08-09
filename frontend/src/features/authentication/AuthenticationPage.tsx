import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { OnboardingWizard } from './components/OnboardingWizard';
import { apiClient } from '../../lib/apiClient';

export const AuthenticationPage: React.FC = () => {
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

  // Profile preferences states
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [prefSuccess, setPrefSuccess] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const resetFormFields = () => {
    setEmail('');
    setPassword('');
    setName('');
    setDocumento('');
    setPais('Chile');
    setError(null);
  };

  const handleLogout = () => {
    resetFormFields();
    logout();
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
          gWindow.google.accounts.id.renderButton(
            btnContainer,
            { theme: 'outline', size: 'large', type: 'standard', text: 'continue_with', width: '380' }
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
          setTags(response);
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
      } else {
        const response = await apiClient.post<{ 
          id: string; 
          email: string; 
          name: string; 
          documentoIdentidad: string; 
          pais: string; 
          role: string; 
          isPremium: boolean; 
          token: string 
        }>('/auth/register', {
          email,
          password,
          name,
          documentoIdentidad: documento,
          pais
        });
        
        const profile = await apiClient.get<any>('/auth/me', {
          headers: { Authorization: `Bearer ${response.token}` }
        });
        loginAction(profile, response.token);
        resetFormFields();
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  // Render Profile when authenticated and onboarding finished
  if (isAuthenticated && user) {
    return (
      <div className="profile-container" style={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '1rem 0'
      }}>
        <div className="profile-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 className="neon-text" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--neon)' }}>
            Perfil de usuario
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginLeft: "auto", marginRight: "auto" }}>Gestiona tu cuenta y personaliza tu recomendación de lectura por IA</p>
        </div>

        <div className="profile-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          alignItems: 'start'
        }}>
          {/* Personal Info Card */}
          <div className="profile-card" style={{
            background: 'var(--gradient-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-card)',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              Datos Personales
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Nombre</label>
                <div style={{ fontSize: '1.1rem', fontWeight: 500, marginTop: '0.2rem' }}>{user.name}</div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Correo Electrónico</label>
                <div style={{ fontSize: '1.1rem', fontWeight: 500, marginTop: '0.2rem' }}>{user.email}</div>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>País</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 500, marginTop: '0.2rem' }}>{user.pais}</div>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {user.pais === 'Chile' ? 'RUT' : 'Identificación'}
                  </label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 500, marginTop: '0.2rem' }}>{user.documentoIdentidad}</div>
                </div>
              </div>
            </div>

            {/* Upgrade Card / Premium Info */}
            <div style={{
              background: user.isPremium ? 'linear-gradient(135deg, rgba(182, 255, 0, 0.1) 0%, rgba(15, 91, 69, 0.2) 100%)' : 'rgba(255,255,255,0.02)',
              border: user.isPremium ? '1px solid var(--neon)' : '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-input)',
              padding: '1.25rem',
              marginTop: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {user.isPremium ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--neon)' }}>
                    <span><i className="fa-solid fa-crown" style={{ color: '#ffb703' }}></i> Suscripción Premium Activa</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    ¡Tienes swipes ilimitados y prioridad en matches de libros!
                  </p>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    <span>Plan Gratuito (Free)</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Tu plan actual está limitado a 100 swipes por día.
                  </p>
                  <Link to="/planes" style={{
                    color: 'var(--neon)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    marginTop: '0.5rem',
                    display: 'inline-block'
                  }}>
                    Ver Planes y Convertirme en Premium <i className="fa-solid fa-arrow-right-long" style={{ fontSize: '0.85em', marginLeft: '0.2rem' }}></i>
                  </Link>
                </>
              )}
            </div>

            <button 
              onClick={handleLogout} 
              className="modal-submit-btn" 
              style={{
                marginTop: '1.5rem',
                background: 'transparent',
                border: '1px solid #FF6B6B',
                color: '#FF6B6B',
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Preferences / Tags Card */}
          <div className="profile-card" style={{
            background: 'var(--gradient-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-card)',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
              Intereses y Preferencias
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Selecciona tus categorías literarias de preferencia. El algoritmo de IA priorizará los libros que coincidan con estos intereses.
            </p>

            {prefError && <div className="wizard-error">{prefError}</div>}
            {prefSuccess && (
              <div style={{
                backgroundColor: 'rgba(182, 255, 0, 0.1)',
                border: '1px solid var(--neon)',
                color: 'var(--neon)',
                padding: '0.75rem 1.2rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                fontWeight: 500
              }}>
                <i className="fa-solid fa-circle-check"></i> ¡Preferencias de lectura actualizadas con éxito!
              </div>
            )}

            {loadingTags ? (
              <div className="wizard-loading" style={{ padding: '2rem' }}>Cargando tus gustos de lectura...</div>
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '0.75rem',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  paddingRight: '0.5rem'
                }}>
                  {tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`wizard-tag-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleTagToggle(tag.name)}
                        style={{
                          padding: '0.6rem 0.8rem',
                          fontSize: '0.85rem'
                        }}
                      >
                        <span className="tag-icon" style={{ width: '20px', height: '20px', fontSize: '0.7rem' }}>
                          {isSelected ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-book-open"></i>}
                        </span>
                        <span className="tag-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {tag.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="modal-submit-btn"
                  disabled={savingPrefs || selectedTags.length === 0}
                  style={{ marginTop: '1rem' }}
                >
                  {savingPrefs ? 'Guardando...' : 'Guardar Preferencias'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render Login/Registration Form when NOT authenticated
  return (
    <div className="auth-page-container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '70vh',
      padding: '2rem 0'
    }}>
      <div className="modal-card" style={{ animation: 'none' }}>
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
                  <select value={pais} onChange={(e) => setPais(e.target.value)} required>
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
                    onChange={(e) => setDocumento(e.target.value)} 
                    required 
                  />
                </div>
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
          <div id="google-btn-container" style={{ display: 'flex', justifyContent: 'center' }}></div>
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
