import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { getFileUrl } from '../../lib/formatters';
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
  isAvailable?: boolean;
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
  const [category, setCategory] = useState('Arte, Cultura y Estilo de Vida');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Estado de expansión de descripción para los libros de la libreta
  const [expandedBookIds, setExpandedBookIds] = useState<Set<string>>(new Set());

  const toggleExpandBook = (bookId: string) => {
    setExpandedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  };

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

      setFormSuccess('¡Libro agregado a tu libreta con éxito! Ahora está disponible para recibir intercambios y ofrecerlo para intercambiar con Bookmachs u otros usuarios.');
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
                          <i className="fa-solid fa-arrows-rotate"></i> Match con {offeredBooks.length > 0 ? (index % 2 === 0 ? '2 tuyos' : '1 tuyo') : '0 libros tuyos'}
                        </span>
                        <span>•</span>
                        <span className="match-card-fee">
                          Costo de intercambio: ${Math.round(item.feeAmount).toLocaleString('es-CL')} CLP
                        </span>
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

              <div className="matches-libreta-footer">
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
                const isExpanded = expandedBookIds.has(book.id);
                return (
                  <div key={book.id} className="book-swipe-card libreta-swipe-card">
                    <div className="book-card-image-placeholder">
                      {book.imageUrl ? (
                        <img src={getFileUrl(book.imageUrl)} alt={book.title} className="swipe-card-img" />
                      ) : (
                        <span className="book-fallback-icon"><i className="fa-solid fa-book"></i></span>
                      )}
                    </div>
                    <div className="book-card-info">
                      <span className={`condition-badge ${book.condition.toLowerCase()}`}>
                        Estado libro: {book.condition}
                      </span>
                      <h3>{book.title}</h3>
                      <span className="book-author">{book.author}</span>
                      <p className={`book-desc ${isExpanded ? 'expanded' : ''}`}>
                        {book.description}
                      </p>
                      {book.description && book.description.length > 80 && (
                        <button
                          type="button"
                          className="see-more-btn"
                          onClick={() => toggleExpandBook(book.id)}
                        >
                          {isExpanded ? (
                            <>Ver menos <i className="fa-solid fa-chevron-up"></i></>
                          ) : (
                            <>Ver más <i className="fa-solid fa-chevron-down"></i></>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
