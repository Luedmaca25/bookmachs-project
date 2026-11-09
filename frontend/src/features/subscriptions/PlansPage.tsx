import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../authentication/store/authStore';
import { apiClient } from '../../lib/apiClient';
import { CancelSubscriptionModal } from './components/CancelSubscriptionModal';
import { BuyAddonModal } from './components/BuyAddonModal';

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
  const navigate = useNavigate();
  const { user, login, isAuthenticated } = useAuthStore();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [highlightPremium, setHighlightPremium] = useState(false);
  const [selectedAddonType, setSelectedAddonType] = useState<string | null>(null);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const location = useLocation();

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
        'Deshacer último Swipe (botón Rewind para corregir descartes)',
        'Búsqueda directa instantánea en Swipe y Catálogo (hasta 10 palabras clave)',
        'Acceso completo a Catálogo Avanzado en Grilla interactiva',
        'Filtros avanzados de exploración (por categoría, temas y estado)',
        'Reserva hasta 2 libros simultáneos por 4 horas (si no finalizas el intercambio, el libro vuelve a estar disponible para todos los usuarios)',
        'Beneficio exclusivo: hasta 2 Intercambios Dobles al mes (sin entrega inmediata)',
        'Opción de Donación Comunitaria en intercambios (hasta 2 al mes)',
        'Early Access y alertas de libros recién ingresados a plataforma',
        'Soporte prioritario 24/7'
      ],
      recommended: true
    }
  ];

  const processedTokenRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenWs = urlParams.get('token_ws');
    const isAddon = urlParams.get('addon') === '1';

    if (tokenWs && processedTokenRef.current !== tokenWs) {
      processedTokenRef.current = tokenWs;
      window.history.replaceState({}, document.title, window.location.pathname);
      if (isAddon) {
        handleConfirmAddonWebpay(tokenWs);
      } else {
        handleConfirmWebpay(tokenWs);
      }
    }
  }, []);

  const handleConfirmAddonWebpay = async (token: string) => {
    setLoadingPlanId('addon');
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await apiClient.post<any>(`/addons/webpay-confirm?token_ws=${encodeURIComponent(token)}`);
      if (response.success) {
        const updatedProfile = await apiClient.get<any>('/auth/me');
        const tokenStr = localStorage.getItem('token') || '';
        login(updatedProfile, tokenStr);
        setSuccessMessage(response.message || '¡Tu complemento ha sido activado con éxito por Transbank Webpay Plus!');
      } else {
        setErrorMessage(response.message || 'Error al confirmar el complemento en Transbank Webpay.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Error al confirmar la transacción del complemento con Transbank.');
    } finally {
      setLoadingPlanId(null);
    }
  };

  React.useEffect(() => {
    const hash = window.location.hash || location.hash;
    const urlParams = new URLSearchParams(window.location.search || location.search);
    const target = urlParams.get('plan') || (hash ? hash.replace('#', '') : null) || (location.state as any)?.targetPlan;

    if (target === 'premium' || target === 'plan-premium') {
      setHighlightPremium(true);
      const scrollToPremium = () => {
        const premiumEl = document.getElementById('plan-premium');
        if (premiumEl) {
          const yOffset = -85; // Margen superior para compensar el header fijo (68px)
          const y = premiumEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        }
      };

      scrollToPremium();
      const t1 = setTimeout(scrollToPremium, 120);
      const t2 = setTimeout(scrollToPremium, 350);
      const t3 = setTimeout(() => setHighlightPremium(false), 2600);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [location]);

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
      navigate('/auth', { state: { forceLogin: Date.now() } });
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
        {/* <h1>Planes y Membresías</h1> */}
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
            <div key={plan.id} id={`plan-${plan.id}`} className={`plan-card ${plan.recommended && !isCancelledPremium ? 'recommended' : ''} ${isUserCurrent ? 'current-active' : ''} ${plan.id === 'premium' && highlightPremium ? 'plan-highlight' : ''}`}>
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

      {/* SECCIÓN DE COMPLEMENTOS Y PASES RÁPIDOS (MICROTRANSACCIONES) */}
      <div className="addons-section" style={{ marginTop: '3.5rem', marginBottom: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              background: '#ecfdf5',
              color: '#059669',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.5rem'
            }}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i> Pases Flexibles sin Suscripción
          </div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1f2937', margin: '0 0 0.5rem' }}>
            Complementos y Pases Rápidos
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#6b7280', maxWidth: '640px', margin: '0 auto' }}>
            Potencia tu experiencia de intercambio al instante mediante un pago único seguro con Webpay Plus, sin renovaciones automáticas.
          </p>
        </div>

        <div
          className="addons-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}
        >
          {/* 1. Plan Premium 24h */}
          <div className="addon-card" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                <i className="fa-solid fa-bolt"></i>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1f2937' }}>Plan Premium 24 Horas</h4>
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Acceso total por 1 día</span>
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', margin: '0.5rem 0' }}>
              $2.990 <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>CLP</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#4b5563', flex: 1, margin: '0 0 1rem' }}>
              Prueba todos los beneficios Premium: swipes ilimitados, rewind, 2 reservas por 4 horas y Match Pass incluido.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedAddonType('Premium24h');
                setShowAddonModal(true);
              }}
              className="addon-buy-btn"
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                border: 'none',
                background: '#1f2937',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Comprar Pase 24h
            </button>
          </div>

          {/* 2. Likes ilimitados 24h */}
          <div className="addon-card" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                <i className="fa-solid fa-heart-pulse"></i>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1f2937' }}>Likes Ilimitados 24h</h4>
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Sin tope diario de me gusta</span>
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', margin: '0.5rem 0' }}>
              $1.990 <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>CLP</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#4b5563', flex: 1, margin: '0 0 1rem' }}>
              Desliza a la derecha todo el día sin consumir tu saldo de swipes mensuales para hacer match sin límites.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedAddonType('UnlimitedLikes24h');
                setShowAddonModal(true);
              }}
              className="addon-buy-btn"
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                border: 'none',
                background: '#1f2937',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Activar Likes 24h
            </button>
          </div>

          {/* 3. 10 búsquedas por autor */}
          <div className="addon-card" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                <i className="fa-solid fa-magnifying-glass"></i>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1f2937' }}>10 Búsquedas por Autor</h4>
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Acceso directo a catálogo</span>
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', margin: '0.5rem 0' }}>
              $990 <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>CLP</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#4b5563', flex: 1, margin: '0 0 1rem' }}>
              10 consultas avanzadas en catálogo para localizar títulos y escritores específicos de forma inmediata.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedAddonType('AuthorSearches10');
                setShowAddonModal(true);
              }}
              className="addon-buy-btn"
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                border: 'none',
                background: '#1f2937',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Comprar 10 Búsquedas
            </button>
          </div>

          {/* 4. Boost 48h */}
          <div className="addon-card" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                <i className="fa-solid fa-rocket"></i>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1f2937' }}>Muestra tus Libros Primero</h4>
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Boost prioritario por 48 horas</span>
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', margin: '0.5rem 0' }}>
              $490 <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>CLP</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#4b5563', flex: 1, margin: '0 0 1rem' }}>
              Tus libros aparecerán primero en la fila de swipes de todos los demás lectores para conseguir intercambios más rápido.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedAddonType('BookBoost48h');
                setShowAddonModal(true);
              }}
              className="addon-buy-btn"
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                border: 'none',
                background: '#1f2937',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Destacar por 48h
            </button>
          </div>

          {/* 5. Match Pass 1 semana */}
          <div className="addon-card" style={{ background: '#ffffff', borderRadius: '16px', border: '2px solid #10b981', padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.12)' }}>
            <div style={{ position: 'absolute', top: '-11px', right: '16px', background: '#10b981', color: '#ffffff', fontSize: '0.72rem', fontWeight: 800, padding: '2px 10px', borderRadius: '12px', textTransform: 'uppercase' }}>
              ¡Popular!
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                <i className="fa-solid fa-heart-circle-bolt"></i>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1f2937' }}>Match Pass (1 Semana)</h4>
                <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Descubre quién quiere intercambiar</span>
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', margin: '0.5rem 0' }}>
              $2.990 <span style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 500 }}>CLP</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#4b5563', flex: 1, margin: '0 0 1rem' }}>
              Desbloquea sin borrosidad la 4ta pestaña en tu libreta: mira exactamente quiénes dieron like a tus libros y stock de Ecolectura.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedAddonType('MatchPassWeek');
                setShowAddonModal(true);
              }}
              className="addon-buy-btn"
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
              }}
            >
              Comprar Match Pass 1 Semana
            </button>
          </div>
        </div>
      </div>

      {/* Modal para compra de cualquier Add-on */}
      <BuyAddonModal
        isOpen={showAddonModal}
        onClose={() => setShowAddonModal(false)}
        addonType={selectedAddonType}
      />
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
