import React, { useState } from 'react';
import { apiClient } from '../../lib/apiClient';

interface BookItem {
  id: string;
  title: string;
  author: string;
  condition: string;
  description: string;
  imageUrl: string;
}

export const InventoryPage: React.FC = () => {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // Estados del formulario
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('Excelente');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cargar lista de libros del usuario
  React.useEffect(() => {
    fetchUserInventory();
  }, []);

  const fetchUserInventory = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const response = await apiClient.get<BookItem[]>('/books/my-inventory');
      setBooks(response);
    } catch (err: unknown) {
      console.error('Error al cargar inventario:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      // Validar campos
      if (!title.trim() || !author.trim() || !description.trim() || !coverImage) {
        throw new Error('Por favor completa todos los campos del formulario, incluyendo la imagen de portada.');
      }

      // Preparar FormData para subida de archivo y campos de texto
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('author', author.trim());
      formData.append('description', description.trim());
      formData.append('condition', condition);
      formData.append('coverImage', coverImage);

      await apiClient.post<BookItem>('/books/upload', formData);

      setSuccessMsg('¡Libro agregado con éxito a tu libreta! Ahora forma parte del stock de intercambio.');
      
      // Limpiar formulario
      setTitle('');
      setAuthor('');
      setDescription('');
      setCondition('Excelente');
      setCoverImage(null);
      setImagePreview(null);
      setShowForm(false);
      
      // Recargar lista
      fetchUserInventory();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Error al subir el libro. Asegúrate de completar todos los campos obligatorios.');
      } else {
        setError('Ocurrió un error inesperado al registrar el libro.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <div>
          <h1>Tu Libreta de Libros</h1>
          <p>Administra y añade los libros físicos que deseas ofrecer para el intercambio.</p>
        </div>
        <button 
          className="add-book-trigger-btn font-heading" 
          onClick={() => {
            setShowForm(!showForm);
            setError(null);
            setSuccessMsg(null);
          }}
        >
          {showForm ? 'Volver a la lista' : '＋ Agregar un Libro'}
        </button>
      </div>

      {successMsg && <div className="inventory-toast success">{successMsg}</div>}
      {error && <div className="inventory-toast error">{error}</div>}

      {showForm ? (
        <div className="inventory-form-card">
          <h2>📖 Detalles del Libro</h2>
          <p>Completa la ficha técnica para que otros usuarios puedan descubrir tu libro.</p>

          <form onSubmit={handleSubmit} className="inventory-form">
            <div className="form-two-columns">
              <div className="form-column">
                <div className="inventory-field">
                  <label>Título del Libro</label>
                  <input
                    type="text"
                    placeholder="Ej. Cien años de soledad"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="inventory-field">
                  <label>Autor</label>
                  <input
                    type="text"
                    placeholder="Ej. Gabriel García Márquez"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    required
                  />
                </div>

                <div className="inventory-field">
                  <label>Estado Físico</label>
                  <select value={condition} onChange={(e) => setCondition(e.target.value)} required>
                    <option value="Excelente">Excelente (Como nuevo, sin marcas)</option>
                    <option value="Bueno">Bueno (Leído pero bien conservado)</option>
                    <option value="Aceptable">Aceptable (Con marcas de uso o dobleces)</option>
                    <option value="Desgastado">Desgastado (Portada dañada o páginas sueltas)</option>
                  </select>
                </div>
              </div>

              <div className="form-column">
                <div className="inventory-field">
                  <label>Resumen / Sinopsis</label>
                  <textarea
                    placeholder="Escribe una breve reseña del contenido y el estado para llamar la atención del lector..."
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="inventory-field">
                  <label>Imagen de Portada</label>
                  <div className="file-upload-wrapper">
                    <input
                      type="file"
                      accept="image/*"
                      id="cover-file-input"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                      required
                    />
                    <label htmlFor="cover-file-input" className="file-upload-label">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Vista previa de portada" className="cover-preview-img" />
                      ) : (
                        <div className="file-upload-placeholder">
                          <span className="placeholder-icon">📸</span>
                          <p>Seleccionar portada del libro</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-book-btn" disabled={submitting}>
                {submitting ? 'Guardando libro...' : 'Publicar en mi Libreta'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="inventory-list-section">
          {loadingList ? (
            <div className="inventory-loading">Cargando tus libros...</div>
          ) : books.length === 0 ? (
            <div className="inventory-empty-state">
              <div className="empty-state-icon">📚</div>
              <h3>Tu libreta está vacía</h3>
              <p>Comienza subiendo tus libros para poder participar en la comunidad de intercambios de Bookmachs.</p>
              <button className="add-book-trigger-btn font-heading" onClick={() => setShowForm(true)}>
                Agregar mi primer libro
              </button>
            </div>
          ) : (
            <div className="inventory-grid">
              {books.map((book) => (
                <div key={book.id} className="inventory-card">
                  <div className="inventory-card-cover">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} />
                    ) : (
                      <div className="no-cover-placeholder">📖</div>
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
    </div>
  );
};
