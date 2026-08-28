import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  const { data: globalSettings } = useQuery<{ premiumPlanPriceUsd: number }>({
    queryKey: ['globalSettings'],
    queryFn: () => apiClient.get<any>('/globalsettings'),
  });

  const premiumPriceFormatted = globalSettings?.premiumPlanPriceUsd 
    ? `$${Math.round(globalSettings.premiumPlanPriceUsd).toLocaleString('es-CL')} CLP` 
    : '$9.990 CLP';

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Plan Gratuito',
      price: '$0 CLP',
      priceValue: 0,
      swipes: '40 Swipes mensuales (1° al último día del mes)',
      matches: '2 intercambios al mes',
      features: [
        'Exploración de libros básica',
        'Registro manual de libros',
        'Soporte comunitario standard'
      ]
    },
    {
      id: 'premium',
      name: 'Plan Premium',
      price: premiumPriceFormatted,
      priceValue: globalSettings?.premiumPlanPriceUsd ?? 9990,
      swipes: 'Swipes ilimitados',
      matches: '5 intercambios al mes',
      features: [
        'Acceso a Catálogo Avanzado en Grilla',
        'Búsqueda directa por título, autor o palabras clave (hasta 10)',
        'Early Access a libros Recién Llegados',
        'Reserva de libros por 48 horas',
        'Soporte premium 24/7'
      ],
      recommended: true
    }
  ];

  const processedTokenRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenWs = urlParams.get('token_ws');

    if (tokenWs && processedTokenRef.current !== tokenWs) {
      processedTokenRef.current = tokenWs;
      window.history.replaceState({}, document.title, window.location.pathname);
      handleConfirmWebpay(tokenWs);
    }
  }, []);

  const handleConfirmWebpay = async (token: string) => {
    setLoadingPlanId('premium');
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await apiClient.post<any>(`/subscriptions/webpay-confirm?token_ws=${encodeURIComponent(token)}`);
      if (response.success) {
        const updatedProfile = await apiClient.get<any>('/auth/me');
        const tokenStr = localStorage.getItem('token') || '';
        login(updatedProfile, tokenStr);
        setSuccessMessage('¡Pago de Membresía Premium $9.990 CLP confirmado por Transbank Webpay Plus! Tu cuenta ha sido activada a Plan Premium.');
      } else {
        setErrorMessage(response.message || 'Error al confirmar el pago en Transbank Webpay.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Error al confirmar la transacción de Webpay con Transbank.');
    } finally {
      setLoadingPlanId(null);
    }
  };

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
        const returnUrl = `${window.location.origin}/planes`;
        const response = await apiClient.post<{ success: boolean; token: string; redirectUrl: string; message?: string }>(
          '/subscriptions/webpay-start',
          { returnUrl }
        );

        if (response.success && response.redirectUrl && response.token) {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = response.redirectUrl;

          const tokenInput = document.createElement('input');
          tokenInput.type = 'hidden';
          tokenInput.name = 'token_ws';
          tokenInput.value = response.token;
          form.appendChild(tokenInput);

          document.body.appendChild(form);
          form.submit();
        } else {
          setErrorMessage(response.message || 'No se pudo iniciar la transacción en Transbank Webpay Plus.');
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
        setSuccessMessage(`Has seleccionado el ${plan.name}.`);
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
                  <span className="limit-icon"><i className="fa-solid fa-hand-point-right"></i></span>
                  <span>{plan.swipes}</span>
                </div>
                <div className="limit-item">
                  <span className="limit-icon"><i className="fa-solid fa-handshake"></i></span>
                  <span>{plan.matches}</span>
                </div>
              </div>

              <ul className="plan-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx}>
                     <span className="feature-check"><i className="fa-solid fa-check"></i></span>
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
                    plan.id === 'free' ? <><>Plan Activo</> <i className="fa-solid fa-circle-check"></i></> : <><>Cancelar Suscripción</> <i className="fa-solid fa-circle-xmark"></i></>
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
