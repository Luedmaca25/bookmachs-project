import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../authentication/store/authStore';
import { apiClient } from '../../lib/apiClient';
import { CancelSubscriptionModal } from './components/CancelSubscriptionModal';

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
  const [showCancelModal, setShowCancelModal] = useState(false);

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
      swipes: '40 Swipes mensuales',
      matches: '2 intercambios al mes**',
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
      matches: '5 intercambios al mes**',
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

    setSuccessMessage(null);
    setErrorMessage(null);

    // Si el usuario es Premium y hace clic en Plan Gratuito (o en Cancelar), abrimos el modal de doble check
    if (user.isPremium && plan.id === 'free') {
      if (user.isSubscriptionCancelled) {
        setSuccessMessage(`Tu suscripción ya se encuentra cancelada. Seguirás teniendo acceso a todos tus beneficios Premium hasta el final de tu período de facturación${user.subscriptionEndDate ? ` (${new Date(user.subscriptionEndDate).toLocaleDateString('es-CL')})` : ''}.`);
        return;
      }
      setShowCancelModal(true);
      return;
    }

    // Si es Free y hace clic en Free
    if (!user.isPremium && plan.id === 'free') {
      setSuccessMessage('Ya te encuentras en el Plan Gratuito.');
      return;
    }

    // Si el usuario contrata Premium vía Webpay
    if (plan.id === 'premium') {
      if (user.isPremium) {
        if (user.isSubscriptionCancelled) {
          setSuccessMessage(`Tu suscripción ya se encuentra cancelada. Seguirás teniendo acceso a todos tus beneficios Premium hasta el ${user.subscriptionEndDate ? new Date(user.subscriptionEndDate).toLocaleDateString('es-CL') : 'fin de periodo'}.`);
          return;
        }
        setShowCancelModal(true);
        return;
      }

      setLoadingPlanId('premium');
      try {
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
      } catch (err: any) {
        console.error(err);
        setErrorMessage('Hubo un error de red al procesar tu membresía.');
      } finally {
        setLoadingPlanId(null);
      }
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
          const isCancelledPremium = isUserCurrent && user?.isSubscriptionCancelled && plan.id === 'premium';

          return (
            <div key={plan.id} className={`plan-card ${plan.recommended && !isCancelledPremium ? 'recommended' : ''} ${isUserCurrent ? 'current-active' : ''}`}>
              {/* Badge superior único jerárquico para evitar superposición */}
              {isCancelledPremium ? (
                <div className="plan-badge-warning">
                  <i className="fa-solid fa-clock-rotate-left"></i> CANCELACIÓN PROGRAMADA
                </div>
              ) : isUserCurrent ? (
                <div className="plan-badge-active">
                  <i className="fa-solid fa-circle-check"></i> TU PLAN ACTUAL
                </div>
              ) : plan.recommended ? (
                <div className="plan-badge-recommended">
                  <i className="fa-solid fa-star"></i> RECOMENDADO
                </div>
              ) : null}
              
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
                {plan.id === 'free' ? (
                  !user?.isPremium ? (
                    // Usuario Free en tarjeta Free
                    <button
                      disabled
                      className="plan-action-btn btn-active-current"
                    >
                      <i className="fa-solid fa-circle-check"></i> Plan Actual Activo
                    </button>
                  ) : (
                    // Usuario Premium en tarjeta Free
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={loadingPlanId !== null || !!user?.isSubscriptionCancelled}
                      className="plan-action-btn btn-downgrade-plan"
                      title="Cancelar suscripción para volver al Plan Gratuito"
                    >
                      <i className="fa-solid fa-arrow-down"></i> Bajar a Plan Gratuito
                    </button>
                  )
                ) : (
                  // Tarjeta Premium
                  user?.isPremium ? (
                    user.isSubscriptionCancelled ? (
                      // Premium con cancelación programada
                      <button
                        disabled
                        className="plan-action-btn btn-scheduled-cancel"
                        title="Tu membresía permanecerá activa hasta el fin de este ciclo"
                      >
                        <i className="fa-solid fa-clock"></i> Activo hasta {user.subscriptionEndDate ? new Date(user.subscriptionEndDate).toLocaleDateString('es-CL') : 'fin de ciclo'}
                      </button>
                    ) : (
                      // Premium activo sin cancelar -> Botón Cancelar Suscripción
                      <button
                        onClick={() => setShowCancelModal(true)}
                        disabled={loadingPlanId !== null}
                        className="plan-action-btn btn-cancel-plan"
                      >
                        <i className="fa-solid fa-circle-xmark"></i> Cancelar Suscripción
                      </button>
                    )
                  ) : (
                    // Usuario Free queriendo contratar Premium
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={loadingPlanId !== null}
                      className="plan-action-btn btn-premium"
                    >
                      {loadingPlanId === 'premium' ? (
                        <span className="spinner"><i className="fa-solid fa-spinner fa-spin"></i> Conectando con Webpay...</span>
                      ) : (
                        <span><i className="fa-solid fa-crown icon-gold"></i> Contratar Plan Premium</span>
                      )}
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Cancelación con doble check */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={(msg) => setSuccessMessage(msg)}
        subscriptionEndDate={user?.subscriptionEndDate}
      />


      <div className="plans-legal-footer">
        <h3>Información Importante de Facturación</h3>
        <p>1. Los cobros de las suscripciones se realizan mensualmente de manera automática en la pasarela segura.</p>
        <p>2. Puedes cancelar tu plan en cualquier momento. Si, en el momento de cancelar el servicio, aún queda tiempo de tu periodo de facturación, podrás usar tu membresía hasta la cancelación automática de la cuenta, al final del periodo de facturación. <br/>NOTA: Esta es la única manera de cancelar tu cuenta y finalizar tu membresía. Al cerrar sesión en tu cuenta o eliminar la app, no se cancelará tu cuenta.</p>
        <p>3. **El Fee por intercambio es cobrado por separado por cada match concretado**, independientemente del plan suscrito, para sustentar el motor de recomendación y las validaciones de stock.</p>
      </div>
    </div>
  );
};
