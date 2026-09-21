import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../authentication/store/authStore';
import { apiClient } from '../../lib/apiClient';

type HelpView = 'hub' | 'center' | 'current_issues' | 'exchange_safety' | 'exchange_issues' | 'community_rules';

interface FaqItem {
  id: string;
  category: 'exchange' | 'profile' | 'safety';
  question: string;
  answer: string;
}

const FAQS_DATA: FaqItem[] = [
  // Intercambiar libros
  {
    id: 'f1',
    category: 'exchange',
    question: '¿Cómo funciona el intercambio de libros en Bookmachs?',
    answer: 'El intercambio se basa en el sistema de Trueque Circular. Desliza hacia la derecha en "Descubrir" en los libros que te interesen o explora el Catálogo. Cuando dos usuarios coinciden o solicitas un ejemplar disponible, se genera un Match en "Matches". Puedes coordinar entrega presencial o despacho y confirmar la recepción del libro.'
  },
  {
    id: 'f2',
    category: 'exchange',
    question: '¿Qué pasa si el libro no llega o no coincide con la descripción?',
    answer: 'Cuentas con la Garantía de Intercambio Seguro de Bookmachs. Si la contraparte no acude a la cita o el libro recibido tiene fallas graves no declaradas, puedes solicitar mediación desde la sección "Problemas con un intercambio". Reintegraremos tu cuota mensual o gestionaremos la reposición.'
  },
  {
    id: 'f3',
    category: 'exchange',
    question: '¿Cómo funciona el límite de intercambios mensuales de mi plan?',
    answer: 'Cada cuenta tiene un ciclo mensual renovable de trueques: el Plan Gratuito incluye 2 intercambios mensuales, mientras que el Plan Premium te permite realizar hasta 5 intercambios al mes. Tu cupo se renueva automáticamente cada 30 días.'
  },
  {
    id: 'f4',
    category: 'exchange',
    question: '¿Puedo cancelar un intercambio después de haberlo aceptado?',
    answer: 'Sí. Mientras el libro no haya sido despachado físicamente ni se haya realizado la entrega presencial, puedes cancelar la transacción desde tu pestaña de "Matches". Al cancelar, el libro vuelve a estar disponible y tu saldo se recalcula.'
  },
  {
    id: 'f5',
    category: 'exchange',
    question: '¿Qué libros y condiciones están permitidos en la plataforma?',
    answer: 'Se admiten libros originales en cualquier categoría (literatura, técnicos, escolares, infantiles). Se clasifican en Excelente, Bueno, Aceptable o Desgastado. Queda terminantemente prohibida la comercialización de fotocopias o reproducciones piratas.'
  },

  // Tu perfil y suscripción
  {
    id: 'f6',
    category: 'profile',
    question: '¿Cómo reservo un libro por 48 horas con el Plan Premium?',
    answer: 'Si tienes el Plan Premium activo, al abrir cualquier libro en el Catálogo verás el botón "Reservar 48 hrs". Al hacer clic, el ejemplar queda bloqueado exclusivamente para ti durante 48 horas completas, impidiendo que otros lectores o compradores de Ecolectura lo adquieran mientras decides tu intercambio.'
  },
  {
    id: 'f7',
    category: 'profile',
    question: '¿Cómo accedo al canal de Soporte Premium 24/7?',
    answer: 'Los usuarios Premium cuentan con acceso directo vía WhatsApp las 24 horas del día, los 7 días de la semana, además de atención preferencial en tickets con respuesta en menos de 15 minutos. Puedes activarlo pulsando el botón "Chatear por WhatsApp 24/7" en este Centro de Ayuda.'
  },
  {
    id: 'f8',
    category: 'profile',
    question: '¿Cómo se calculan los árboles salvados y la huella de CO2 de mi impacto?',
    answer: 'Cada intercambio en Bookmachs reutiliza papel y evita la fabricación de un libro nuevo. Calculamos el ahorro ambiental promedio en 1,2 kg de CO2 evitado por ejemplar y un factor equivalente de árboles preservados que puedes consultar en la pestaña "Impacto".'
  },
  {
    id: 'f9',
    category: 'profile',
    question: '¿Cómo cancelo o administro mi suscripción Premium?',
    answer: 'Puedes gestionar tu suscripción en cualquier momento desde "Planes" o desde la sección "Mi perfil". Al cancelar, mantendrás todos los beneficios Premium activos hasta el fin de tu ciclo mensual contratado.'
  },

  // Seguridad y confianza
  {
    id: 'f10',
    category: 'safety',
    question: '¿Cómo protejo mis datos personales en un intercambio presencial?',
    answer: 'Te recomendamos acordar siempre lugares públicos y concurridos (estaciones de metro, cafeterías o centros comerciales). No es necesario compartir tu dirección residencial ni datos financieros con otros usuarios.'
  },
  {
    id: 'f11',
    category: 'safety',
    question: '¿Cómo funciona la pasarela de pagos Webpay Plus?',
    answer: 'Todas las transacciones de tarifas y suscripciones se procesan a través de la pasarela oficial de Transbank Webpay Plus bajo estándares bancarios y cifrado SSL. Bookmachs nunca almacena datos de tus tarjetas de crédito o débito.'
  },
  {
    id: 'f12',
    category: 'safety',
    question: '¿Qué hago si la contraparte deja de contestar mis mensajes?',
    answer: 'Si transcurren 48 horas sin respuesta para coordinar la entrega de un match, puedes anular la transacción sin ninguna penalización desde "Matches", o contactar al equipo de mediación para que intervenga de inmediato.'
  }
];

export const HelpCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();

  // Vista actual (por defecto 'hub' o la que venga en la query string ?v=center)
  const activeViewParam = (searchParams.get('v') as HelpView) || 'hub';
  const [activeView, setActiveView] = useState<HelpView>(activeViewParam);

  // Estados de Centro de Ayuda (búsqueda y filtros)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<'all' | 'exchange' | 'profile' | 'safety'>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Estados del modal de contacto / soporte
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [ticketCategory, setTicketCategory] = useState('general');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketPhone, setTicketPhone] = useState(user?.telefono || '');
  const [ticketEmail, setTicketEmail] = useState(user?.email || '');
  const [ticketName, setTicketName] = useState(user?.name || '');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSuccessData, setTicketSuccessData] = useState<{
    ticketId: string;
    priority: string;
    estimatedResponseTime: string;
    message: string;
    whatsAppUrl?: string;
  } | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  // Estado del selector guiado en "Problemas con un intercambio"
  const [selectedIssueKey, setSelectedIssueKey] = useState<string | null>(null);

  // Control del scroll del fondo y tecla Escape al abrir el modal
  useEffect(() => {
    if (!isContactModalOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsContactModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isContactModalOpen]);

  const setView = (view: HelpView) => {
    setActiveView(view);
    setSearchParams(view === 'hub' ? {} : { v: view });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openContactModal = (preselectedCategory = 'general', preselectedSubject = '') => {
    setTicketCategory(preselectedCategory);
    setTicketSubject(preselectedSubject);
    setTicketError(null);
    setTicketSuccessData(null);
    if (user) {
      setTicketName(user.name || '');
      setTicketEmail(user.email || '');
      setTicketPhone(user.telefono || '');
    }
    setIsContactModalOpen(true);
  };

  // Filtrado de FAQs
  const filteredFaqs = useMemo(() => {
    return FAQS_DATA.filter(faq => {
      const matchesCat = selectedFaqCategory === 'all' || faq.category === selectedFaqCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        faq.question.toLowerCase().includes(q) || 
        faq.answer.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedFaqCategory]);

  // Manejo de envío de ticket
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketError(null);
    setIsSubmittingTicket(true);

    try {
      const response = await apiClient.post<any>('/support/ticket', {
        name: ticketName,
        email: ticketEmail,
        phone: ticketPhone,
        category: ticketCategory,
        subject: ticketSubject || 'Consulta general desde Centro de Ayuda',
        message: ticketMessage,
        isUrgent: user?.isPremium || false
      });

      setTicketSuccessData({
        ticketId: response.ticketId,
        priority: response.priority,
        estimatedResponseTime: response.estimatedResponseTime,
        message: response.message,
        whatsAppUrl: response.whatsAppUrl
      });
      setTicketMessage('');
    } catch (err: any) {
      console.error(err);
      setTicketError(err.message || 'No se pudo enviar el ticket de soporte. Intenta nuevamente.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Generar URL de WhatsApp 24/7 para usuario Premium
  const getPremiumWhatsAppUrl = () => {
    const userName = user?.name || 'Lector';
    const userEmail = user?.email || '';
    const text = `Hola equipo de soporte Bookmachs. Soy usuario Premium (${userName} - ${userEmail}) y requiero atención prioritaria 24/7 con el siguiente tema: `;
    return `https://wa.me/56987654321?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="help-center-wrapper">
      {/* ============================================================ */}
      {/* VISTA 1: MAIN HUB ("Ayuda y seguridad") - Pantalla 1 mockup  */}
      {/* ============================================================ */}
      {activeView === 'hub' && (
        <div className="help-hub-container">
          <div className="help-header-hero">
            <div className="help-header-badge">
              <i className="fa-solid fa-shield-halved"></i> Soporte & Confianza
            </div>
            <h1 className="help-title">Ayuda y seguridad</h1>
            <p className="help-subtitle">
              Estamos aquí para resolver tus dudas, proteger cada trueque y asegurarnos de que tu experiencia en Intercambialibros sea excepcional.
            </p>
          </div>

          {/* Banner Exclusivo: Canal de Soporte Premium 24/7 */}
          <div className={`help-premium-banner ${user?.isPremium ? 'is-premium-active' : 'is-free-plan'}`}>
            <div className="help-premium-content">
              <div className="help-premium-badge">
                <i className="fa-solid fa-crown icon-gold"></i>
                {user?.isPremium ? 'Soporte Prioritario 24/7 Activo' : 'Canal de Soporte Premium 24/7'}
              </div>
              <h2 className="help-premium-title">
                {user?.isPremium 
                  ? 'Atención inmediata las 24 horas, los 7 días de la semana' 
                  : '¿Necesitas respuesta instantánea 24/7 por WhatsApp?'}
              </h2>
              <p className="help-premium-desc">
                {user?.isPremium
                  ? 'Como miembro de nuestro Plan Premium, dispones de una línea directa de guardia con agentes dedicados vía WhatsApp y respuesta preferencial en menos de 15 minutos.'
                  : 'Los miembros Premium disfrutan de asistencia prioritaria 24/7 vía WhatsApp directo, resolución exprés de incidencias y mediación dedicada en intercambios.'}
              </p>
              
              <div className="help-premium-actions">
                {user?.isPremium ? (
                  <>
                    <a 
                      href={getPremiumWhatsAppUrl()} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="help-btn-whatsapp"
                    >
                      <i className="fa-brands fa-whatsapp"></i> Chatear por WhatsApp 24/7
                    </a>
                    <button 
                      onClick={() => openContactModal('priority_support', 'Consulta Prioritaria 24/7')} 
                      className="help-btn-ticket-premium"
                    >
                      <i className="fa-solid fa-ticket"></i> Crear Ticket Prioritario
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/planes" className="help-btn-upgrade">
                      <i className="fa-solid fa-sparkles"></i> Activar Plan Premium
                    </Link>
                    <button 
                      onClick={() => openContactModal('general', 'Consulta Soporte Estándar')} 
                      className="help-btn-ticket-standard"
                    >
                      <i className="fa-solid fa-envelope"></i> Contactar Soporte Estándar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Dos tarjetas destacadas superiores del mockup */}
          <div className="help-quick-cards-grid">
            <div 
              className="help-action-card" 
              onClick={() => setView('exchange_issues')}
              role="button"
              tabIndex={0}
            >
              <div className="help-action-icon danger">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div className="help-action-info">
                <h3>Problemas con un intercambio</h3>
                <p>Reporta un libro no entregado, discrepancias en el estado del ejemplar o fallas de comunicación.</p>
              </div>
              <div className="help-action-arrow">
                <i className="fa-solid fa-chevron-right"></i>
              </div>
            </div>

            <div 
              className="help-action-card" 
              onClick={() => setView('exchange_safety')}
              role="button"
              tabIndex={0}
            >
              <div className="help-action-icon success">
                <i className="fa-solid fa-shield-check"></i>
              </div>
              <div className="help-action-info">
                <h3>Seguridad en tus intercambios</h3>
                <p>Consejos y protocolos para coordinar trueques presenciales y envíos de forma 100% segura.</p>
              </div>
              <div className="help-action-arrow">
                <i className="fa-solid fa-chevron-right"></i>
              </div>
            </div>
          </div>

          {/* Botón Principal "Pedir ayuda" */}
          <div className="help-primary-cta-box">
            <button 
              onClick={() => setView('center')} 
              className="help-primary-cta-btn"
            >
              <i className="fa-solid fa-magnifying-glass"></i> Buscar en el Centro de Ayuda
            </button>
          </div>

          {/* Lista de temas y navegación */}
          <div className="help-topics-section">
            <h3 className="help-topics-title">Temas y directrices</h3>

            <div className="help-topic-list">
              <div 
                className="help-topic-row" 
                onClick={() => setView('exchange_safety')}
              >
                <div className="help-topic-row-icon">
                  <i className="fa-solid fa-user-shield"></i>
                </div>
                <div className="help-topic-row-text">
                  <strong>Tu seguridad</strong>
                  <span>Protección de datos personales, entregas presenciales y prevención de fraudes.</span>
                </div>
                <i className="fa-solid fa-chevron-right row-arrow"></i>
              </div>

              <div 
                className="help-topic-row" 
                onClick={() => setView('current_issues')}
              >
                <div className="help-topic-row-icon">
                  <i className="fa-solid fa-wrench"></i>
                </div>
                <div className="help-topic-row-text">
                  <strong>Problemas y fallos actuales</strong>
                  <span>Diagnóstico de errores, estado de los servidores y pasos de solución rápida.</span>
                </div>
                <i className="fa-solid fa-chevron-right row-arrow"></i>
              </div>

              <div 
                className="help-topic-row" 
                onClick={() => setView('community_rules')}
              >
                <div className="help-topic-row-icon">
                  <i className="fa-solid fa-scale-balanced"></i>
                </div>
                <div className="help-topic-row-text">
                  <strong>Normas de la comunidad</strong>
                  <span>Nuestros valores de respeto, veracidad en libros y fomento de lectura circular.</span>
                </div>
                <i className="fa-solid fa-chevron-right row-arrow"></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 2: "Centro de ayuda" (Buscador y Preguntas) - Pantalla 2 */}
      {/* ============================================================ */}
      {activeView === 'center' && (
        <div className="help-subview-container">
          <button className="help-back-button" onClick={() => setView('hub')}>
            <i className="fa-solid fa-arrow-left"></i> Volver a Ayuda y seguridad
          </button>

          <div className="help-center-header">
            <h1 className="help-subview-title">Centro de ayuda</h1>
            <p className="help-subview-subtitle">Encuentra respuestas rápidas o contacta directamente con nuestro equipo de soporte.</p>

            {/* Barra de búsqueda */}
            <div className="help-search-input-wrapper">
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input 
                type="text"
                placeholder="Buscar temas, preguntas o problemas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="help-search-input"
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={() => setSearchQuery('')}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>

            {/* Filtro por Categorías (Pills) */}
            <div className="help-category-pills">
              <button 
                className={`help-category-pill ${selectedFaqCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedFaqCategory('all')}
              >
                <i className="fa-solid fa-list"></i> Todos los temas
              </button>
              <button 
                className={`help-category-pill ${selectedFaqCategory === 'exchange' ? 'active' : ''}`}
                onClick={() => setSelectedFaqCategory('exchange')}
              >
                <i className="fa-solid fa-book"></i> Intercambiar libros
              </button>
              <button 
                className={`help-category-pill ${selectedFaqCategory === 'profile' ? 'active' : ''}`}
                onClick={() => setSelectedFaqCategory('profile')}
              >
                <i className="fa-solid fa-user"></i> Tu perfil y plan
              </button>
              <button 
                className={`help-category-pill ${selectedFaqCategory === 'safety' ? 'active' : ''}`}
                onClick={() => setSelectedFaqCategory('safety')}
              >
                <i className="fa-solid fa-shield-heart"></i> Seguridad y confianza
              </button>
            </div>
          </div>

          {/* Lista de Preguntas Populares (Acordeón) */}
          <div className="help-faqs-section">
            <h3 className="help-faqs-title">Preguntas populares</h3>

            {filteredFaqs.length === 0 ? (
              <div className="help-no-results">
                <i className="fa-solid fa-circle-question"></i>
                <p>No encontramos preguntas que coincidan con tu búsqueda.</p>
                <button 
                  onClick={() => openContactModal('general', searchQuery ? `Consulta sobre: ${searchQuery}` : '')}
                  className="help-contact-empty-btn"
                >
                  Hacer esta pregunta a soporte
                </button>
              </div>
            ) : (
              <div className="help-accordion-list">
                {filteredFaqs.map(faq => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <div 
                      key={faq.id} 
                      className={`help-accordion-item ${isExpanded ? 'expanded' : ''}`}
                    >
                      <button 
                        className="help-accordion-trigger"
                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      >
                        <span className="faq-question-text">{faq.question}</span>
                        <i className={`fa-solid fa-chevron-down faq-chevron ${isExpanded ? 'rotated' : ''}`}></i>
                      </button>
                      {isExpanded && (
                        <div className="help-accordion-content">
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tarjeta inferior fija: "¿Todavía tienes preguntas?" */}
          <div className="help-contact-banner">
            <div className="help-contact-icon">
              <i className="fa-solid fa-comments"></i>
            </div>
            <div className="help-contact-text">
              <h4>¿Todavía tienes preguntas?</h4>
              <p>Inicia un chat con nuestro equipo o déjanos tu consulta y te responderemos a la brevedad.</p>
            </div>
            <button 
              onClick={() => openContactModal('general', 'Consulta desde Centro de Ayuda')}
              className="help-contact-cta-btn"
            >
              {user?.isPremium ? 'Iniciar chat 24/7' : 'Iniciar chat / Contactar'}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 3: "Problemas y fallos actuales" - Pantalla 3 mockup   */}
      {/* ============================================================ */}
      {activeView === 'current_issues' && (
        <div className="help-subview-container">
          <button className="help-back-button" onClick={() => setView('hub')}>
            <i className="fa-solid fa-arrow-left"></i> Volver a Ayuda y seguridad
          </button>

          <h1 className="help-subview-title">Problemas y fallos actuales</h1>
          <p className="help-subview-subtitle">
            Guía de diagnóstico y estado del servicio para resolver incidencias técnicas frecuentes en la plataforma.
          </p>

          {/* Estado de los Servicios */}
          <div className="service-status-card">
            <div className="service-status-header">
              <span className="status-indicator-pulse"></span>
              <span className="status-label">Todos los sistemas operativos</span>
            </div>
            <div className="service-grid">
              <div className="service-item">
                <i className="fa-solid fa-circle-check icon-green"></i>
                <div>
                  <strong>Motor de Trueque Bookmachs</strong>
                  <small>Emparejamiento y Swipes al 100%</small>
                </div>
              </div>
              <div className="service-item">
                <i className="fa-solid fa-circle-check icon-green"></i>
                <div>
                  <strong>Pasarela Webpay Plus (Transbank)</strong>
                  <small>Pagos y reservas operando normal</small>
                </div>
              </div>
              <div className="service-item">
                <i className="fa-solid fa-circle-check icon-green"></i>
                <div>
                  <strong>Catálogo e Inventario Ecolectura</strong>
                  <small>Sincronización de stock en tiempo real</small>
                </div>
              </div>
              <div className="service-item">
                <i className="fa-solid fa-circle-check icon-green"></i>
                <div>
                  <strong>Canal de Soporte Prioritario 24/7</strong>
                  <small>Guardia activa y disponible</small>
                </div>
              </div>
            </div>
          </div>

          {/* Pasos de diagnóstico recomendados */}
          <div className="troubleshooting-steps-list">
            <h3 className="section-subtitle">Pasos recomendados para resolver fallos:</h3>

            <div className="trouble-step-card">
              <div className="trouble-step-number">1</div>
              <div className="trouble-step-info">
                <h4>Comprueba tu conexión a Internet</h4>
                <p>Verifica si dispones de conexión activa a Wi-Fi o datos móviles con buena intensidad. La lentitud en la carga de portadas de libros suele originarse por pérdida momentánea de señal.</p>
              </div>
            </div>

            <div className="trouble-step-card">
              <div className="trouble-step-number">2</div>
              <div className="trouble-step-info">
                <h4>Recarga la aplicación o borra caché</h4>
                <p>En el navegador de tu teléfono o computador, actualiza la página o limpia los archivos temporales para asegurarte de ejecutar la versión más reciente de la plataforma.</p>
              </div>
            </div>

            <div className="trouble-step-card">
              <div className="trouble-step-number">3</div>
              <div className="trouble-step-info">
                <h4>Cierra sesión y vuelve a ingresar</h4>
                <p>Si acabas de activar tu Membresía Premium y tus beneficios de reservas o límite ampliado no se visualizan, cerrar sesión y volver a entrar sincronizará tus credenciales al instante.</p>
              </div>
            </div>

            <div className="trouble-step-card">
              <div className="trouble-step-number">4</div>
              <div className="trouble-step-info">
                <h4>Verifica la compatibilidad de tu navegador</h4>
                <p>Recomendamos utilizar versiones actualizadas de Google Chrome, Safari, Mozilla Firefox o Microsoft Edge para garantizar total compatibilidad con las pasarelas de pago y notificaciones.</p>
              </div>
            </div>
          </div>

          {/* CTA Reporte */}
          <div className="help-report-footer-card">
            <h4>¿El problema persiste en tu dispositivo?</h4>
            <p>Nuestro equipo de soporte técnico revisará el registro de errores de tu cuenta para asistirte.</p>
            <button 
              onClick={() => openContactModal('technical_bug', 'Reporte de fallo técnico en la plataforma')}
              className="btn-danger-outline"
            >
              <i className="fa-solid fa-bug"></i> Reportar un fallo técnico
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 4: "Seguridad en tus intercambios" - Pantalla 4 mockup */}
      {/* ============================================================ */}
      {activeView === 'exchange_safety' && (
        <div className="help-subview-container">
          <button className="help-back-button" onClick={() => setView('hub')}>
            <i className="fa-solid fa-arrow-left"></i> Volver a Ayuda y seguridad
          </button>

          <h1 className="help-subview-title">Seguridad en tus intercambios</h1>
          <p className="help-subview-subtitle">
            Consejos fundamentales para que tus trueques presenciales y despachos sean transparentes, confiables y seguros.
          </p>

          <div className="safety-guidelines-grid">
            <div className="safety-card">
              <div className="safety-icon-box">
                <i className="fa-solid fa-location-dot"></i>
              </div>
              <div className="safety-card-content">
                <h4>Puntos de encuentro públicos y concurridos</h4>
                <p>
                  Para intercambios presenciales, elige siempre lugares con afluencia de personas y buena iluminación: estaciones de metro, cafeterías céntricas, bibliotecas universitarias o centros comerciales durante el día.
                </p>
              </div>
            </div>

            <div className="safety-card">
              <div className="safety-icon-box">
                <i className="fa-solid fa-comments"></i>
              </div>
              <div className="safety-card-content">
                <h4>Comunícate por canales oficiales</h4>
                <p>
                  Mantén los acuerdos de fecha y lugar dentro de la mensajería de Bookmachs. Dejar constancia formal permite a nuestro equipo respaldarte y actuar con precisión ante cualquier controversia.
                </p>
              </div>
            </div>

            <div className="safety-card">
              <div className="safety-icon-box">
                <i className="fa-solid fa-magnifying-glass-plus"></i>
              </div>
              <div className="safety-card-content">
                <h4>Inspecciona el ejemplar antes de finalizar</h4>
                <p>
                  Tómate unos instantes para hojear el libro antes de despedirte: revisa que no falten páginas, que la encuadernación sea firme y que el estado general coincida con lo descrito en la publicación.
                </p>
              </div>
            </div>

            <div className="safety-card">
              <div className="safety-icon-box">
                <i className="fa-solid fa-lock"></i>
              </div>
              <div className="safety-card-content">
                <h4>Protección de pagos y datos sensibles</h4>
                <p>
                  Nunca realices transferencias de dinero a cuentas personales externas por cargos de plataforma. Todas las tarifas se abonan mediante la pasarela segura Webpay de Transbank.
                </p>
              </div>
            </div>

            <div className="safety-card">
              <div className="safety-icon-box">
                <i className="fa-solid fa-medal"></i>
              </div>
              <div className="safety-card-content">
                <h4>Revisa la reputación e impacto del usuario</h4>
                <p>
                  Antes de pactar la entrega, puedes consultar las valoraciones, reseñas e insignias de reciclaje del usuario en la sección social de Impacto.
                </p>
              </div>
            </div>
          </div>

          <div className="help-report-footer-card">
            <h4>¿Detectaste una actitud sospechosa o irregular?</h4>
            <p>Reportar oportunamente protege a toda la comunidad de lectores de Bookmachs.</p>
            <button 
              onClick={() => openContactModal('safety_report', 'Reporte de seguridad o usuario sospechoso')}
              className="btn-warning-outline"
            >
              <i className="fa-solid fa-user-xmark"></i> Reportar usuario o intercambio sospechoso
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 5: "Problemas con un intercambio" - Pantalla 5 mockup */}
      {/* ============================================================ */}
      {activeView === 'exchange_issues' && (
        <div className="help-subview-container">
          <button className="help-back-button" onClick={() => setView('hub')}>
            <i className="fa-solid fa-arrow-left"></i> Volver a Ayuda y seguridad
          </button>

          <h1 className="help-subview-title">Problemas con un intercambio</h1>
          <p className="help-subview-subtitle">
            Selecciona la situación que estás experimentando para brindarte una solución guiada y activar la mediación de Bookmachs:
          </p>

          <div className="guided-issues-list">
            {/* Opción 1: El libro no llegó o la persona no asistió */}
            <div 
              className={`guided-issue-card ${selectedIssueKey === 'no_show' ? 'selected' : ''}`}
              onClick={() => setSelectedIssueKey(selectedIssueKey === 'no_show' ? null : 'no_show')}
            >
              <div className="guided-issue-header">
                <div className="guided-issue-title-row">
                  <i className="fa-solid fa-person-circle-xmark issue-icon"></i>
                  <strong>El libro no llegó o la contraparte no acudió al encuentro</strong>
                </div>
                <i className={`fa-solid fa-chevron-down ${selectedIssueKey === 'no_show' ? 'rotated' : ''}`}></i>
              </div>
              {selectedIssueKey === 'no_show' && (
                <div className="guided-issue-body">
                  <p>
                    Otorgamos un periodo de gracia de 24 horas para reagendar por causas de fuerza mayor. Si la contraparte no se comunica o rechaza presentarse, la transacción se anula automáticamente y tu cuota mensual de intercambio es restituida.
                  </p>
                  <div className="guided-issue-buttons">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openContactModal('exchange_issue', 'Reporte de inasistencia en intercambio');
                      }}
                      className="guided-action-btn"
                    >
                      <i className="fa-solid fa-handshake-slash"></i> Solicitar mediación por inasistencia
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Opción 2: Libro en mal estado o no coincide con fotos */}
            <div 
              className={`guided-issue-card ${selectedIssueKey === 'bad_condition' ? 'selected' : ''}`}
              onClick={() => setSelectedIssueKey(selectedIssueKey === 'bad_condition' ? null : 'bad_condition')}
            >
              <div className="guided-issue-header">
                <div className="guided-issue-title-row">
                  <i className="fa-solid fa-book-skull issue-icon"></i>
                  <strong>El libro recibido tiene daños graves que no estaban especificados</strong>
                </div>
                <i className={`fa-solid fa-chevron-down ${selectedIssueKey === 'bad_condition' ? 'rotated' : ''}`}></i>
              </div>
              {selectedIssueKey === 'bad_condition' && (
                <div className="guided-issue-body">
                  <p>
                    Nuestra política exige honestidad en el estado del ejemplar. Si el libro tiene roturas, hojas faltantes o manchas severas que no fueron detalladas en la publicación, retenemos la confirmación y mediamos la devolución o compensación.
                  </p>
                  <div className="guided-issue-buttons">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openContactModal('exchange_issue', 'Discrepancia en el estado del libro recibido');
                      }}
                      className="guided-action-btn"
                    >
                      <i className="fa-solid fa-camera"></i> Abrir reclamo por condición de libro
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Opción 3: Usuario no contesta mensajes tras aceptar */}
            <div 
              className={`guided-issue-card ${selectedIssueKey === 'unresponsive' ? 'selected' : ''}`}
              onClick={() => setSelectedIssueKey(selectedIssueKey === 'unresponsive' ? null : 'unresponsive')}
            >
              <div className="guided-issue-header">
                <div className="guided-issue-title-row">
                  <i className="fa-solid fa-comment-slash issue-icon"></i>
                  <strong>La contraparte dejó de responder tras confirmar el match</strong>
                </div>
                <i className={`fa-solid fa-chevron-down ${selectedIssueKey === 'unresponsive' ? 'rotated' : ''}`}></i>
              </div>
              {selectedIssueKey === 'unresponsive' && (
                <div className="guided-issue-body">
                  <p>
                    Si han transcurrido más de 48 horas sin respuesta para fijar fecha o envío, puedes cancelar la transacción sin penalización directamente desde la sección de Matches.
                  </p>
                  <div className="guided-issue-buttons">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/transacciones');
                      }}
                      className="guided-action-btn secondary"
                    >
                      <i className="fa-solid fa-arrow-right"></i> Ir a mis Matches
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Opción 4: Cancelar intercambio acordado */}
            <div 
              className={`guided-issue-card ${selectedIssueKey === 'cancel_order' ? 'selected' : ''}`}
              onClick={() => setSelectedIssueKey(selectedIssueKey === 'cancel_order' ? null : 'cancel_order')}
            >
              <div className="guided-issue-header">
                <div className="guided-issue-title-row">
                  <i className="fa-solid fa-ban issue-icon"></i>
                  <strong>Deseo cancelar un intercambio acordado</strong>
                </div>
                <i className={`fa-solid fa-chevron-down ${selectedIssueKey === 'cancel_order' ? 'rotated' : ''}`}></i>
              </div>
              {selectedIssueKey === 'cancel_order' && (
                <div className="guided-issue-body">
                  <p>
                    Puedes cancelar cualquier intercambio pendiente antes de que se efectúe la entrega física o despacho. Te pedimos avisar cordialmente a la contraparte para mantener una sana convivencia.
                  </p>
                  <div className="guided-issue-buttons">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/transacciones');
                      }}
                      className="guided-action-btn secondary"
                    >
                      <i className="fa-solid fa-arrow-right"></i> Gestionar en Matches
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="help-report-footer-card">
            <h4>¿Tu caso requiere mediación personalizada?</h4>
            <p>Nuestro equipo de soporte actúa como mediador neutral en menos de 24 horas (o inmediata 24/7 si eres Premium).</p>
            <button 
              onClick={() => openContactModal('exchange_issue', 'Solicitud de mediación en intercambio')}
              className="btn-primary-support"
            >
              <i className="fa-solid fa-headset"></i> Hablar con un mediador de soporte
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 6: "Normas de la comunidad" - Pantalla 6 mockup        */}
      {/* ============================================================ */}
      {activeView === 'community_rules' && (
        <div className="help-subview-container">
          <button className="help-back-button" onClick={() => setView('hub')}>
            <i className="fa-solid fa-arrow-left"></i> Volver a Ayuda y seguridad
          </button>

          <h1 className="help-subview-title">Normas de la comunidad</h1>
          <p className="help-subview-subtitle">
            Principios que unen a miles de amantes de los libros para garantizar una convivencia respetuosa, transparente y sostenible.
          </p>

          <div className="community-rules-list">
            <div className="rule-card">
              <div className="rule-badge">1</div>
              <div className="rule-content">
                <h4>Respeto y cordialidad en todo momento</h4>
                <p>
                  Bookmachs es un espacio inclusivo y seguro. No toleramos discriminación, acoso, lenguaje hostil ni actitudes descalificadoras en mensajes o citas presenciales.
                </p>
              </div>
            </div>

            <div className="rule-card">
              <div className="rule-badge">2</div>
              <div className="rule-content">
                <h4>Honestidad y transparencia en el estado del libro</h4>
                <p>
                  Publica siempre fotografías auténticas del ejemplar. Si el libro tiene firmas, subrayados con resaltador, lomo desgastado o huellas de uso, indícalo claramente en la condición.
                </p>
              </div>
            </div>

            <div className="rule-card">
              <div className="rule-badge">3</div>
              <div className="rule-content">
                <h4>Economía circular sin fines de reventa</h4>
                <p>
                  El propósito fundamental de Bookmachs es fomentar la lectura circular y el trueque cultural. Está prohibido el uso masivo de la plataforma con fines comerciales o de reventa abusiva.
                </p>
              </div>
            </div>

            <div className="rule-card">
              <div className="rule-badge">4</div>
              <div className="rule-content">
                <h4>Tolerancia cero a la piratería</h4>
                <p>
                  Solo se permite el intercambio de libros originales. La publicación de fotocopias, réplicas no autorizadas o material protegido por derechos de autor derivará en el bloqueo permanente de la cuenta.
                </p>
              </div>
            </div>

            <div className="rule-card">
              <div className="rule-badge">5</div>
              <div className="rule-content">
                <h4>Compromiso con el medio ambiente</h4>
                <p>
                  Cada trueque salva árboles y reduce la emisión de carbono de nuevos tirajes. Cumplir tus citas y compromisos mantiene activa y confiable la cadena ecológica.
                </p>
              </div>
            </div>
          </div>

          <div className="community-guarantee-note">
            <i className="fa-solid fa-circle-info"></i>
            <p>
              El incumplimiento reiterado de estas normas puede conllevar advertencias formales o la suspensión definitiva de la cuenta en la plataforma.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL / DRAWER DE CONTACTO Y SOPORTE (Incluye Soporte 24/7)  */}
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* MODAL / DRAWER DE CONTACTO Y SOPORTE (Incluye Soporte 24/7)  */}
      {/* ============================================================ */}
      {isContactModalOpen && createPortal(
        <div className="help-modal-overlay" onClick={() => setIsContactModalOpen(false)}>
          <div className="help-modal-card support-modal" onClick={(e) => e.stopPropagation()}>
            <div className="help-modal-header">
              <div className="help-modal-header-title">
                <div className="help-modal-header-icon">
                  <i className="fa-solid fa-headset"></i>
                </div>
                <div>
                  <h3 className="help-modal-title">Canal de Soporte Bookmachs</h3>
                  <span className="help-modal-subtitle">
                    {user?.isPremium 
                      ? 'Atención Prioritaria 24/7 (Plan Premium)' 
                      : 'Atención al Usuario Estándar'}
                  </span>
                </div>
              </div>
              <button 
                className="help-modal-close-btn" 
                onClick={() => setIsContactModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="help-modal-body">
              {ticketSuccessData ? (
                <div className="ticket-success-container">
                  <div className="ticket-success-icon">
                    <i className="fa-solid fa-circle-check"></i>
                  </div>
                  <h4 className="ticket-success-title">¡Solicitud recibida con éxito!</h4>
                  <p className="ticket-success-id">
                    Código de Ticket: <strong>{ticketSuccessData.ticketId}</strong>
                  </p>
                  <div className="ticket-success-badges">
                    <span className="ticket-badge priority">
                      <i className="fa-solid fa-bolt"></i> {ticketSuccessData.priority}
                    </span>
                    <span className="ticket-badge time">
                      <i className="fa-solid fa-clock"></i> Respuesta estimada: {ticketSuccessData.estimatedResponseTime}
                    </span>
                  </div>
                  <p className="ticket-success-msg">{ticketSuccessData.message}</p>

                  {ticketSuccessData.whatsAppUrl && (
                    <div className="ticket-wa-cta">
                      <p>¿Prefieres continuar la conversación por chat en vivo ahora mismo?</p>
                      <a 
                        href={ticketSuccessData.whatsAppUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-whatsapp-direct"
                      >
                        <i className="fa-brands fa-whatsapp"></i> Abrir WhatsApp de Soporte 24/7
                      </a>
                    </div>
                  )}

                  <button 
                    onClick={() => {
                      setTicketSuccessData(null);
                      setIsContactModalOpen(false);
                    }}
                    className="help-modal-submit-btn help-modal-done-btn"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <>
                  {/* Banner Premium si el usuario es Premium */}
                  {user?.isPremium ? (
                    <div className="modal-premium-perk-box">
                      <div className="perk-badge">
                        <i className="fa-solid fa-crown icon-gold"></i> Beneficio Premium 24/7
                      </div>
                      <p>
                        Tu ticket ingresará con <strong>Prioridad Alta</strong> al equipo de guardia 24/7. También puedes hablar de forma inmediata por WhatsApp:
                      </p>
                      <a 
                        href={getPremiumWhatsAppUrl()} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn-whatsapp-quick"
                      >
                        <i className="fa-brands fa-whatsapp"></i> Chatear directo por WhatsApp 24/7
                      </a>
                    </div>
                  ) : (
                    <div className="modal-free-upsell-box">
                      <div className="upsell-badge">
                        <i className="fa-solid fa-bolt"></i> ¿Urgente?
                      </div>
                      <p>
                        Los usuarios con <strong>Plan Premium</strong> cuentan con <strong>Soporte Prioritario 24/7 vía WhatsApp</strong> y respuesta inmediata.
                      </p>
                      <Link to="/planes" className="upsell-link" onClick={() => setIsContactModalOpen(false)}>
                        Ver Plan Premium <i className="fa-solid fa-arrow-right"></i>
                      </Link>
                    </div>
                  )}

                  {ticketError && (
                    <div className="modal-error-alert">
                      <i className="fa-solid fa-circle-exclamation"></i> {ticketError}
                    </div>
                  )}

                  <form onSubmit={handleTicketSubmit} className="support-ticket-form">
                    <div className="form-group">
                      <label className="input-label">Categoría de la consulta</label>
                      <select 
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="help-modal-input"
                      >
                        <option value="general">Consulta general o dudas de la app</option>
                        <option value="exchange_issue">Problema con un intercambio o contraparte</option>
                        <option value="technical_bug">Fallo técnico o error de la plataforma</option>
                        <option value="safety_report">Reporte de seguridad o usuario sospechoso</option>
                        <option value="billing">Dudas sobre pagos, Webpay o suscripciones</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="input-label">Tu Nombre</label>
                      <input 
                        type="text" 
                        value={ticketName} 
                        onChange={(e) => setTicketName(e.target.value)} 
                        placeholder="Ej. Juan Pérez" 
                        required 
                        className="help-modal-input"
                      />
                    </div>

                    <div className="form-row-2col">
                      <div className="form-group">
                        <label className="input-label">Correo de contacto</label>
                        <input 
                          type="email" 
                          value={ticketEmail} 
                          onChange={(e) => setTicketEmail(e.target.value)} 
                          placeholder="tu@correo.com" 
                          required 
                          className="help-modal-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="input-label">Teléfono (WhatsApp)</label>
                        <input 
                          type="text" 
                          value={ticketPhone} 
                          onChange={(e) => setTicketPhone(e.target.value)} 
                          placeholder="+56 9 1234 5678" 
                          className="help-modal-input"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="input-label">Asunto</label>
                      <input 
                        type="text" 
                        value={ticketSubject} 
                        onChange={(e) => setTicketSubject(e.target.value)} 
                        placeholder="Ej. Problema con intercambio de libro Cien Años de Soledad" 
                        required 
                        className="help-modal-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="input-label">Describe detalladamente tu situación</label>
                      <textarea 
                        rows={4}
                        value={ticketMessage} 
                        onChange={(e) => setTicketMessage(e.target.value)} 
                        placeholder="Escribe aquí los detalles del problema o tu pregunta..." 
                        required 
                        className="help-modal-input help-modal-textarea"
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmittingTicket}
                      className="help-modal-submit-btn"
                    >
                      {isSubmittingTicket ? (
                        <span><i className="fa-solid fa-spinner fa-spin"></i> Enviando solicitud...</span>
                      ) : (
                        <span><i className="fa-solid fa-paper-plane"></i> {user?.isPremium ? 'Enviar Ticket Prioritario 24/7' : 'Enviar Solicitud'}</span>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
