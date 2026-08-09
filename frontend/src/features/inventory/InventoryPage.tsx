import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { MatchModal } from '../transactions/components/MatchModal';

interface MyBookItem {
  id: string;
  title: string;
  author: string;
  condition: string;
  description: string;
  imageUrl: string;
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
}

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'interested' | 'offered'>('interested');
  
  // Datos de libros que le interesan (Matches / Likes)
  const [likedMatches, setLikedMatches] = useState<MatchTransaction[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Datos de libros propios para intercambiar
  const [offeredBooks, setOfferedBooks] = useState<MyBookItem[]>([]);
  const [loadingOffered, setLoadingOffered] = useState(false);

  // Modal de propuesta (Pantalla 5)
  const [selectedProposal, setSelectedProposal] = useState<MatchTransaction | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);

  // Formulario para agregar libro a ofrecer (SIN PRECIO POR USUARIO)
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('Excelente');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchLikedMatches();
    fetchOfferedBooks();
  }, []);

  const fetchLikedMatches = async () => {
    setLoadingMatches(true);
    try {
      const data = await apiClient.get<MatchTransaction[]>('/transactions/my-matches');
      setLikedMatches(data);
    } catch (err) {
      console.error('Error al cargar libros de interés:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchOfferedBooks = async () => {
    setLoadingOffered(true);
    try {
      const response = await apiClient.get<MyBookItem[]>('/books/my-inventory');
      setOfferedBooks(response);
    } catch (err) {
      console.error('Error al cargar libros para ofrecer:', err);
    } finally {
      setLoadingOffered(false);
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
      formData.append('coverImage', coverImage);

      await apiClient.post<MyBookItem>('/books/upload', formData);

      setFormSuccess('¡Libro agregado a tu libreta con éxito! Ahora está disponible para recibir intercambios.');
      setTitle('');
      setAuthor('');
      setDescription('');
      setCondition('Excelente');
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
          <p>Bookmachs cruza tus intereses con los libros que tienes disponibles y calcula el costo de intercambio según las reglas del sistema.</p>
        </div>
      </div>

      {/* Pestañas de Tu Libreta (Pantalla 4) */}
      <div className="libreta-tabs" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('interested')}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            border: activeTab === 'interested' ? '2px solid var(--neon)' : '1px solid var(--border-color)',
            background: activeTab === 'interested' ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            color: activeTab === 'interested' ? 'var(--neon)' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          <i className="fa-solid fa-heart" style={{ marginRight: '0.5rem' }}></i>
          Me interesan ({likedMatches.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('offered')}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            border: activeTab === 'offered' ? '2px solid var(--neon)' : '1px solid var(--border-color)',
            background: activeTab === 'offered' ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            color: activeTab === 'offered' ? 'var(--neon)' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          <i className="fa-solid fa-book-bookmark" style={{ marginRight: '0.5rem' }}></i>
          Tengo para intercambiar ({offeredBooks.length})
        </button>
      </div>

      {formSuccess && <div className="inventory-toast success">{formSuccess}</div>}
      {formError && <div className="inventory-toast error">{formError}</div>}

      {/* CONTENIDO DE PESTAÑA: ME INTERESAN */}
      {activeTab === 'interested' && (
        <div className="tab-interested-content">
          {offeredBooks.length === 0 && (
            <div style={{ background: 'rgba(255, 183, 3, 0.1)', border: '1px solid #ffb703', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <strong style={{ color: '#ffb703', fontSize: '0.95rem', display: 'block', marginBottom: '0.25rem' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> No tienes libros cargados en 'Tengo para intercambiar'
                </strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Para concretar un intercambio y aceptar propuestas de match, primero debes registrar al menos un libro en tu libreta para ofrecer a cambio.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('offered');
                  setShowAddForm(true);
                }}
                style={{ background: '#ffb703', color: '#000', padding: '0.6rem 1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
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
            <div className="matches-libreta-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {likedMatches.map((item, index) => (
                <div 
                  key={item.id} 
                  className="libreta-match-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1rem',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '60px', height: '80px', borderRadius: '6px', overflow: 'hidden', background: '#222', flexShrink: 0 }}>
                      {item.bookImageUrl ? (
                        <img src={item.bookImageUrl} alt={item.bookTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}><i className="fa-solid fa-book"></i></div>
                      )}
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{item.bookTitle}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.bookAuthor}</span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>
                          <i className="fa-solid fa-arrows-rotate"></i> Match con {offeredBooks.length > 0 ? (index % 2 === 0 ? '2 tuyos' : '1 tuyo') : '0 libros tuyos'}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <span style={{ color: 'var(--neon)', fontWeight: 700 }}>
                          Costo de intercambio: ${item.feeAmount.toLocaleString()} CLP
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProposal(item);
                      setMatchModalOpen(true);
                    }}
                    style={{
                      background: 'rgba(0, 229, 255, 0.1)',
                      border: '1px solid var(--neon)',
                      color: 'var(--neon)',
                      padding: '0.6rem 1rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Ver propuesta {'>'}
                  </button>
                </div>
              ))}

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button 
                  className="add-book-trigger-btn font-heading" 
                  onClick={() => {
                    if (likedMatches.length > 0) {
                      setSelectedProposal(likedMatches[0]);
                      setMatchModalOpen(true);
                    }
                  }}
                  style={{ background: 'var(--green-bright)', fontWeight: 800, padding: '0.9rem 1.5rem' }}
                >
                  ★ Ver propuestas de intercambio
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE PESTAÑA: TENGO PARA INTERCAMBIAR */}
      {activeTab === 'offered' && (
        <div className="tab-offered-content">
          <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', marginBottom: '1.25rem' }}>
            <button 
              className="add-book-trigger-btn font-heading"
              onClick={() => setShowAddForm(!showAddForm)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {showAddForm ? 'Cancelar' : '＋ Agregar un Libro'}
            </button>
          </div>

          {showAddForm ? (
            <div className="inventory-form-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <h2><i className="fa-solid fa-book-open"></i> Detalles del Libro a Ofrecer</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Bookmachs es una red exclusiva de intercambio. Recuerda que no asignas ningún precio en dinero a tu libro.
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
                        style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px dashed var(--border-color)', width: '100%' }}
                      />
                      {imagePreview && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <img src={imagePreview} alt="Preview" style={{ height: '70px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: '1.25rem' }}>
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
              {offeredBooks.map((book) => (
                <div key={book.id} className="inventory-card">
                  <div className="inventory-card-cover">
                    {book.imageUrl ? (
                      <div className="book-3d-wrapper">
                        <div className="book-spine"></div>
                        <img src={book.imageUrl} alt={book.title} className="inventory-card-img" />
                      </div>
                    ) : (
                      <div className="no-cover-placeholder"><i className="fa-solid fa-book"></i></div>
                    )}
                    <span className={`condition-badge ${book.condition.toLowerCase()}`}>
                      {book.condition}
                    </span>
                  </div>
                  <div className="inventory-card-body">
                    <h3>{book.title}</h3>
                    <span className="author-label">{book.author}</span>
                    <p className="desc-label">{book.description}</p>
                  </div>
                </div>
              ))}
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
          description: 'Libro emparejado por compatibilidad de IA.',
          imageUrl: selectedProposal.bookImageUrl
        } : null}
        matchTransactionId={selectedProposal ? selectedProposal.id : null}
        hasOfferedBooks={offeredBooks.length > 0}
        onProceedToCheckout={(txId) => {
          setMatchModalOpen(false);
          navigate(`/transacciones?checkout=${txId}`);
        }}
      />
    </div>
  );
};
