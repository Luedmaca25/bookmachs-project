import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [email] = useState(emailParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('El token de recuperación no es válido o está ausente.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifica que sean iguales.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post<{ success: boolean; message: string }>('/auth/password/reset', {
        email: email.trim(),
        token: token.trim(),
        newPassword
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/auth', { state: { forceLogin: Date.now() } });
        }, 3500);
      } else {
        setError(response.message || 'No se pudo actualizar la contraseña. Por favor solicita un nuevo enlace.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Ocurrió un error al restablecer la contraseña.');
      } else {
        setError('Ocurrió un error inesperado. Por favor solicita un nuevo enlace.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="modal-card modal-card-no-anim reset-password-card">
        <div className="modal-header">
          <div className="reset-password-icon-badge">
            <i className="fa-solid fa-key"></i>
          </div>
          <h2 className="neon-text">Restablecer Contraseña</h2>
          <p>
            {email 
              ? `Crea una nueva contraseña para ${email}.` 
              : 'Ingresa y confirma tu nueva clave de acceso.'}
          </p>
        </div>

        {!token ? (
          <div className="reset-password-invalid-box">
            <div className="modal-error">
              El enlace de recuperación es inválido o no contiene un token de seguridad.
            </div>
            <p className="reset-password-help-text">
              Para recuperar tu acceso, por favor solicita un nuevo enlace de recuperación desde la pantalla de inicio de sesión.
            </p>
            <Link to="/auth" className="modal-submit-btn text-center" style={{ textDecoration: 'none', display: 'block' }}>
              Ir a Iniciar Sesión
            </Link>
          </div>
        ) : success ? (
          <div className="reset-password-success-box">
            <div className="reset-password-check-circle">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h3 className="reset-password-success-title">¡Contraseña Actualizada!</h3>
            <p className="reset-password-help-text">
              Tu contraseña ha sido actualizada con éxito. Serás redirigido al inicio de sesión en unos segundos...
            </p>
            <button
              type="button"
              className="modal-submit-btn"
              onClick={() => navigate('/auth', { state: { forceLogin: Date.now() } })}
            >
              Iniciar Sesión Ahora
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            {error && <div className="modal-error">{error}</div>}

            <div className="modal-field">
              <label>Nueva Contraseña</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label="Ver contraseña"
                >
                  <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="modal-field">
              <label>Confirmar Nueva Contraseña</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label="Ver confirmación de contraseña"
                >
                  <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <button type="submit" className="modal-submit-btn" disabled={loading || !newPassword || !confirmPassword}>
              {loading ? 'Actualizando contraseña...' : 'Guardar Nueva Contraseña'}
            </button>

            <div className="reset-password-back-wrap">
              <Link to="/auth" className="reset-password-back-link">
                <i className="fa-solid fa-arrow-left"></i> Volver a Iniciar Sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
