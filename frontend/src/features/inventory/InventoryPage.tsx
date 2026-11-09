import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../authentication/store/authStore';
import { GlobalPremiumModal } from '../subscriptions/components/GlobalPremiumModal';
import { apiClient } from '../../lib/apiClient';
import { getFileUrl } from '../../lib/formatters';
import { MatchModal } from '../transactions/components/MatchModal';
import { BookCard } from '../discovery/components/BookCard';
import { BuyAddonModal } from '../subscriptions/components/BuyAddonModal';

interface MyBookItem {
  id: string;
  title: string;
  author: string;
  condition: string;
  description: string;
  imageUrl: string;
  isAvailable?: boolean;
  exchangeStatus?: string;
  isDoubleExchangeCommitment?: boolean;
  doubleExchangeCommitmentUntil?: string;
}

interface MatchTransaction {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookImageUrl: string;
  bookCondition: string;
  feeAmount: number;
  paymentStatus: string;
  logisticsStatus: string;
  isCrossBorder: boolean;
  isAvailable?: boolean;
}

interface MatchPassItem {
  bookId: string;
  title: string;
  author: string;
  imageUrl?: string;
  condition: string;
  category?: string;
  isInternalStock: boolean;
  sourceType: string;
  likerUserName?: string;
  targetOfferedBookTitle?: string;
  createdAt: string;
}

interface MatchPassData {
  hasAccess: boolean;
  isBlurred: boolean;
  totalCount: number;
  userLikesCount: number;
  stockBooksCount: number;
  matchPassExpiresAt?: string;
  items: MatchPassItem[];
}

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isPremium = Boolean(user?.isPremium);
  const [activeTab, setActiveTab] = useState<'interested' | 'offered' | 'reservations' | 'matchpass'>('interested');
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  // Datos de Match Pass
  const [matchPassData, setMatchPassData] = useState<MatchPassData | null>(null);
  const [loadingMatchPass, setLoadingMatchPass] = useState(false);
  const [showBuyPassModal, setShowBuyPassModal] = useState(false);

  // Datos de libros que le interesan (Matches / Likes)
  const [likedMatches, setLikedMatches] = useState<MatchTransaction[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Datos de libros propios para intercambiar
  const [offeredBooks, setOfferedBooks] = useState<MyBookItem[]>([]);
  const [loadingOffered, setLoadingOffered] = useState(false);

  // Datos de reservas activas (Premium)
  const [myReservations, setMyReservations] = useState<any[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [actionLoadingBookId, setActionLoadingBookId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    if (formRef.current) {
      const yOffset = -80; // Compensar header fijo de 68px + margen
      const y = formRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  };

  // Modal de propuesta (Pantalla 5)
  const [selectedProposal, setSelectedProposal] = useState<MatchTransaction | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);

  // Formulario para agregar libro a ofrecer (SIN PRECIO POR USUARIO)
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('Excelente');
  const [category, setCategory] = useState('Arte, Cultura y Estilo de Vida');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);


  useEffect(() => {
    fetchLikedMatches();
    fetchOfferedBooks();
    fetchMatchPass();
    if (isPremium) {
      fetchMyReservations();
    }
  }, [isPremium]);

  useEffect(() => {
    const handleScrollEvent = () => {
      setActiveTab('offered');
      setShowAddForm(true);
      setTimeout(scrollToForm, 120);
    };

    window.addEventListener('scroll-to-add-book', handleScrollEvent);
    return () => window.removeEventListener('scroll-to-add-book', handleScrollEvent);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const addParam = params.get('add');
    if (tabParam === 'offered' || addParam === 'true') {
      setActiveTab('offered');
    } else if (tabParam === 'reservations') {
      if (isPremium) {
        setActiveTab('reservations');
      } else {
        setPremiumModalOpen(true);
      }
    } else if (tabParam === 'matchpass') {
      setActiveTab('matchpass');
    }
    if (addParam === 'true') {
      setShowAddForm(true);
      setTimeout(scrollToForm, 200);
    }
  }, [location.search, isPremium]);

  const fetchMatchPass = async () => {
    setLoadingMatchPass(true);
    try {
      const data = await apiClient.get<MatchPassData>('/books/match-pass');
      setMatchPassData(data);
    } catch (err) {
      console.error('Error al cargar Match Pass:', err);
    } finally {
      setLoadingMatchPass(false);
    }
  };

  const fetchMyReservations = async () => {
    if (!isPremium) return;
    setLoadingReservations(true);
    try {
      const data = await apiClient.get<any[]>('/books/my-reservations');
      setMyReservations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar reservas:', err);
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleCancelReservation = async (bookId: string) => {
    try {
      await apiClient.post(`/books/${bookId}/cancel-reservation`);
      await fetchMyReservations();
      setFormSuccess('Reserva liberada con éxito.');
    } catch (err: any) {
      setFormError(err.message || 'No se pudo liberar la reserva.');
    }
  };

  const handleInitiateExchange = async (book: any) => {
    try {
      setActionLoadingBookId(book.id);
      interface SwipeResponse {
        success: boolean;
        isMatch: boolean;
        matchTransactionId?: string;
      }
      const response = await apiClient.post<SwipeResponse>(`/books/${book.id}/swipe`, { action: 'like' });

      if (response && response.isMatch && response.matchTransactionId) {
        setSelectedProposal({
          id: response.matchTransactionId,
          bookId: book.id,
          bookTitle: book.title,
          bookAuthor: book.author,
          bookImageUrl: book.imageUrl,
          bookCondition: book.condition || 'Bueno',
          feeAmount: book.baseValue || 0,
          paymentStatus: 'Pending',
          logisticsStatus: 'Pending',
          isCrossBorder: false
        });
        setMatchModalOpen(true);
      } else {
        await fetchLikedMatches();
        setActiveTab('interested');
        setFormSuccess(`¡"${book.title}" ha sido añadido a tu lista de libros de interés! Selecciona con qué libro intercambiarlo.`);
      }
    } catch (err: any) {
      console.error('Error al iniciar intercambio:', err);
      setFormError(err.message || 'No se pudo iniciar el intercambio para este libro.');
    } finally {
      setActionLoadingBookId(null);
    }
  };

  const fetchLikedMatches = async () => {
    setLoadingMatches(true);
    try {
      const pendingLikesStr = localStorage.getItem('guest_pending_likes');
      if (pendingLikesStr) {
        try {
          const guestLikes: string[] = JSON.parse(pendingLikesStr);
          if (Array.isArray(guestLikes) && guestLikes.length > 0) {
            await apiClient.post('/books/sync-guest-likes', guestLikes);
            localStorage.removeItem('guest_pending_likes');
            localStorage.removeItem('guest_swipes_count');
          }
        } catch (e) {
          console.error('Error al sincronizar me gusta de invitado:', e);
        }
      }

      const data = await apiClient.get<MatchTransaction[]>('/transactions/my-matches');
      setLikedMatches(data);
    } catch (err) {
      console.error('Error al cargar matches para la libreta:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchOfferedBooks = async () => {
    setLoadingOffered(true);
    try {
      const inventory = await apiClient.get<MyBookItem[]>('/books/my-inventory');
      setOfferedBooks(inventory);
    } catch (err) {
      console.error('Error al cargar inventario para la libreta:', err);
    } finally {
      setLoadingOffered(false);
    }
  };

  const handleDeleteLikedMatch = async (matchId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este libro de tus intereses?')) return;
    setFormError(null);
    setFormSuccess(null);
    try {
      await apiClient.delete(`/transactions/my-matches/${matchId}`);
      setLikedMatches((prev) => prev.filter((item) => item.id !== matchId));
      setFormSuccess('El libro fue eliminado de tus intereses exitosamente.');
    } catch (err: any) {
      setFormError(err.message || 'No se pudo eliminar el libro de tus intereses.');
    }
  };

  const handleDeleteOfferedBook = async (bookId: string, bookTitle: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar "${bookTitle}" de tu libreta?`)) return;
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await apiClient.delete<any>(`/books/${bookId}`);
      setOfferedBooks((prev) => prev.filter((item) => item.id !== bookId));
      setFormSuccess(res?.message || 'El libro fue eliminado de tu libreta exitosamente.');
    } catch (err: any) {
      setFormError(err.message || 'No se pudo eliminar el libro de tu libreta.');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);

    try {
      if (!title.trim() || !author.trim() || !description.trim() || !coverImage) {
        throw new Error('Por favor completa el título, autor, descripción y foto de portada del libro.');
      }

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('author', author.trim());
      formData.append('description', description.trim());
      formData.append('condition', condition);
      formData.append('category', category);
      formData.append('coverImage', coverImage);

      await apiClient.post<MyBookItem>('/books/upload', formData);

      setFormSuccess('¡Libro agregado a tu libreta con éxito! Ahora está disponible para recibir intercambios y ofrecerlo para intercambiar con Intercambialibros u otros usuarios.');
      setTitle('');
      setAuthor('');
      setDescription('');
      setCondition('Excelente');
      setCategory('Arte, Cultura y Estilo de Vida');
      setCoverImage(null);
      setImagePreview(null);
      setShowAddForm(false);

      fetchOfferedBooks();
    } catch (err: any) {
      setFormError(err.message || 'Error al agregar el libro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <div>
          <h1>Tu libreta</h1>
          <p>Intercambialibros cruza tus intereses con los libros que tienes disponibles y calcula el costo de intercambio según las reglas del sistema.</p>
        </div>
      </div>

      {/* Pestañas de Tu Libreta (Pantalla 4) */}
      <div className="libreta-tabs">
        <div className='libreta-tab'>
          <button
            type="button"
            onClick={() => setActiveTab('interested')}
            className={`libreta-tab-btn ${activeTab === 'interested' ? 'active' : ''}`}
          >
            <i className="fa-solid fa-heart"></i>
          </button>
          <p>Me interesan ({likedMatches.length})</p>
        </div>

        <div className='libreta-tab'>
          <button
            type="button"
            onClick={() => setActiveTab('offered')}
            className={`libreta-tab-btn ${activeTab === 'offered' ? 'active' : ''}`}
          >
            <i className="fa-solid fa-book-bookmark"></i>
          </button>
          <p>Tengo para intercambiar ({offeredBooks.length})</p>
        </div>

        <div className='libreta-tab'>
          <button
            type="button"
            onClick={() => {
              if (!isPremium) {
                setPremiumModalOpen(true);
              } else {
                setActiveTab('reservations');
                fetchMyReservations();
              }
            }}
            className={`libreta-tab-btn libreta-tab-btn-reservas ${activeTab === 'reservations' ? 'active' : ''}`}
            title={!isPremium ? "Función Premium: Reservas por 4 horas" : "Ver mis reservas"}
          >
            <i className="fa-solid fa-clock"></i>
            <span className="libreta-tab-crown-badge" title="Función Premium">
              <i className="fa-solid fa-crown"></i>
            </span>
          </button>
          <p>
            Reservas {isPremium ? `(${myReservations.length})` : ''}
          </p>
        </div>

        <div className='libreta-tab'>
          <button
            type="button"
            onClick={() => {
              setActiveTab('matchpass');
              fetchMatchPass();
            }}
            className={`libreta-tab-btn libreta-tab-btn-matchpass ${activeTab === 'matchpass' ? 'active' : ''}`}
            title="Match Pass: Descubre quién quiere intercambiar contigo"
          >
            <i className="fa-solid fa-heart-circle-bolt"></i>
            <span className="libreta-tab-crown-badge" title="Match Pass">
              <i className="fa-solid fa-crown"></i>
            </span>
          </button>
          <p>
            Match Pass {matchPassData ? `(${matchPassData.totalCount})` : ''}
          </p>
        </div>
      </div>

      {formSuccess && <div className="inventory-toast success">{formSuccess}</div>}
      {formError && <div className="inventory-toast error">{formError}</div>}

      {/* CONTENIDO DE PESTAÑA: ME INTERESAN */}
      {activeTab === 'interested' && (
        <div className="tab-interested-content">
          {offeredBooks.length === 0 && (
            <div className="no-offered-alert">
              <div>
                <strong className="no-offered-title">
                  <i className="fa-solid fa-triangle-exclamation"></i> No tienes libros cargados en 'Tengo para intercambiar'
                </strong>
                <span className="no-offered-text">
                  Para concretar un intercambio y aceptar propuestas de match, primero debes registrar al menos un libro en tu libreta para ofrecer a cambio.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('offered');
                  setShowAddForm(true);
                  setTimeout(scrollToForm, 100);
                }}
                className="no-offered-btn"
              >
                ＋ Cargar mi libro ahora
              </button>
            </div>
          )}
          {loadingMatches ? (
            <div className="inventory-loading">Cargando tus libros de interés...</div>
          ) : likedMatches.length === 0 ? (
            <div className="inventory-empty-state">
              <span className="empty-state-icon"><i className="fa-solid fa-heart-crack"></i></span>
              <h3>No tienes libros guardados aún</h3>
              <p>Ve a la pantalla de Descubrir (Swipe) y dale me gusta a los libros que te llamen la atención.</p>
              <button className="add-book-trigger-btn font-heading" onClick={() => navigate('/')}>
                Ir a descubrir libros
              </button>
            </div>
          ) : (
            <div className="matches-libreta-list">
              {likedMatches.map((item) => (
                <div
                  key={item.id}
                  className="libreta-match-card"
                >
                  <div className="match-card-content">
                    <div className="match-card-thumb">
                      {item.bookImageUrl ? (
                        <img src={getFileUrl(item.bookImageUrl)} alt={item.bookTitle} />
                      ) : (
                        <div className="match-card-thumb-placeholder"><i className="fa-solid fa-book"></i></div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="match-card-title">{item.bookTitle}</h3>
                        {item.isAvailable === false && (
                          <span className="condition-badge condition-desgastado" style={{ backgroundColor: '#e74c3c', color: '#fff', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px' }}>
                            <i className="fa-solid fa-triangle-exclamation"></i> No disponible
                          </span>
                        )}
                      </div>
                      <span className="match-card-author">{item.bookAuthor}</span>

                      <div className="match-card-meta">
                        <span className="match-card-match-count">
                          <i className="fa-solid fa-arrows-rotate"></i> Match con {offeredBooks.length === 1 ? '1 tuyo' : `${offeredBooks.length} tuyos`}
                        </span>
                        {offeredBooks.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="match-card-fee">
                              Costo de intercambio: ${Math.round(item.feeAmount).toLocaleString('es-CL')} CLP
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="match-card-actions-row">
                    <button
                      type="button"
                      disabled={offeredBooks.length === 0 || item.isAvailable === false}
                      onClick={() => {
                        if (offeredBooks.length === 0 || item.isAvailable === false) return;
                        setSelectedProposal(item);
                        setMatchModalOpen(true);
                      }}
                      className={`match-card-proposal-btn ${offeredBooks.length === 0 || item.isAvailable === false ? 'disabled' : ''}`}
                      title={item.isAvailable === false ? 'Este libro ya fue tomado o reservado por otro usuario.' : (offeredBooks.length === 0 ? 'Debes cargar al menos un libro en "Tengo para intercambiar" para ver propuestas' : 'Ver propuesta de intercambio')}
                    >
                      {item.isAvailable === false ? '⚠️ No disponible' : 'Ver propuesta'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLikedMatch(item.id)}
                      className="match-card-delete-btn"
                      title="Eliminar de me interesan"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))}

              {/* <div className="matches-libreta-footer">
                <button 
                  className={`add-book-trigger-btn font-heading ${offeredBooks.length === 0 ? 'disabled' : ''}`}
                  disabled={offeredBooks.length === 0}
                  onClick={() => {
                    if (offeredBooks.length === 0) return;
                    if (likedMatches.length > 0) {
                      setSelectedProposal(likedMatches[0]);
                      setMatchModalOpen(true);
                    }
                  }}
                  title={offeredBooks.length === 0 ? 'Debes cargar al menos un libro en "Tengo para intercambiar" para ver propuestas' : 'Ver propuestas de intercambio'}
                >
                  ★ Ver propuestas de intercambio
                </button>
              </div> */}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: TENGO PARA INTERCAMBIAR */}
      {activeTab === 'offered' && (
        <div className="tab-offered-content">
          <div className="add-book-bar">
            <button
              className="add-book-trigger-btn font-heading"
              onClick={() => {
                const nextState = !showAddForm;
                setShowAddForm(nextState);
                if (nextState) {
                  setTimeout(scrollToForm, 100);
                }
              }}
            >
              {showAddForm ? 'Regresar' : '＋ Agregar un Libro'}
            </button>
          </div>

          {showAddForm ? (
            <div ref={formRef} id="detalles-libro-ofrecer" className="inventory-form-card">
              <h2><i className="fa-solid fa-book-open"></i> Detalles del Libro a Ofrecer</h2>
              <p className="inventory-form-desc">
                Intercambialibros es una red exclusiva de intercambio. Recuerda que no asignas ningún precio en dinero a tu libro.
              </p>

              <form onSubmit={handleFormSubmit} className="inventory-form">
                <div className="form-two-columns">
                  <div className="form-column">
                    <div className="inventory-field">
                      <label>Título del Libro</label>
                      <input
                        type="text"
                        placeholder="Ej. El Alquimista"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="inventory-field">
                      <label>Autor</label>
                      <input
                        type="text"
                        placeholder="Ej. Paulo Coelho"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        required
                      />
                    </div>

                    <div className="inventory-field">
                      <label>Estado Físico del Libro</label>
                      <select value={condition} onChange={(e) => setCondition(e.target.value)} required>
                        <option value="Excelente">Excelente (Como nuevo, sin doblar)</option>
                        <option value="Bueno">Bueno (Leído, buen estado general)</option>
                        <option value="Aceptable">Aceptable (Con señales de uso)</option>
                        <option value="Desgastado">Desgastado (Portadas o bordes gastados)</option>
                      </select>
                    </div>

                    <div className="inventory-field">
                      <label>Categoría del Libro</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                        <option value="Arte, Cultura y Estilo de Vida">Arte, Cultura y Estilo de Vida</option>
                        <option value="Ciencia, Tecnología y Medicina">Ciencia, Tecnología y Medicina</option>
                        <option value="Desarrollo Personal y Bienestar">Desarrollo Personal y Bienestar</option>
                        <option value="Educación, Aprendizaje y Consulta">Educación, Aprendizaje y Consulta</option>
                        <option value="Ficción, Novelas y Relatos">Ficción, Novelas y Relatos</option>
                        <option value="Historia, Humanidades y Sociedad">Historia, Humanidades y Sociedad</option>
                        <option value="Idiomas, Colecciones y Packs">Idiomas, Colecciones y Packs</option>
                        <option value="Infantil, Juvenil y Cómics">Infantil, Juvenil y Cómics</option>
                        <option value="Negocios, Economía y Derecho">Negocios, Economía y Derecho</option>
                        <option value="Oportunidades y Novedades">Oportunidades y Novedades</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-column">
                    <div className="inventory-field">
                      <label>Sinopsis / Descripción</label>
                      <textarea
                        placeholder="Escribe una breve reseña o notas sobre el estado de tu ejemplar..."
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      />
                    </div>

                    <div className="inventory-field">
                      <label>Fotografía de la Portada</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        required
                        className="inventory-file-input"
                      />
                      {imagePreview && (
                        <div className="image-preview-wrapper">
                          <img src={imagePreview} alt="Preview" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-actions form-actions-mt">
                  <button type="submit" className="save-book-btn" disabled={submitting}>
                    {submitting ? 'Guardando en libreta...' : 'Cargar en mi libreta'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {loadingOffered ? (
            <div className="inventory-loading">Cargando tus libros cargados...</div>
          ) : offeredBooks.length === 0 ? (
            <div className="inventory-empty-state">
              <div className="empty-state-icon"><i className="fa-solid fa-book-bookmark"></i></div>
              <h3>No tienes libros cargados para intercambiar</h3>
              <p>Agrega los libros que tengas en tu casa para que nuestro sistema pueda emparejarte y proponerte intercambios.</p>
              <button className="add-book-trigger-btn font-heading" onClick={() => setShowAddForm(true)}>
                Agregar mi primer libro
              </button>
            </div>
          ) : (
            <div className="inventory-grid">
              {offeredBooks.map((book) => {
                const isDoubleCommitmentActive = !!book.isDoubleExchangeCommitment && !!book.doubleExchangeCommitmentUntil && new Date(book.doubleExchangeCommitmentUntil) > new Date();
                const formattedUnlockDate = book.doubleExchangeCommitmentUntil ? new Date(book.doubleExchangeCommitmentUntil).toLocaleDateString('es-CL') : '';

                let badgeLabel = 'En tu libreta';
                let badgeIcon = 'fa-solid fa-book-bookmark';
                let badgeClass = 'internal';

                if (book.exchangeStatus === 'Exchanged') {
                  badgeLabel = 'Intercambiado con éxito';
                  badgeIcon = 'fa-solid fa-circle-check';
                  badgeClass = 'badge-status-exchanged';
                } else if (book.exchangeStatus === 'InExchange') {
                  badgeLabel = 'En proceso de intercambio';
                  badgeIcon = 'fa-solid fa-box-open';
                  badgeClass = 'badge-status-inexchange';
                } else if (book.exchangeStatus === 'Reserved') {
                  badgeLabel = 'Reservado por 4h';
                  badgeIcon = 'fa-solid fa-clock';
                  badgeClass = 'badge-status-reserved';
                } else if (isDoubleCommitmentActive || book.exchangeStatus === 'DoubleExchangeCommitment') {
                  badgeLabel = 'Compromiso Doble (Solo P2P)';
                  badgeIcon = 'fa-solid fa-repeat';
                  badgeClass = 'badge-status-inexchange';
                }

                return (
                  <div key={book.id} className="inventory-book-item-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <BookCard
                      book={{
                        id: book.id,
                        title: book.title,
                        author: book.author,
                        condition: book.condition,
                        description: book.description,
                        imageUrl: book.imageUrl,
                        stockBadgeLabel: badgeLabel,
                        stockBadgeIcon: badgeIcon,
                        stockBadgeClass: badgeClass,
                        exchangeStatus: book.exchangeStatus,
                      }}
                      className="libreta-swipe-card"
                      showInterestButton={false}
                      showUndoButton={false}
                    />

                    {isDoubleCommitmentActive ? (
                      <div 
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(255, 215, 0, 0.08)',
                          border: '1px solid rgba(255, 215, 0, 0.3)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          color: '#ffd700',
                          cursor: 'not-allowed',
                          textAlign: 'center'
                        }}
                        title={`Sujeto al compromiso de Intercambio Doble hasta el ${formattedUnlockDate}. No puede eliminarse de la libreta antes de transcurrir los 6 meses.`}
                      >
                        <i className="fa-solid fa-lock"></i>
                        <span>Bloqueado por 6 meses (Hasta {formattedUnlockDate})</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteOfferedBook(book.id, book.title)}
                        style={{
                          width: '100%',
                          padding: '7px 12px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '8px',
                          color: '#ef4444',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                        title="Eliminar este libro de tu libreta"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                        <span>Eliminar de mi libreta</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: RESERVAS (PREMIUM) */}
      {activeTab === 'reservations' && (
        <div className="tab-reservations-content">
          {loadingReservations ? (
            <div className="inventory-loading">Cargando tus reservas activas...</div>
          ) : myReservations.length === 0 ? (
            <div className="empty-reservations-state">
              <div className="empty-reservations-icon">
                <i className="fa-solid fa-clock"></i>
              </div>
              <h4>No tienes ninguna reserva activa</h4>
              <p>
                Como usuario Premium puedes reservar hasta 2 libros simultáneos durante 4 horas para congelar el stock a tu favor mientras decides y concretas tu intercambio.
              </p>
              <button
                type="button"
                className="add-book-trigger-btn font-heading"
                onClick={() => navigate('/catalogo')}
              >
                <i className="fa-solid fa-book-open"></i> Explorar Catálogo
              </button>
            </div>
          ) : (
            <div className="reservations-list">
              {myReservations.map((item) => (
                <div key={item.id} className="reservation-item-card">
                  <div className="reservation-item-cover">
                    {item.imageUrl ? (
                      <img src={getFileUrl(item.imageUrl)} alt={item.title} />
                    ) : (
                      <div className="reservation-item-fallback">
                        <i className="fa-solid fa-book"></i>
                      </div>
                    )}
                  </div>

                  <div className="reservation-item-details">
                    <h4 className="reservation-item-title font-heading">{item.title}</h4>
                    <span className="reservation-item-author">por {item.author}</span>
                    <div className="reservation-pills-row">
                      <span className="reservation-timer-pill">
                        <i className="fa-solid fa-clock"></i> Reserva Activa (4 hrs)
                      </span>
                      {item.condition && (
                        <span className="reservation-condition-pill">
                          {item.condition}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="reservation-item-actions">
                    <button
                      type="button"
                      className="reservation-exchange-btn font-heading"
                      onClick={() => handleInitiateExchange(item)}
                      disabled={actionLoadingBookId === item.id}
                      title="Iniciar propuesta de intercambio para este libro"
                    >
                      {actionLoadingBookId === item.id ? (
                        <><i className="fa-solid fa-circle-notch fa-spin"></i> Conectando...</>
                      ) : (
                        <><i className="fa-solid fa-arrows-rotate"></i> Iniciar Intercambio</>
                      )}
                    </button>

                    <button
                      type="button"
                      className="reservation-cancel-btn"
                      onClick={() => handleCancelReservation(item.id)}
                      title="Liberar reserva"
                    >
                      <i className="fa-solid fa-trash-can"></i> Liberar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: MATCH PASS (QUIÉNES QUIEREN INTERCAMBIAR CONTIGO) */}
      {activeTab === 'matchpass' && (
        <div className="tab-matchpass-content">
          {loadingMatchPass ? (
            <div className="inventory-loading" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#10b981', marginBottom: '0.75rem' }}></i>
              <p>Cargando tu Match Pass...</p>
            </div>
          ) : !matchPassData || matchPassData.items.length === 0 ? (
            <div className="empty-reservations-state" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <i className="fa-solid fa-heart-crack" style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '1rem' }}></i>
              <h3>Aún no tienes actividad en Match Pass</h3>
              <p style={{ maxWidth: '480px', margin: '0 auto', color: '#6b7280' }}>
                Cuando otros usuarios den like a tus libros o se agreguen novedades de Ecolectura según tus preferencias, aparecerán aquí.
              </p>
            </div>
          ) : (
            <div>
              {/* HERO BANNER CUANDO ESTÁ BLOQUEADO (FREE / BORROSO) */}
              {matchPassData.isBlurred ? (
                <div
                  className="matchpass-locked-banner"
                  style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    borderRadius: '16px',
                    padding: '1.75rem',
                    color: '#ffffff',
                    marginBottom: '2rem',
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.4)',
                    border: '1px solid #334155',
                    textAlign: 'center'
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid #f59e0b',
                      color: '#fbbf24',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <i className="fa-solid fa-lock"></i> Contenido Exclusivo Desbloqueable
                  </div>
                  <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                    ¡{matchPassData.totalCount} usuarios y libros esperan por ti!
                  </h2>
                  <p style={{ fontSize: '0.95rem', color: '#cbd5e1', maxWidth: '620px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                    Descubre con exactitud quiénes dieron like a tus libros y accede a la selección de stock directo de Bookmachs / Ecolectura para intercambiar al instante.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setPremiumModalOpen(true)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                      }}
                    >
                      <i className="fa-solid fa-crown"></i>
                      <span>Pasar a Premium (Match Pass Incluido)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBuyPassModal(true)}
                      style={{
                        padding: '0.75rem 1.25rem',
                        borderRadius: '10px',
                        border: '1px solid #64748b',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <i className="fa-solid fa-heart-circle-bolt"></i>
                      <span>Comprar Match Pass 1 Semana ($2.990)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* BANNER CUANDO TIENE ACCESO ACTIVO */
                <div
                  className="matchpass-unlocked-banner"
                  style={{
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    borderRadius: '16px',
                    padding: '1.25rem 1.5rem',
                    color: '#065f46',
                    marginBottom: '1.75rem',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                      <i className="fa-solid fa-check"></i>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                        Match Pass Desbloqueado
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#047857' }}>
                        {user?.isPremium ? 'Acceso total permanente con tu membresía Premium' : `Pase semanal activo ${matchPassData.matchPassExpiresAt ? `hasta el ${new Date(matchPassData.matchPassExpiresAt).toLocaleDateString('es-CL')}` : ''}`}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, background: '#ffffff', padding: '0.35rem 0.85rem', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
                    {matchPassData.totalCount} libros disponibles
                  </span>
                </div>
              )}

              {/* GRILLA DE ITEMS DE MATCH PASS */}
              <div
                className={`matchpass-grid ${matchPassData.isBlurred ? 'matchpass-grid-blurred' : ''}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '1.5rem',
                  position: 'relative'
                }}
              >
                {matchPassData.items.map((item, idx) => (
                  <div
                    key={`${item.bookId}-${idx}`}
                    className="matchpass-card"
                    onClick={() => {
                      if (matchPassData.isBlurred) {
                        setShowBuyPassModal(true);
                      } else if (item.bookId && item.bookId !== '00000000-0000-0000-0000-000000000000') {
                        navigate(`/catalogo?search=${encodeURIComponent(item.title)}`);
                      }
                    }}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: matchPassData.isBlurred ? 'pointer' : 'default',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Badge superior de origen */}
                    <div
                      style={{
                        padding: '0.4rem 0.75rem',
                        background: item.sourceType === 'UserLike' ? '#fdf2f8' : '#eff6ff',
                        color: item.sourceType === 'UserLike' ? '#db2777' : '#2563eb',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      <i className={item.sourceType === 'UserLike' ? 'fa-solid fa-heart' : 'fa-solid fa-book'}></i>
                      <span>{item.sourceType === 'UserLike' ? `Le interesa: ${item.targetOfferedBookTitle}` : item.targetOfferedBookTitle}</span>
                    </div>

                    {/* Portada / Imagen con blur condicional */}
                    <div
                      style={{
                        height: '240px',
                        background: '#f3f4f6',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={getFileUrl(item.imageUrl)}
                          alt={item.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: matchPassData.isBlurred ? 'blur(16px)' : 'none',
                            transform: matchPassData.isBlurred ? 'scale(1.15)' : 'none',
                            transition: 'filter 0.3s ease'
                          }}
                        />
                      ) : (
                        <div style={{ color: '#9ca3af', fontSize: '2.5rem' }}>
                          <i className="fa-solid fa-book-open"></i>
                        </div>
                      )}

                      {/* Candado overlay si está en modo blurred */}
                      {matchPassData.isBlurred && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(15, 23, 42, 0.45)',
                            backdropFilter: 'blur(8px)',
                            color: '#ffffff',
                            padding: '1rem',
                            textAlign: 'center'
                          }}
                        >
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              background: '#f59e0b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.1rem',
                              marginBottom: '0.5rem',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                            }}
                          >
                            <i className="fa-solid fa-lock"></i>
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Desbloquear con Match Pass
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info del libro / propuesta */}
                    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#f3f4f6', color: '#4b5563', fontWeight: 600 }}>
                          {item.condition}
                        </span>
                        {item.category && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', fontWeight: 600 }}>
                            {item.category}
                          </span>
                        )}
                      </div>

                      <h4
                        style={{
                          fontSize: '0.98rem',
                          fontWeight: 700,
                          color: '#1f2937',
                          margin: '0 0 0.25rem',
                          filter: matchPassData.isBlurred ? 'blur(5px)' : 'none',
                          userSelect: matchPassData.isBlurred ? 'none' : 'auto'
                        }}
                      >
                        {matchPassData.isBlurred ? 'Título Oculto Por Privacidad' : item.title}
                      </h4>

                      <p
                        style={{
                          fontSize: '0.82rem',
                          color: '#6b7280',
                          margin: '0 0 0.75rem',
                          filter: matchPassData.isBlurred ? 'blur(4px)' : 'none',
                          userSelect: matchPassData.isBlurred ? 'none' : 'auto'
                        }}
                      >
                        {matchPassData.isBlurred ? 'Autor Desconocido' : item.author}
                      </p>

                      <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
                        {matchPassData.isBlurred ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowBuyPassModal(true);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#10b981',
                              color: '#ffffff',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fa-solid fa-lock-open"></i> Ver Detalles
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (item.bookId && item.bookId !== '00000000-0000-0000-0000-000000000000') {
                                navigate(`/catalogo?search=${encodeURIComponent(item.title)}`);
                              } else {
                                setActiveTab('offered');
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              borderRadius: '8px',
                              border: '1px solid #10b981',
                              background: '#ecfdf5',
                              color: '#059669',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fa-solid fa-handshake"></i> Intercambiar Ahora
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Propuesta de Intercambio (Pantalla 5) */}
      <MatchModal
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        book={selectedProposal ? {
          id: selectedProposal.bookId,
          title: selectedProposal.bookTitle,
          author: selectedProposal.bookAuthor,
          condition: selectedProposal.bookCondition,
          description: 'Libro emparejado por compatibilidad.',
          imageUrl: selectedProposal.bookImageUrl
        } : null}
        matchTransactionId={selectedProposal ? selectedProposal.id : null}
        hasOfferedBooks={offeredBooks.length > 0}
        onProceedToCheckout={(txId) => {
          setMatchModalOpen(false);
          navigate(`/transacciones?checkout=${txId}`);
        }}
      />

      {/* Modal Global para Promoción de Funciones Premium */}
      <GlobalPremiumModal
        isOpen={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        featureName="el Match Pass y la Reserva de Libros por 4 Horas"
        icon="fa-solid fa-heart-circle-bolt"
      />

      {/* Modal para compra de Match Pass 1 semana */}
      <BuyAddonModal
        isOpen={showBuyPassModal}
        onClose={() => {
          setShowBuyPassModal(false);
          fetchMatchPass();
        }}
        addonType="MatchPassWeek"
      />
    </div>
  );
};
