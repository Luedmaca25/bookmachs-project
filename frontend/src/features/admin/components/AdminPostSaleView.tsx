import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { apiClient } from '../../../lib/apiClient';
import { getFileUrl } from '../../../lib/formatters';
import type { AdminOrder } from '../types';

interface AdminPostSaleViewProps {
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const AdminPostSaleView: React.FC<AdminPostSaleViewProps> = ({ onShowToast }) => {
  const queryClient = useQueryClient();
  const [postSaleFilter, setPostSaleFilter] = useState<'all' | 'delivered' | 'intransit' | 'incident'>('all');
  const [searchPostSale, setSearchPostSale] = useState<string>('');

  // Modal para editar post venta
  const [editingPostSaleOrder, setEditingPostSaleOrder] = useState<AdminOrder | null>(null);
  const [postSaleStatusInput, setPostSaleStatusInput] = useState<string>('');
  const [postSaleNotesInput, setPostSaleNotesInput] = useState<string>('');

  const { data: allOrders, isLoading, error } = useQuery<AdminOrder[]>({
    queryKey: ['adminOrders', 'all', searchPostSale],
    queryFn: () => apiClient.get<AdminOrder[]>(`/admindashboard/orders?status=all&search=${encodeURIComponent(searchPostSale)}`)
  });

  const updatePostSaleMutation = useMutation({
    mutationFn: (payload: { id: string; body: any }) => 
      apiClient.put<any>(`/admindashboard/orders/${payload.id}/post-sale`, payload.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      setEditingPostSaleOrder(null);
      onShowToast('Ficha de post venta actualizada con éxito.', 'success');
    },
    onError: (err: Error) => {
      onShowToast(err.message || 'Error al actualizar post venta.', 'error');
    }
  });

  const openPostSaleModal = (order: AdminOrder) => {
    setEditingPostSaleOrder(order);
    setPostSaleStatusInput(order.postSaleStatus || (order.logisticsStatus === 'Delivered' ? 'Entregado Conforme' : 'En Seguimiento'));
    setPostSaleNotesInput(order.postSaleNotes || '');
  };

  const handlePostSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPostSaleOrder) return;

    updatePostSaleMutation.mutate({
      id: editingPostSaleOrder.id,
      body: {
        postSaleStatus: postSaleStatusInput,
        postSaleNotes: postSaleNotesInput.trim()
      }
    });
  };

  // Filtrar solo pedidos que tengan relevancia post venta (entregados, en camino, o con incidencias)
  const filteredOrders = (allOrders || []).filter((order) => {
    if (postSaleFilter === 'delivered') return order.logisticsStatus === 'Delivered';
    if (postSaleFilter === 'intransit') return order.logisticsStatus === 'InTransit' || order.logisticsStatus === 'Despachado';
    if (postSaleFilter === 'incident') return order.postSaleStatus?.toLowerCase().includes('incidencia');
    return true;
  });

  const getCourierTrackingUrl = (courier?: string | null, tracking?: string | null) => {
    if (!tracking) return null;
    const c = courier?.toLowerCase() || '';
    if (c.includes('starken')) {
      return `https://www.starken.cl/seguimiento?codigo=${tracking}`;
    }
    if (c.includes('chilexpress')) {
      return `https://www.chilexpress.cl/tracking?orden=${tracking}`;
    }
    if (c.includes('blue')) {
      return `https://www.bluex.cl/seguimiento?orden=${tracking}`;
    }
    if (c.includes('correos')) {
      return `https://www.correos.cl/seguimiento-en-linea?envio=${tracking}`;
    }
    return `https://www.google.com/search?q=tracking+${tracking}`;
  };

  return (
    <div className="admin-postsale-container">
      {/* Header y Filtros Post Venta */}
      <div className="admin-orders-controls">
        <div className="orders-filter-chips">
          <button 
            type="button" 
            className={`chip-btn ${postSaleFilter === 'all' ? 'active' : ''}`}
            onClick={() => setPostSaleFilter('all')}
          >
            Todos los Despachos ({allOrders?.length ?? 0})
          </button>
          <button 
            type="button" 
            className={`chip-btn ${postSaleFilter === 'intransit' ? 'active' : ''}`}
            onClick={() => setPostSaleFilter('intransit')}
          >
            🚚 En Seguimiento (En Tránsito)
          </button>
          <button 
            type="button" 
            className={`chip-btn ${postSaleFilter === 'delivered' ? 'active' : ''}`}
            onClick={() => setPostSaleFilter('delivered')}
          >
            ✓ Entregados Conformes
          </button>
          <button 
            type="button" 
            className={`chip-btn ${postSaleFilter === 'incident' ? 'active' : ''}`}
            onClick={() => setPostSaleFilter('incident')}
          >
            ⚠️ Incidencias / Soporte
          </button>
        </div>

        <div className="orders-search-box">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input 
            type="text" 
            placeholder="Buscar por cliente, tracking Starken/Chilexpress o libro..."
            value={searchPostSale}
            onChange={(e) => setSearchPostSale(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="loading-spinner" style={{ padding: '3rem' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
          Cargando módulo de seguimiento y post venta...
        </div>
      ) : error ? (
        <div className="error-box">Error al cargar post venta: {(error as Error).message}</div>
      ) : filteredOrders.length === 0 ? (
        <div className="warning-requirements-box admin-empty-box">
          <i className="fa-solid fa-headset" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', color: '#9ca3af' }}></i>
          No hay pedidos registrados en este estado de post venta.
        </div>
      ) : (
        <div className="postsale-grid">
          {filteredOrders.map((order) => {
            const trackingUrl = getCourierTrackingUrl(order.courierName, order.trackingNumber);
            const isDelivered = order.logisticsStatus === 'Delivered';
            const isIncident = order.postSaleStatus?.toLowerCase().includes('incidencia');

            return (
              <div key={order.id} className={`postsale-card ${isIncident ? 'card-incident' : isDelivered ? 'card-delivered' : ''}`}>
                <div className="postsale-card-top">
                  <span className="postsale-order-tag">Orden #{order.buyOrder}</span>
                  <span className={`postsale-status-badge ${isIncident ? 'badge-incident' : isDelivered ? 'badge-delivered' : 'badge-transit'}`}>
                    {order.postSaleStatus || (isDelivered ? 'Entregado Conforme' : 'En Seguimiento')}
                  </span>
                </div>

                <div className="postsale-client-info">
                  <div className="postsale-avatar-box">
                    <i className="fa-solid fa-user"></i>
                  </div>
                  <div>
                    <strong className="postsale-name">{order.requester.name}</strong>
                    <div className="postsale-meta">
                      <span><i className="fa-solid fa-phone"></i> {order.requester.telefono || 'Sin teléfono'}</span>
                      <span><i className="fa-solid fa-location-dot"></i> {order.shippingCity || 'Santiago'}</span>
                    </div>
                  </div>
                </div>

                <div className="postsale-book-preview">
                  <img src={getFileUrl(order.requestedBook.imageUrl)} alt={order.requestedBook.title} />
                  <div>
                    <div className="postsale-book-title">{order.requestedBook.title}</div>
                    <div className="postsale-book-author">Autor: {order.requestedBook.author}</div>
                  </div>
                </div>

                {/* Tracking & Courier Section */}
                <div className="postsale-tracking-box">
                  <div className="postsale-courier-name">
                    <i className="fa-solid fa-truck"></i> {order.courierName || 'Courier por asignar'}
                  </div>
                  {order.trackingNumber ? (
                    <div className="postsale-tracking-val">
                      N° Seguimiento: <strong>{order.trackingNumber}</strong>
                    </div>
                  ) : (
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>Sin número de tracking registrado</span>
                  )}

                  {trackingUrl && (
                    <a 
                      href={trackingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="postsale-track-link"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square"></i> Rastrear en {order.courierName || 'Courier'}
                    </a>
                  )}
                </div>

                {/* Reseña o Calificación del Usuario si existe */}
                {order.review?.rating && (
                  <div className="postsale-review-box">
                    <div className="review-stars">
                      {'★'.repeat(order.review.rating)}{'☆'.repeat(5 - order.review.rating)}
                      <span className="review-num">({order.review.rating}/5)</span>
                    </div>
                    {order.review.comment && (
                      <p className="review-comment">"{order.review.comment}"</p>
                    )}
                  </div>
                )}

                {/* Notas de soporte */}
                {order.postSaleNotes && (
                  <div className="postsale-notes-box">
                    <small>Notas de atención:</small>
                    <p>{order.postSaleNotes}</p>
                  </div>
                )}

                <div className="postsale-card-actions">
                  <button 
                    type="button" 
                    onClick={() => openPostSaleModal(order)}
                    className="btn-edit-postsale"
                  >
                    <i className="fa-solid fa-pen-to-square"></i> Gestionar Caso Post Venta
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL GESTIÓN POST VENTA */}
      {editingPostSaleOrder && createPortal(
        <div className="guest-limit-modal-overlay" onClick={() => setEditingPostSaleOrder(null)}>
          <div className="guest-limit-modal-card admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              onClick={() => setEditingPostSaleOrder(null)} 
              className="guest-limit-close-btn"
              title="Cerrar"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <form onSubmit={handlePostSaleSubmit} className="admin-modal-form-body">
              <div className="modal-header">
                <h2>Gestión Post Venta #{editingPostSaleOrder.buyOrder}</h2>
                <p>Cliente: <strong>{editingPostSaleOrder.requester.name}</strong> • Libro: {editingPostSaleOrder.requestedBook.title}</p>
              </div>

              <div className="modal-field admin-modal-field-gap">
                <label>Estado de Atención Post Venta</label>
                <select 
                  value={postSaleStatusInput} 
                  onChange={(e) => setPostSaleStatusInput(e.target.value)}
                  className="admin-select-input"
                  required
                >
                  <option value="En Seguimiento">En Seguimiento (Courier / Tránsito)</option>
                  <option value="Entregado Conforme">Entregado Conforme (Sin observaciones)</option>
                  <option value="Incidencia Reportada - Retraso Courier">Incidencia - Retraso en Courier</option>
                  <option value="Incidencia Reportada - Paquete Dañado">Incidencia - Libro o Paquete Dañado</option>
                  <option value="Incidencia Reportada - No Retirado">Incidencia - No Retirado en Sucursal</option>
                  <option value="Caso Resuelto / Mediado">Caso Resuelto / Mediado por Soporte</option>
                </select>
              </div>

              <div className="modal-field admin-modal-field-gap">
                <label>Bitácora de Atención y Notas Post Venta</label>
                <textarea 
                  rows={4}
                  placeholder="Escribe detalles del contacto con el cliente, resolución de dudas o acuerdos de compensación..."
                  value={postSaleNotesInput} 
                  onChange={(e) => setPostSaleNotesInput(e.target.value)}
                  className="admin-modal-textarea"
                />
              </div>

              <div className="admin-modal-actions">
                <button 
                  type="button" 
                  onClick={() => setEditingPostSaleOrder(null)} 
                  className="cancel-btn"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="modal-submit-btn admin-modal-submit-btn"
                  disabled={updatePostSaleMutation.isPending}
                >
                  {updatePostSaleMutation.isPending ? 'Guardando...' : 'Guardar Estado Post Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
