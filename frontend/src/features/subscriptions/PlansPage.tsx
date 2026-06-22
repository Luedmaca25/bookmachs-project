import React, { useState } from 'react';
import { useAuthStore } from '../authentication/store/authStore';
import { apiClient } from '../../lib/apiClient';

interface Plan {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  swipes: string;
  matches: string;
  features: string[];
  recommended?: boolean;
}

export const PlansPage: React.FC = () => {
  const { user, login, isAuthenticated } = useAuthStore();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Plan Gratuito',
      price: '$0 CLP',
      priceValue: 0,
      swipes: '100 Swipes diarios',
      matches: 'Máx. 2 intercambios al mes',
      features: [
        'Exploración de libros básica',
        'Registro manual de libros',
        'Soporte comunitario standard'
      ]
    },
    {
      id: 'premium',
      name: 'Plan Premium',
      price: '$9.990 CLP',
      priceValue: 9990,
      swipes: 'Swipes ilimitados',
      matches: 'Máx. 10 intercambios al mes',
      features: [
        'Escanear Portada IA (Autocompletado)',
        'Acceso a Catálogo Avanzado en Grilla',
        'Early Access a libros Recién Llegados',
        'Reserva de libros por 48 horas',
        'Soporte premium 24/7'
      ],
      recommended: true
    },
    {
      id: 'infantil',
      name: 'Plan Lector Infantil',
      price: '$4.990 CLP',
      priceValue: 4990,
      swipes: '200 Swipes diarios',
      matches: 'Máx. 4 intercambios al mes',
      features: [
        'Filtro exclusivo infantil (8 a 12 años)',
        'Registro manual de libros',
        'Insignias ecológicas coleccionables'
      ]
    }
  ];

  const handleSelectPlan = async (plan: Plan) => {
    if (!isAuthenticated || !user) {
      setErrorMessage('Debes iniciar sesión o registrarte para realizar un Upgrade.');
      return;
    }

    // Si ya tiene el plan actual
    const currentPlan = user.isPremium ? 'premium' : 'free';
    if (plan.id === currentPlan) {
      setSuccessMessage(`Ya estás suscrito al ${plan.name}.`);
      return;
    }

    setLoadingPlanId(plan.id);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      if (plan.id === 'premium') {
        // Simular pago y webhook del lado de Mercado Pago
        const response = await apiClient.post<any>('/webhooks/trigger-test', {
          email: user.email,
          action: 'created'
        });

        if (response.success) {
          // Obtener el perfil actualizado desde el endpoint me
          const updatedProfile = await apiClient.get<any>('/auth/me');
          
          // Actualizar el store local de Zustand
          const token = localStorage.getItem('token') || '';
          login(updatedProfile, token);

          setSuccessMessage('¡Pago Procesado con Éxito! Tu cuenta ha sido actualizada a Plan Premium. 🎉');
        } else {
          setErrorMessage(response.message || 'Error al procesar la simulación de suscripción.');
        }
      } else if (plan.id === 'free' && user.isPremium) {
        // Simular cancelación
        const response = await apiClient.post<any>('/webhooks/trigger-test', {
          email: user.email,
          action: 'cancelled'
        });

        if (response.success) {
          const updatedProfile = await apiClient.get<any>('/auth/me');
          const token = localStorage.getItem('token') || '';
          login(updatedProfile, token);

          setSuccessMessage('Suscripción cancelada. Tu cuenta ha vuelto al Plan Gratuito.');
        } else {
          setErrorMessage(response.message || 'Error al cancelar la suscripción.');
        }
      } else {
        // Plan infantil u otro mock
        setSuccessMessage(`Has seleccionado el ${plan.name}. En este demo, puedes activar el Plan Premium para probar las funciones de IA.`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Hubo un error de red al procesar tu membresía.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  return (
    <div className="plans-page-container">
      <div className="plans-header">
        <h1>Planes y Membresías</h1>
        <p>Elige el plan que mejor se adapte a tus necesidades de lectura y ayuda a mitigar la huella de carbono.</p>
      </div>

      {successMessage && <div className="plans-alert-success">{successMessage}</div>}
      {errorMessage && <div className="plans-alert-error">{errorMessage}</div>}

      <div className="plans-grid">
        {plans.map((plan) => {
          const isUserCurrent = user 
            ? (plan.id === 'premium' && user.isPremium) || (plan.id === 'free' && !user.isPremium)
            : plan.id === 'free';

          return (
            <div key={plan.id} className={`plan-card ${plan.recommended ? 'recommended' : ''} ${isUserCurrent ? 'current-active' : ''}`}>
              {plan.recommended && <div className="plan-badge-recommended">RECOMENDADO</div>}
              {isUserCurrent && <div className="plan-badge-active">TU PLAN ACTUAL</div>}
              
              <div className="plan-card-header">
                <h3>{plan.name}</h3>
                <div className="plan-price">
                  <span className="price-num">{plan.price}</span>
                  <span className="price-period">/ mes</span>
                </div>
              </div>

              <div className="plan-limits">
                <div className="limit-item">
                  <span className="limit-icon">👉</span>
                  <span>{plan.swipes}</span>
                </div>
                <div className="limit-item">
                  <span className="limit-icon">🤝</span>
                  <span>{plan.matches}</span>
                </div>
              </div>

              <ul className="plan-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx}>
                    <span className="feature-check">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="plan-card-action">
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loadingPlanId !== null}
                  className={`plan-action-btn ${isUserCurrent ? 'btn-current' : plan.recommended ? 'btn-premium' : 'btn-normal'}`}
                >
                  {loadingPlanId === plan.id ? (
                    <span className="spinner">Procesando...</span>
                  ) : isUserCurrent ? (
                    plan.id === 'free' ? 'Plan Activo ✓' : 'Cancelar Suscripción ❌'
                  ) : (
                    `Suscribirse al plan`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="plans-legal-footer">
        <h3>Información Importante de Facturación</h3>
        <p>1. Los cobros de las suscripciones se realizan mensualmente de manera automática en la pasarela segura.</p>
        <p>2. Puedes cancelar o modificar tu plan en cualquier momento sin cargos adicionales.</p>
        <p>3. **El Fee por intercambio es cobrado por separado por cada match concretado**, independientemente del plan suscrito, para sustentar el motor de recomendación IA y las validaciones de stock.</p>
      </div>
    </div>
  );
};
