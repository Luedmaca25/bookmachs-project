import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../../../lib/apiClient';

interface HardGateModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

export const HardGateModal: React.FC<HardGateModalProps> = ({ isOpen, onSuccess }) => {
  const loginAction = useAuthStore((state) => state.login);
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Estados de los campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [documento, setDocumento] = useState('');
  const [pais, setPais] = useState('Chile');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Llamada a la API de Inicio de Sesión
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
        
        loginAction(response, response.token);
        onSuccess();
      } else {
        // Llamada a la API de Registro Manual
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
        
        loginAction(response, response.token);
        onSuccess();
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

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>📚 Únete a Bookmachs</h2>
          <p>Para deslizar libros y empezar a intercambiar, debes tener una cuenta activa.</p>
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
                  <label>{pais === 'Chile' ? 'RUT' : 'Documento de Identidad'}</label>
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
