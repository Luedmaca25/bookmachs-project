import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../../../lib/apiClient';

interface RegisterWizardProps {
  onComplete: () => void;
  onGoToLogin: () => void;
  onClose?: () => void;
  isGoogleCompletion?: boolean;
}

interface CountryOption {
  code: string;
  name: string;
  flag: string;
  prefix: string;
  placeholder: string;
}

const COUNTRIES: CountryOption[] = [
  { code: 'CL', name: 'Chile', flag: '🇨🇱', prefix: '+56', placeholder: '9 1234 5678' },
  { code: 'MX', name: 'México', flag: '🇲🇽', prefix: '+52', placeholder: '55 1234 5678' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', prefix: '+57', placeholder: '300 123 4567' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', prefix: '+54', placeholder: '9 11 1234 5678' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', prefix: '+51', placeholder: '912 345 678' },
  { code: 'ES', name: 'España', flag: '🇪🇸', prefix: '+34', placeholder: '612 345 678' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', prefix: '+1', placeholder: '202 555 0123' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', prefix: '+598', placeholder: '91 234 567' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', prefix: '+593', placeholder: '99 123 4567' }
];

const extractErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof Error) {
    const raw = err.message;
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.message === 'string' && parsed.message.trim()) {
          return parsed.message;
        }
        if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
          return parsed.detail;
        }
        if (typeof parsed.title === 'string' && parsed.title.trim()) {
          return parsed.title;
        }
        if (typeof parsed.error === 'string' && parsed.error.trim()) {
          return parsed.error;
        }
      }
    } catch {
      // Raw string
    }
    return raw;
  }
  return fallback;
};

export const RegisterWizard: React.FC<RegisterWizardProps> = ({
  onComplete,
  onGoToLogin,
  onClose,
  isGoogleCompletion = false
}) => {
  const { user, login: loginAction } = useAuthStore();

  // Paso inicial: si es usuario de Google completando perfil, arranca en el paso 3 (Nacimiento)
  const [step, setStep] = useState<number>(isGoogleCompletion ? 3 : 1);

  // Datos del formulario
  const [firstName, setFirstName] = useState(user?.name ? user.name.split(' ')[0] : '');
  const [lastName, setLastName] = useState(user?.lastName || (user?.name && user.name.split(' ').length > 1 ? user.name.split(' ').slice(1).join(' ') : ''));
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [phoneRaw, setPhoneRaw] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Estados de control
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Modales de Términos
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsModalType, setTermsModalType] = useState<'terms' | 'privacy'>('terms');

  // Temporizador de reenvío de OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Inicializar Google Sign-In en paso 1
  useEffect(() => {
    if (step !== 1 || isGoogleCompletion) return;

    const initializeGoogle = () => {
      const gWindow = window as any;
      if (gWindow.google) {
        gWindow.google.accounts.id.initialize({
          client_id: '417947069163-edg96tr3fgveliu5q7qq23g1kdlc98j9.apps.googleusercontent.com',
          callback: async (response: any) => {
            setLoading(true);
            setError(null);
            try {
              const apiResponse = await apiClient.post<any>('/auth/google', { idToken: response.credential });
              const profile = await apiClient.get<any>('/auth/me', {
                headers: { Authorization: `Bearer ${apiResponse.token}` }
              });

              loginAction(profile, apiResponse.token);

              // Si ya tiene teléfono verificado, finalizar
              if (profile.isPhoneVerified && profile.telefono) {
                onComplete();
              } else {
                // Ir a completar fecha de nacimiento, género y teléfono
                setFirstName(profile.name?.split(' ')[0] || '');
                setEmail(profile.email || '');
                setStep(3);
              }
            } catch (err: unknown) {
              setError(extractErrorMessage(err, 'Error al iniciar sesión con Google.'));
            } finally {
              setLoading(false);
            }
          }
        });

        const btnContainer = document.getElementById('google-register-btn-container');
        if (btnContainer) {
          gWindow.google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'continue_with',
            width: '320'
          });
        }
      }
    };

    const gWindow = window as any;
    if (gWindow.google) {
      const t = setTimeout(initializeGoogle, 150);
      return () => clearTimeout(t);
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.body.appendChild(script);
    }
  }, [step, isGoogleCompletion]);

  // Construir teléfono completo normalizado
  const getFullPhone = () => {
    const cleanNumber = phoneRaw.replace(/\D/g, '');
    return `${selectedCountry.prefix}${cleanNumber}`;
  };

  // Navegar hacia atrás
  const handleBack = () => {
    setError(null);
    if (isVerifyingOtp) {
      setIsVerifyingOtp(false);
      return;
    }
    if (step > 1) {
      // Si es Google completion y está en el paso 3, cerrar o ir a login
      if (isGoogleCompletion && step === 3) {
        onGoToLogin();
        return;
      }
      setStep(step - 1);
    } else if (onClose) {
      onClose();
    }
  };

  // Validar y avanzar en Paso 2: Nombre
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError('Por favor ingresa tu nombre.');
      return;
    }
    setError(null);
    setStep(3);
  };

  // Validar y avanzar en Paso 3: Fecha de Nacimiento
  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthDate) {
      setError('Por favor ingresa tu fecha de nacimiento.');
      return;
    }
    setError(null);
    setStep(4);
  };

  // Validar y avanzar en Paso 4: Género
  const handleStep4Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender) {
      setError('Por favor selecciona una opción de género.');
      return;
    }
    setError(null);
    setStep(5);
  };

  // Validar y verificar teléfono único en Paso 5: Teléfono
  const handleStep5Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = phoneRaw.replace(/\D/g, '');
    if (cleanNumber.length < 7) {
      setError('Por favor ingresa un número de teléfono móvil válido.');
      return;
    }

    const fullPhone = getFullPhone();
    setError(null);
    setLoading(true);

    try {
      // Comprobar unicidad con el backend
      const checkRes = await apiClient.post<{ available: boolean; message?: string }>('/auth/phone/check', {
        phone: fullPhone
      });

      if (checkRes.available) {
        // Si es usuario de Google, no necesita contraseña, pasa directo a verificar OTP
        if (isGoogleCompletion) {
          setStep(7);
        } else {
          setStep(6);
        }
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Este número de teléfono ya está registrado en otra cuenta. Debe ser único.'));
    } finally {
      setLoading(false);
    }
  };

  // Validar y avanzar en Paso 6: Contraseña y Email
  const handleStep6Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setError(null);
    setStep(7);
  };

  // Enviar código OTP en Paso 7
  const handleSendOtp = async (selectedChan: 'whatsapp' | 'sms') => {
    setChannel(selectedChan);
    setError(null);
    setLoading(true);
    const fullPhone = getFullPhone();

    try {
      await apiClient.post<{ success: boolean; message: string }>('/auth/phone/send-code', {
        phone: fullPhone,
        channel: selectedChan
      });

      setIsVerifyingOtp(true);
      setResendTimer(60);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Error al enviar el código de verificación.'));
    } finally {
      setLoading(false);
    }
  };

  // Validar código OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Por favor ingresa el código de verificación.');
      return;
    }

    setError(null);
    setLoading(true);
    const fullPhone = getFullPhone();

    try {
      await apiClient.post<{ verified: boolean; message: string }>('/auth/phone/verify-code', {
        phone: fullPhone,
        code: otpCode.trim()
      });

      setIsVerifyingOtp(false);
      setStep(8);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Código incorrecto o expirado.'));
    } finally {
      setLoading(false);
    }
  };

  // Paso 8: Guardar sesión
  const handleStep8Decision = (save: boolean) => {
    setRememberMe(save);
    setStep(9);
  };

  // Paso 9: Aceptar condiciones y crear cuenta
  const handleFinalSubmit = async () => {
    setError(null);
    setLoading(true);
    const fullPhone = getFullPhone();

    try {
      if (isGoogleCompletion && user) {
        // Completar onboarding de Google
        const response = await apiClient.post<any>('/auth/complete-onboarding', {
          phone: fullPhone,
          code: otpCode,
          birthDate: birthDate ? new Date(birthDate).toISOString() : null,
          gender,
          pais: selectedCountry.name
        });

        const token = localStorage.getItem('token') || '';
        loginAction(response, token);
        onComplete();
      } else {
        // Registro normal completo
        const response = await apiClient.post<any>('/auth/register', {
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate: birthDate ? new Date(birthDate).toISOString() : null,
          gender,
          telefono: fullPhone,
          verificationCode: otpCode,
          verificationChannel: channel,
          termsAccepted: true,
          pais: selectedCountry.name
        });

        // Manejo de persistencia según rememberMe
        if (rememberMe) {
          localStorage.setItem('token', response.token);
        } else {
          sessionStorage.setItem('token', response.token);
        }

        const profile = await apiClient.get<any>('/auth/me', {
          headers: { Authorization: `Bearer ${response.token}` }
        });

        loginAction(profile, response.token);
        onComplete();
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Ocurrió un error al crear tu cuenta.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-wizard-container">
      <div className="register-wizard-card">
        {/* ENCABEZADO CON BOTÓN ATRÁS / CERRAR */}
        <div className="register-wizard-nav-header">
          {step === 1 ? (
            <button 
              type="button" 
              className="register-wizard-icon-btn" 
              onClick={onClose || onGoToLogin} 
              aria-label="Cerrar"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          ) : (
            <button 
              type="button" 
              className="register-wizard-icon-btn" 
              onClick={handleBack} 
              aria-label="Atrás"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
          )}
        </div>

        {error && <div className="register-wizard-error-banner">{error}</div>}

        {/* =========================================================================
            PANTALLA 1: BIENVENIDA / LANDING DE REGISTRO
           ========================================================================= */}
        {step === 1 && (
          <div className="register-step-screen register-step-1">
            <div className="register-hero-brand">
              <div className="register-books-icon-badge">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  {/* Libro Blanco / Superior */}
                  <rect x="22" y="10" width="30" height="20" rx="3" fill="#FFFFFF" stroke="#1F2937" strokeWidth="2.5" />
                  <line x1="22" y1="20" x2="52" y2="20" stroke="#1F2937" strokeWidth="2" />
                  <path d="M22 28C28 30 46 30 52 28" stroke="#1F2937" strokeWidth="2.5" />
                  {/* Libro Verde / Base */}
                  <rect x="12" y="24" width="30" height="20" rx="3" fill="#0F9D58" stroke="#1F2937" strokeWidth="2.5" />
                  <line x1="12" y1="34" x2="42" y2="34" stroke="#FFFFFF" strokeWidth="2" />
                  <path d="M12 42C18 44 36 44 42 42" stroke="#1F2937" strokeWidth="2.5" />
                </svg>
              </div>
              <h1 className="register-brand-title">Intercambialibros</h1>
              <p className="register-brand-slogan">
                Los libros también encuentran su próxima historia
              </p>
            </div>

            {/* Ilustración de manos intercambiando libros */}
            <div className="register-hands-illustration">
              <svg width="260" height="170" viewBox="0 0 260 170" fill="none" className="register-hands-svg">
                {/* Mano Izquierda ofreciendo Libro Verde */}
                <path d="M20 145 C45 130, 65 110, 85 95 L95 110 C75 125, 55 145, 30 160 Z" fill="#F8E3D2" stroke="#1F2937" strokeWidth="2.5" />
                <path d="M85 95 C92 90, 100 95, 105 105 L95 110 Z" fill="#F8E3D2" stroke="#1F2937" strokeWidth="2.5" />
                {/* Libro Verde */}
                <g transform="translate(68, 60) rotate(-18)">
                  <rect x="0" y="0" width="46" height="68" rx="4" fill="#0F9D58" stroke="#1F2937" strokeWidth="2.8" />
                  <line x1="8" y1="0" x2="8" y2="68" stroke="#0B8043" strokeWidth="2" />
                  <line x1="14" y1="18" x2="38" y2="18" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                  <line x1="14" y1="26" x2="32" y2="26" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
                </g>

                {/* Mano Derecha recibiendo Libro Blanco */}
                <path d="M240 145 C215 130, 195 110, 175 95 L165 110 C185 125, 205 145, 230 160 Z" fill="#F8E3D2" stroke="#1F2937" strokeWidth="2.5" />
                <path d="M175 95 C168 90, 160 95, 155 105 L165 110 Z" fill="#F8E3D2" stroke="#1F2937" strokeWidth="2.5" />
                {/* Libro Blanco */}
                <g transform="translate(150, 68) rotate(16)">
                  <rect x="0" y="0" width="46" height="68" rx="4" fill="#FFFFFF" stroke="#1F2937" strokeWidth="2.8" />
                  <line x1="8" y1="0" x2="8" y2="68" stroke="#E5E7EB" strokeWidth="2" />
                  <line x1="14" y1="18" x2="38" y2="18" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
                  <line x1="14" y1="26" x2="30" y2="26" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
                </g>
              </svg>
            </div>

            <div className="register-actions-group">
              <button 
                type="button" 
                className="register-primary-btn" 
                onClick={() => setStep(2)}
              >
                Comenzar
              </button>

              <button 
                type="button" 
                className="register-secondary-btn" 
                onClick={onGoToLogin}
              >
                Ya tengo una cuenta
              </button>

              <div className="register-or-divider">
                <span>o</span>
              </div>

              <div id="google-register-btn-container" className="register-google-container"></div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PANTALLA 2: ¿CÓMO TE LLAMAS?
           ========================================================================= */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="register-step-screen">
            <div className="register-step-header">
              <h2 className="register-step-title">¿Cómo te llamas?</h2>
              <p className="register-step-subtitle">
                Usa tu nombre real para que otros te reconozcan en la comunidad.
              </p>
            </div>

            <div className="register-inputs-stack">
              <div className="register-input-group">
                <input
                  type="text"
                  placeholder="Nombre"
                  className="register-clean-input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="register-input-group">
                <input
                  type="text"
                  placeholder="Apellidos"
                  className="register-clean-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="register-footer-actions">
              <button type="submit" className="register-primary-btn">
                Siguiente
              </button>
              <button type="button" className="register-link-btn" onClick={onGoToLogin}>
                Ya tengo una cuenta
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            PANTALLA 3: ¿CUÁNDO NACISTE?
           ========================================================================= */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="register-step-screen">
            <div className="register-step-header">
              <h2 className="register-step-title">¿Cuándo naciste?</h2>
              <p className="register-step-subtitle">
                Tu fecha de nacimiento se mantendrá privada.
              </p>
            </div>

            <div className="register-inputs-stack">
              <div className="register-input-with-icon">
                <input
                  type="date"
                  className="register-clean-input date-input"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  autoFocus
                  required
                />
                <i className="fa-regular fa-calendar register-input-trailing-icon"></i>
              </div>
            </div>

            <div className="register-footer-actions">
              <button type="submit" className="register-primary-btn">
                Siguiente
              </button>
              <button type="button" className="register-link-btn" onClick={onGoToLogin}>
                Ya tengo una cuenta
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            PANTALLA 4: ¿CON QUÉ GÉNERO TE IDENTIFICAS?
           ========================================================================= */}
        {step === 4 && (
          <form onSubmit={handleStep4Submit} className="register-step-screen">
            <div className="register-step-header">
              <h2 className="register-step-title">¿Con qué género te identificas?</h2>
              <p className="register-step-subtitle">
                Puedes cambiarlo más adelante.
              </p>
            </div>

            <div className="register-options-list">
              <label 
                className={`register-option-card ${gender === 'Mujer' ? 'selected' : ''}`}
                onClick={() => setGender('Mujer')}
              >
                <span className="register-option-text">Mujer</span>
                <span className="register-radio-circle">
                  {gender === 'Mujer' && <span className="register-radio-dot"></span>}
                </span>
              </label>

              <label 
                className={`register-option-card ${gender === 'Hombre' ? 'selected' : ''}`}
                onClick={() => setGender('Hombre')}
              >
                <span className="register-option-text">Hombre</span>
                <span className="register-radio-circle">
                  {gender === 'Hombre' && <span className="register-radio-dot"></span>}
                </span>
              </label>

              <label 
                className={`register-option-card ${gender === 'Otro' ? 'selected' : ''}`}
                onClick={() => setGender('Otro')}
              >
                <div className="register-option-subgroup">
                  <span className="register-option-text">Más opciones</span>
                  <span className="register-option-hint">Elige otro género o prefiere no especificar.</span>
                </div>
                <span className="register-radio-circle">
                  {gender === 'Otro' && <span className="register-radio-dot"></span>}
                </span>
              </label>
            </div>

            <div className="register-footer-actions">
              <button type="submit" className="register-primary-btn" disabled={!gender}>
                Siguiente
              </button>
              <button type="button" className="register-link-btn" onClick={onGoToLogin}>
                Ya tengo una cuenta
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            PANTALLA 5: ¿CUÁL ES TU NÚMERO DE MÓVIL?
           ========================================================================= */}
        {step === 5 && (
          <form onSubmit={handleStep5Submit} className="register-step-screen">
            <div className="register-step-header">
              <h2 className="register-step-title">¿Cuál es tu número de móvil?</h2>
              <p className="register-step-subtitle">
                Lo usaremos para verificar tu cuenta y mantener tu perfil seguro.
              </p>
            </div>

            <div className="register-inputs-stack">
              <div className="register-phone-row">
                <div className="register-country-select-wrapper">
                  <select
                    className="register-country-select"
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const found = COUNTRIES.find((c) => c.code === e.target.value);
                      if (found) setSelectedCountry(found);
                    }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.prefix}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="tel"
                  placeholder={selectedCountry.placeholder}
                  className="register-clean-input register-phone-input"
                  value={phoneRaw}
                  onChange={(e) => setPhoneRaw(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <p className="register-footnote-text">
                Podrás recibir un código por WhatsApp o por SMS.
              </p>
            </div>

            <div className="register-footer-actions">
              <button type="submit" className="register-primary-btn" disabled={loading}>
                {loading ? 'Verificando disponibilidad...' : 'Siguiente'}
              </button>
              
              <button 
                type="button" 
                className="register-secondary-btn" 
                onClick={() => setStep(6)}
              >
                Registrarme con mi correo
              </button>

              <button type="button" className="register-link-btn" onClick={onGoToLogin}>
                Ya tengo una cuenta
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            PANTALLA 6: CREA UNA CONTRASEÑA
           ========================================================================= */}
        {step === 6 && (
          <form onSubmit={handleStep6Submit} className="register-step-screen">
            <div className="register-step-header">
              <h2 className="register-step-title">Crea una contraseña</h2>
              <p className="register-step-subtitle">
                Usa al menos 6 caracteres. Combina letras, números y símbolos para mayor seguridad.
              </p>
            </div>

            <div className="register-inputs-stack">
              <div className="register-input-group">
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  className="register-clean-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="register-input-with-icon">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Contraseña"
                  className="register-clean-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="register-eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Ver contraseña"
                >
                  <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="register-footer-actions">
              <button type="submit" className="register-primary-btn">
                Siguiente
              </button>
              <button type="button" className="register-link-btn" onClick={onGoToLogin}>
                Ya tengo una cuenta
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            PANTALLA 7: CONFIRMA TU NÚMERO DE MÓVIL (WHATSAPP vs SMS) / OTP
           ========================================================================= */}
        {step === 7 && !isVerifyingOtp && (
          <div className="register-step-screen">
            <div className="register-step-header">
              <h2 className="register-step-title">Confirma tu número de móvil</h2>
              <p className="register-step-subtitle">
                Elige cómo quieres recibir el código de verificación para {getFullPhone()}.
              </p>
            </div>

            <div className="register-options-list">
              <label 
                className={`register-option-card ${channel === 'whatsapp' ? 'selected' : ''}`}
                onClick={() => setChannel('whatsapp')}
              >
                <div className="register-channel-lead">
                  <i className="fa-brands fa-whatsapp register-channel-icon whatsapp-green"></i>
                  <span className="register-option-text">Enviar código por WhatsApp</span>
                </div>
                <span className="register-radio-circle">
                  {channel === 'whatsapp' && <span className="register-radio-dot"></span>}
                </span>
              </label>

              <label 
                className={`register-option-card ${channel === 'sms' ? 'selected' : ''}`}
                onClick={() => setChannel('sms')}
              >
                <div className="register-channel-lead">
                  <i className="fa-regular fa-comment-dots register-channel-icon sms-blue"></i>
                  <span className="register-option-text">Enviar código por SMS</span>
                </div>
                <span className="register-radio-circle">
                  {channel === 'sms' && <span className="register-radio-dot"></span>}
                </span>
              </label>
            </div>

            <div className="register-footer-actions">
              <button 
                type="button" 
                className="register-primary-btn" 
                onClick={() => handleSendOtp(channel)}
                disabled={loading}
              >
                {loading ? 'Enviando código...' : 'Continuar'}
              </button>
              <button type="button" className="register-link-btn" onClick={onGoToLogin}>
                Ya tengo una cuenta
              </button>
            </div>
          </div>
        )}

        {/* SUB-PANTALLA 7.1: INGRESO DE CÓDIGO OTP */}
        {step === 7 && isVerifyingOtp && (
          <form onSubmit={handleVerifyOtp} className="register-step-screen">
            <div className="register-step-header">
              <h2 className="register-step-title">Ingresa el código</h2>
              <p className="register-step-subtitle">
                Enviamos un código de 6 dígitos vía {channel.toUpperCase()} a {getFullPhone()}.
              </p>
            </div>

            <div className="register-inputs-stack">
              <div className="register-otp-wrapper">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className="register-clean-input register-otp-input"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </div>

              <div className="register-resend-row">
                {resendTimer > 0 ? (
                  <span className="register-timer-text">
                    Reenviar código en {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    className="register-resend-btn"
                    onClick={() => handleSendOtp(channel)}
                    disabled={loading}
                  >
                    Reenviar código por {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                  </button>
                )}
              </div>
            </div>

            <div className="register-footer-actions">
              <button 
                type="submit" 
                className="register-primary-btn" 
                disabled={loading || otpCode.length < 4}
              >
                {loading ? 'Verificando código...' : 'Verificar'}
              </button>
              <button 
                type="button" 
                className="register-link-btn" 
                onClick={() => setIsVerifyingOtp(false)}
              >
                Cambiar canal o número
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            PANTALLA 8: ¿GUARDAR TU INFORMACIÓN DE INICIO DE SESIÓN?
           ========================================================================= */}
        {step === 8 && (
          <div className="register-step-screen register-step-centered">
            {/* Ilustración de Libro con corazón */}
            <div className="register-book-heart-illustration">
              <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
                {/* Rayos / Brillos de emoción */}
                <line x1="26" y1="36" x2="38" y2="44" stroke="#0F9D58" strokeWidth="3" strokeLinecap="round" />
                <line x1="114" y1="36" x2="102" y2="44" stroke="#0F9D58" strokeWidth="3" strokeLinecap="round" />
                <line x1="124" y1="64" x2="110" y2="66" stroke="#0F9D58" strokeWidth="3" strokeLinecap="round" />
                {/* Libro inclinado */}
                <g transform="translate(32, 24) rotate(8)">
                  <rect x="0" y="0" width="66" height="88" rx="6" fill="#FFFFFF" stroke="#1F2937" strokeWidth="3.2" />
                  <line x1="10" y1="0" x2="10" y2="88" stroke="#E5E7EB" strokeWidth="2.5" />
                  {/* Corazón verde */}
                  <path d="M36 40 C36 34, 44 32, 48 37 C52 32, 60 34, 60 40 C60 49, 48 57, 48 57 C48 57, 36 49, 36 40 Z" fill="#0F9D58" />
                </g>
              </svg>
            </div>

            <div className="register-step-header text-center">
              <h2 className="register-step-title">¿Guardar tu información de inicio de sesión?</h2>
              <p className="register-step-subtitle">
                Así no tendrás que ingresarla la próxima vez que uses intercambialibros.
              </p>
            </div>

            <div className="register-footer-actions">
              <button 
                type="button" 
                className="register-primary-btn" 
                onClick={() => handleStep8Decision(true)}
              >
                Guardar
              </button>

              <button 
                type="button" 
                className="register-secondary-btn" 
                onClick={() => handleStep8Decision(false)}
              >
                Ahora no
              </button>

              <button type="button" className="register-link-btn" onClick={onGoToLogin}>
                Ya tengo una cuenta
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            PANTALLA 9: ACEPTA LAS CONDICIONES Y POLÍTICAS
           ========================================================================= */}
        {step === 9 && (
          <div className="register-step-screen register-step-centered">
            {/* Ilustración de Documento con checkmark */}
            <div className="register-document-check-illustration">
              <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
                {/* Hoja de Documento */}
                <rect x="42" y="24" width="56" height="74" rx="5" fill="#FFFFFF" stroke="#1F2937" strokeWidth="3" />
                <line x1="54" y1="40" x2="86" y2="40" stroke="#1F2937" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="54" y1="50" x2="86" y2="50" stroke="#1F2937" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="54" y1="60" x2="74" y2="60" stroke="#1F2937" strokeWidth="2.8" strokeLinecap="round" />
                {/* Insignia Circular Verde con Checkmark */}
                <circle cx="92" cy="88" r="22" fill="#0F9D58" stroke="#FFFFFF" strokeWidth="3" />
                <path d="M84 88 L90 94 L100 82" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="register-step-header text-center">
              <h2 className="register-step-title">Acepta las condiciones y políticas</h2>
              <p className="register-step-subtitle">
                Al continuar, aceptas crear una cuenta en <strong>intercambialibros</strong> y nuestras{' '}
                <button
                  type="button"
                  className="register-inline-legal-link"
                  onClick={() => {
                    setTermsModalType('terms');
                    setTermsModalOpen(true);
                  }}
                >
                  Condiciones de uso
                </button>{' '}
                y{' '}
                <button
                  type="button"
                  className="register-inline-legal-link"
                  onClick={() => {
                    setTermsModalType('privacy');
                    setTermsModalOpen(true);
                  }}
                >
                  Política de privacidad
                </button>.
              </p>
            </div>

            <div className="register-footer-actions">
              <button 
                type="button" 
                className="register-primary-btn" 
                onClick={handleFinalSubmit}
                disabled={loading}
              >
                {loading ? 'Creando tu cuenta...' : 'Acepto'}
              </button>

              <button type="button" className="register-link-btn" onClick={onGoToLogin}>
                Ya tengo una cuenta
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PROVISIONAL PARA CONDICIONES DE USO Y PRIVACIDAD */}
      {termsModalOpen && (
        <div className="register-legal-modal-backdrop" onClick={() => setTermsModalOpen(false)}>
          <div className="register-legal-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="register-legal-modal-header">
              <h3>
                {termsModalType === 'terms' ? 'Condiciones de Uso' : 'Política de Privacidad'}
              </h3>
              <button 
                type="button" 
                className="register-legal-modal-close" 
                onClick={() => setTermsModalOpen(false)}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="register-legal-modal-body">
              {termsModalType === 'terms' ? (
                <div>
                  <h4>1. Aceptación de los Términos</h4>
                  <p>
                    Bienvenido a Intercambialibros. Al acceder o usar nuestra plataforma, aceptas cumplir con estas Condiciones de Uso y todas las leyes aplicables. Si no estás de acuerdo con alguna parte, por favor no utilices el servicio.
                  </p>
                  <h4>2. Intercambio Seguro y Comunidad</h4>
                  <p>
                    Intercambialibros fomenta una comunidad respetuosa, cultural y sustentable. Los usuarios son responsables del estado verídico de los libros que ofrecen y del cumplimiento de las entregas y matches pactados.
                  </p>
                  <h4>3. Cuentas y Unicidad</h4>
                  <p>
                    Cada cuenta debe estar asociada a un único número de teléfono móvil verificado y a una persona real para garantizar la seguridad y confianza de todos los miembros.
                  </p>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
                    <em>* Documento legal en proceso de actualización formal por el equipo legal de Intercambialibros.</em>
                  </p>
                </div>
              ) : (
                <div>
                  <h4>1. Protección de Datos</h4>
                  <p>
                    Tu privacidad es primordial. Tu fecha de nacimiento y tus datos sensibles se mantienen privados y se utilizan únicamente para personalizar tu experiencia y validar la seguridad de la cuenta.
                  </p>
                  <h4>2. Comunicaciones y Verificación</h4>
                  <p>
                    Tu número telefónico es utilizado con el único fin de verificar tu identidad vía WhatsApp o SMS a través de proveedores seguros y no será comercializado ni compartido con terceros.
                  </p>
                  <h4>3. Control de Información</h4>
                  <p>
                    Puedes modificar tus preferencias de lectura, datos de perfil o solicitar la baja de tu cuenta en cualquier momento desde los ajustes de la plataforma.
                  </p>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '1rem' }}>
                    <em>* Documento legal en proceso de actualización formal por el equipo legal de Intercambialibros.</em>
                  </p>
                </div>
              )}
            </div>

            <div className="register-legal-modal-footer">
              <button 
                type="button" 
                className="register-primary-btn" 
                onClick={() => setTermsModalOpen(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
