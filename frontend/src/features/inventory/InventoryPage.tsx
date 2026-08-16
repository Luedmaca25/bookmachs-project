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
      <div className="libreta-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('interested')}
          className={`libreta-tab-btn ${activeTab === 'interested' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-heart"></i>
          Me interesan ({likedMatches.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('offered')}
          className={`libreta-tab-btn ${activeTab === 'offered' ? 'active' : ''}`}
        >
          <i className="fa-solid fa-book-bookmark"></i>
          Tengo para intercambiar ({offeredBooks.length})
        </button>
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
              {likedMatches.map((item, index) => (
                <div 
                  key={item.id} 
                  className="libreta-match-card"
                >
                  <div className="match-card-content">
                    <div className="match-card-thumb">
                      {item.bookImageUrl ? (
                        <img src={item.bookImageUrl} alt={item.bookTitle} />
                      ) : (
                        <div className="match-card-thumb-placeholder"><i className="fa-solid fa-book"></i></div>
                      )}
                    </div>
                    <div>
                      <h3 className="match-card-title">{item.bookTitle}</h3>
                      <span className="match-card-author">{item.bookAuthor}</span>
                      
                      <div className="match-card-meta">
                        <span className="match-card-match-count">
                          <i className="fa-solid fa-arrows-rotate"></i> Match con {offeredBooks.length > 0 ? (index % 2 === 0 ? '2 tuyos' : '1 tuyo') : '0 libros tuyos'}
                        </span>
                        <span>•</span>
                        <span className="match-card-fee">
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
                    className="match-card-proposal-btn"
                  >
                    Ver propuesta
                  </button>
                </div>
              ))}

              <div className="matches-libreta-footer">
                <button 
                  className="add-book-trigger-btn font-heading" 
                  onClick={() => {
                    if (likedMatches.length > 0) {
                      setSelectedProposal(likedMatches[0]);
                      setMatchModalOpen(true);
                    }
                  }}
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
          <div className="add-book-bar">
            <button 
              className="add-book-trigger-btn font-heading"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? 'Regresar' : '＋ Agregar un Libro'}
            </button>
          </div>

          {showAddForm ? (
            <div className="inventory-form-card">
              <h2><i className="fa-solid fa-book-open"></i> Detalles del Libro a Ofrecer</h2>
              <p className="inventory-form-desc">
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
