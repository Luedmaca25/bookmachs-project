import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { apiClient } from '../../../lib/apiClient';
import { getFileUrl } from '../../../lib/formatters';
import type { AdminOrder } from '../types';
import { AdminShippingLabelModal } from './AdminShippingLabelModal';

interface AdminOrdersViewProps {
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export const AdminOrdersView: React.FC<AdminOrdersViewProps> = ({ onShowToast }) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modales
  const [selectedOrderForLabel, setSelectedOrderForLabel] = useState<AdminOrder | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<AdminOrder | null>(null);
  const [selectedOrderForProcess, setSelectedOrderForProcess] = useState<AdminOrder | null>(null);

  // Formulario de procesamiento de pedido
  const [processStatus, setProcessStatus] = useState<string>('');
  const [processTracking, setProcessTracking] = useState<string>('');
  const [processCourier, setProcessCourier] = useState<string>('');
  const [processAddress, setProcessAddress] = useState<string>('');
  const [processCity, setProcessCity] = useState<string>('');
  const [processRegion, setProcessRegion] = useState<string>('');
  const [processNotes, setProcessNotes] = useState<string>('');

  const { data: orders, isLoading, error } = useQuery<AdminOrder[]>({
    queryKey: ['adminOrders', statusFilter, searchTerm],
    queryFn: () => apiClient.get<AdminOrder[]>(`/admindashboard/orders?status=${statusFilter}&search=${encodeURIComponent(searchTerm)}`)
  });

  const processOrderMutation = useMutation({
    mutationFn: (payload: { id: string; body: any }) => 
      apiClient.put<any>(`/admindashboard/orders/${payload.id}/process`, payload.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      setSelectedOrderForProcess(null);
      onShowToast('Estado del intercambio y logística actualizados con éxito.', 'success');
    },
    onError: (err: Error) => {
      onShowToast(err.message || 'Error al procesar el pedido.', 'error');
    }
  });

  const openProcessModal = (order: AdminOrder) => {
    setSelectedOrderForProcess(order);
    setProcessStatus(order.logisticsStatus);
    setProcessTracking(order.trackingNumber || '');
    setProcessCourier(order.courierName || 'Starken');
    setProcessAddress(order.shippingAddress || '');
    setProcessCity(order.shippingCity || '');
    setProcessRegion(order.shippingRegion || 'Región Metropolitana');
    setProcessNotes(order.adminNotes || '');
  };

  const handleProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForProcess) return;

    processOrderMutation.mutate({
      id: selectedOrderForProcess.id,
      body: {
        logisticsStatus: processStatus,
        trackingNumber: processTracking.trim(),
        courierName: processCourier.trim(),
        shippingAddress: processAddress.trim(),
        shippingCity: processCity.trim(),
        shippingRegion: processRegion.trim(),
        adminNotes: processNotes.trim()
      }
    });
  };

  const formatClp = (val?: number) => {
    const num = Math.round(val ?? 0);
    return `$${num.toLocaleString('es-CL')} CLP`;
  };

  const getStatusBadge = (logisticsStatus: string, paymentStatus: string) => {
    if (logisticsStatus === 'Delivered') {
      return <span className="admin-status-pill pill-delivered"><i className="fa-solid fa-circle-check"></i> Entregado</span>;
    }
    if (logisticsStatus === 'InTransit' || logisticsStatus === 'Despachado') {
      return <span className="admin-status-pill pill-intransit"><i className="fa-solid fa-truck-fast"></i> En Camino</span>;
    }
    if (logisticsStatus === 'En Preparación') {
      return <span className="admin-status-pill pill-preparing"><i className="fa-solid fa-box-open"></i> En Preparación</span>;
    }
    if (logisticsStatus === 'En Espera' || logisticsStatus === 'Pendiente Comprobante') {
      return <span className="admin-status-pill pill-waiting"><i className="fa-solid fa-clock"></i> En Espera</span>;
    }
    if (paymentStatus === 'Pending') {
      return <span className="admin-status-pill pill-unpaid"><i className="fa-solid fa-triangle-exclamation"></i> Pago Pendiente</span>;
    }
    return <span className="admin-status-pill">{logisticsStatus}</span>;
  };

  return (
    <div className="admin-orders-container">
      {/* Barra de Filtros y Búsqueda */}
      <div className="admin-orders-controls">
        <div className="orders-filter-chips">
          <button 
            type="button" 
            className={`chip-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Todos ({orders?.length ?? 0})
          </button>
          <button 
            type="button" 
            className={`chip-btn ${statusFilter === 'paid' ? 'active' : ''}`}
            onClick={() => setStatusFilter('paid')}
          >
            Pagados / Listos
          </button>
          <button 
            type="button" 
            className={`chip-btn ${statusFilter === 'waiting' ? 'active' : ''}`}
            onClick={() => setStatusFilter('waiting')}
          >
            En Espera
          </button>
          <button 
            type="button" 
            className={`chip-btn ${statusFilter === 'intransit' ? 'active' : ''}`}
            onClick={() => setStatusFilter('intransit')}
          >
            En Tránsito / Despachados
          </button>
          <button 
            type="button" 
            className={`chip-btn ${statusFilter === 'delivered' ? 'active' : ''}`}
            onClick={() => setStatusFilter('delivered')}
          >
            Entregados
          </button>
          <button 
            type="button" 
            className={`chip-btn ${statusFilter === 'pending_payment' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending_payment')}
          >
            Pago Pendiente
          </button>
        </div>

        <div className="orders-search-box">
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input 
            type="text" 
            placeholder="Buscar por Orden, Cliente, RUT, Teléfono, Libro, Comuna o Tracking..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="loading-spinner" style={{ padding: '3rem' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
          Cargando intercambios y pedidos...
        </div>
      ) : error ? (
        <div className="error-box">Error al cargar pedidos: {(error as Error).message}</div>
      ) : !orders || orders.length === 0 ? (
        <div className="warning-requirements-box admin-empty-box">
          <i className="fa-solid fa-boxes-packing" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', color: '#9ca3af' }}></i>
          No se encontraron intercambios que coincidan con los filtros aplicados.
        </div>
      ) : (
        <div className="orders-table-wrapper">
          <table className="admin-data-table orders-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Fecha</th>
                <th>Cliente / Ubicación</th>
                <th>Libro Solicitado</th>
                <th>Libro Entregado</th>
                <th>Método & Logística</th>
                <th>Fee / Pago</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const dateStr = new Date(order.createdAt).toLocaleDateString('es-CL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });

                return (
                  <tr key={order.id} className="order-row">
                    {/* Orden */}
                    <td>
                      <strong className="order-buyorder-badge">#{order.buyOrder}</strong>
                    </td>

                    {/* Fecha */}
                    <td>
                      <span className="order-date-text">{dateStr}</span>
                    </td>

                    {/* Cliente & Ubicación */}
                    <td>
                      <div className="order-client-cell">
                        <strong className="client-name">{order.requester.name}</strong>
                        {order.requester.isPremium && <span className="user-plan-tag tag-premium">PREMIUM</span>}
                        <div className="client-meta">
                          <span><i className="fa-solid fa-id-card"></i> {order.requester.documentoIdentidad || 'Sin RUT'}</span>
                          <span><i className="fa-solid fa-phone"></i> {order.requester.telefono || 'Sin fono'}</span>
                        </div>
                        <div className="client-location-sub">
                          <i className="fa-solid fa-location-dot" style={{ color: '#0F9D58' }}></i>
                          <span>{order.shippingCity || 'Santiago'}, {order.shippingRegion || 'RM'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Libro Solicitado */}
                    <td>
                      <div className="order-book-cell">
                        <img 
                          src={getFileUrl(order.requestedBook.imageUrl) || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=60'} 
                          alt={order.requestedBook.title}
                          className="book-thumb-small" 
                        />
                        <div className="book-cell-info">
                          <strong className="book-cell-title">{order.requestedBook.title}</strong>
                          <span className="book-cell-author">{order.requestedBook.author}</span>
                          <span className={`book-condition-pill ${order.requestedBook.condition.toLowerCase()}`}>
                            {order.requestedBook.condition}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Libro Ofrecido */}
                    <td>
                      {order.offeredBook ? (
                        <div className="order-book-cell">
                          <img 
                            src={getFileUrl(order.offeredBook.imageUrl) || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=60'} 
                            alt={order.offeredBook.title}
                            className="book-thumb-small" 
                          />
                          <div className="book-cell-info">
                            <strong className="book-cell-title">{order.offeredBook.title}</strong>
                            <span className="book-cell-author">{order.offeredBook.author}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-italic">Por libreta / Catálogo</span>
                      )}
                    </td>

                    {/* Método Logístico */}
                    <td>
                      <div className="order-logistics-cell">
                        <span className="method-tag">
                          {order.logisticsMethod === 'Presencial' ? '🏢 Local Físico' : 
                           order.logisticsMethod === 'Donacion' ? '🎁 Donación' :
                           order.logisticsMethod === 'IntercambioDoble' ? '🔄 Doble Intercambio' :
                           '🚚 Encomienda'}
                        </span>
                        {order.trackingNumber && (
                          <div className="tracking-sub-tag">
                            <i className="fa-solid fa-barcode"></i> {order.courierName}: <strong>{order.trackingNumber}</strong>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Fee y Pago */}
                    <td>
                      <div className="order-payment-cell">
                        <strong>{formatClp(order.feeAmount)}</strong>
                        <span className={`pay-status-pill ${order.paymentStatus.toLowerCase()}`}>
                          {order.paymentStatus === 'Captured' || order.paymentStatus === 'Hold' || order.paymentStatus === 'Completed' ? 'PAGADO ✓' : 'PENDIENTE'}
                        </span>
                      </div>
                    </td>

                    {/* Estado Logístico */}
                    <td>
                      {getStatusBadge(order.logisticsStatus, order.paymentStatus)}
                    </td>

                    {/* Acciones */}
                    <td>
                      <div className="order-actions-cell">
                        <button 
                          type="button" 
                          className="btn-action-icon btn-detail"
                          onClick={() => setSelectedOrderForDetail(order)}
                          title="Ver detalle de ubicación y pedido completo"
                        >
                          <i className="fa-solid fa-location-dot"></i>
                        </button>

                        <button 
                          type="button" 
                          className="btn-action-icon btn-process"
                          onClick={() => openProcessModal(order)}
                          title="Procesar pedido (Cambiar estado, tracking o dirección)"
                        >
                          <i className="fa-solid fa-gear"></i>
                        </button>

                        <button 
                          type="button" 
                          className="btn-action-icon btn-label"
                          onClick={() => setSelectedOrderForLabel(order)}
                          title="Imprimir etiqueta de envío para despacho"
                        >
                          <i className="fa-solid fa-print"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: DETALLE DE UBICACIÓN Y PEDIDO */}
      {selectedOrderForDetail && createPortal(
        <div className="guest-limit-modal-overlay" onClick={() => setSelectedOrderForDetail(null)}>
          <div className="guest-limit-modal-card admin-modal-card-order" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              onClick={() => setSelectedOrderForDetail(null)} 
              className="guest-limit-close-btn"
              title="Cerrar"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <div className="order-modal-header">
              <h2>
                <i className="fa-solid fa-map-location-dot" style={{ color: '#0F9D58', marginRight: '8px' }}></i>
                Detalle de Ubicación & Despacho
              </h2>
              <span className="order-header-buyorder">Orden #{selectedOrderForDetail.buyOrder}</span>
            </div>

            <div className="order-modal-body-grid">
              {/* Tarjeta de Destinatario y Ubicación Exacta */}
              <div className="order-info-card card-location-highlight">
                <h4><i className="fa-solid fa-location-dot"></i> Datos de Entrega y Ubicación</h4>
                <div className="location-detail-rows">
                  <div className="loc-row">
                    <span className="loc-label">Dirección de Entrega:</span>
                    <strong className="loc-value">{selectedOrderForDetail.shippingAddress}</strong>
                  </div>
                  <div className="loc-row">
                    <span className="loc-label">Comuna / Ciudad:</span>
                    <strong className="loc-value">{selectedOrderForDetail.shippingCity}</strong>
                  </div>
                  <div className="loc-row">
                    <span className="loc-label">Región / País:</span>
                    <strong className="loc-value">{selectedOrderForDetail.shippingRegion}, {selectedOrderForDetail.requester.pais}</strong>
                  </div>
                  <div className="loc-row">
                    <span className="loc-label">Método Solicitado:</span>
                    <span className="method-tag">{selectedOrderForDetail.logisticsMethod}</span>
                  </div>
                  {selectedOrderForDetail.trackingNumber && (
                    <div className="loc-row">
                      <span className="loc-label">Courier y Tracking:</span>
                      <strong className="loc-value text-green">{selectedOrderForDetail.courierName} • {selectedOrderForDetail.trackingNumber}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Tarjeta de Datos del Cliente */}
              <div className="order-info-card">
                <h4><i className="fa-solid fa-user"></i> Datos del Cliente (Solicitante)</h4>
                <div className="location-detail-rows">
                  <div className="loc-row">
                    <span className="loc-label">Nombre Completo:</span>
                    <strong className="loc-value">{selectedOrderForDetail.requester.name}</strong>
                  </div>
                  <div className="loc-row">
                    <span className="loc-label">RUT / Documento:</span>
                    <strong className="loc-value">{selectedOrderForDetail.requester.documentoIdentidad || 'No informado'}</strong>
                  </div>
                  <div className="loc-row">
                    <span className="loc-label">Teléfono Móvil:</span>
                    <strong className="loc-value">
                      <a href={`tel:${selectedOrderForDetail.requester.telefono}`} style={{ color: '#0F9D58' }}>
                        {selectedOrderForDetail.requester.telefono || 'No informado'}
                      </a>
                    </strong>
                  </div>
                  <div className="loc-row">
                    <span className="loc-label">Correo Electrónico:</span>
                    <strong className="loc-value">{selectedOrderForDetail.requester.email}</strong>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Libros del Intercambio */}
              <div className="order-info-card full-width-card">
                <h4><i className="fa-solid fa-book"></i> Libros del Trueque</h4>
                <div className="modal-books-duo">
                  <div className="book-duo-side">
                    <span className="duo-tag receive">Libro que se envía al cliente:</span>
                    <div className="duo-content">
                      <img src={getFileUrl(selectedOrderForDetail.requestedBook.imageUrl)} alt={selectedOrderForDetail.requestedBook.title} />
                      <div>
                        <strong>{selectedOrderForDetail.requestedBook.title}</strong>
                        <div>Autor: {selectedOrderForDetail.requestedBook.author}</div>
                        <div>Estado: {selectedOrderForDetail.requestedBook.condition}</div>
                      </div>
                    </div>
                  </div>

                  <div className="book-duo-side">
                    <span className="duo-tag give">Libro que entrega el cliente:</span>
                    {selectedOrderForDetail.offeredBook ? (
                      <div className="duo-content">
                        <img src={getFileUrl(selectedOrderForDetail.offeredBook.imageUrl)} alt={selectedOrderForDetail.offeredBook.title} />
                        <div>
                          <strong>{selectedOrderForDetail.offeredBook.title}</strong>
                          <div>Autor: {selectedOrderForDetail.offeredBook.author}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="duo-empty">Libro cargado previamente en libreta virtual</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notas y Estado Actual */}
              {selectedOrderForDetail.adminNotes && (
                <div className="order-info-card full-width-card">
                  <h4><i className="fa-solid fa-note-sticky"></i> Notas Administrativas</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563' }}>{selectedOrderForDetail.adminNotes}</p>
                </div>
              )}
            </div>

            <div className="order-modal-footer">
              <button 
                type="button" 
                onClick={() => {
                  const ord = selectedOrderForDetail;
                  setSelectedOrderForDetail(null);
                  setSelectedOrderForLabel(ord);
                }} 
                className="checkout-proceed-btn font-heading"
                style={{ background: '#0F9D58', color: '#fff' }}
              >
                <i className="fa-solid fa-print"></i> Generar Etiqueta de Despacho
              </button>
              <button 
                type="button" 
                onClick={() => setSelectedOrderForDetail(null)} 
                className="cancel-btn"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: PROCESAR INTERCAMBIO / ACTUALIZAR ESTADO */}
      {selectedOrderForProcess && createPortal(
        <div className="guest-limit-modal-overlay" onClick={() => setSelectedOrderForProcess(null)}>
          <div className="guest-limit-modal-card admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              onClick={() => setSelectedOrderForProcess(null)} 
              className="guest-limit-close-btn"
              title="Cerrar"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            <form onSubmit={handleProcessSubmit} className="admin-modal-form-body">
              <div className="modal-header">
                <h2>Procesar Intercambio #{selectedOrderForProcess.buyOrder}</h2>
                <p>Actualiza el estado logístico, asigna número de tracking o modifica los datos de entrega.</p>
              </div>

              <div className="modal-field admin-modal-field-gap">
                <label>Estado Logístico del Pedido</label>
                <select 
                  value={processStatus} 
                  onChange={(e) => setProcessStatus(e.target.value)}
                  className="admin-select-input"
                  required
                >
                  <option value="En Espera">En Espera de Confirmación / Recepción</option>
                  <option value="En Preparación">En Preparación (Empaque en Patronato 447)</option>
                  <option value="InTransit">Despachado / En Tránsito (Courier)</option>
                  <option value="Delivered">Entregado / Completado Conforme</option>
                  <option value="Cancelled">Cancelado</option>
                </select>
              </div>

              <div className="modal-grid-2cols">
                <div className="modal-field admin-modal-field-gap">
                  <label>Empresa de Encomienda (Courier)</label>
                  <select 
                    value={processCourier} 
                    onChange={(e) => setProcessCourier(e.target.value)}
                    className="admin-select-input"
                  >
                    <option value="Starken">Starken</option>
                    <option value="Chilexpress">Chilexpress</option>
                    <option value="CorreosChile">Correos de Chile</option>
                    <option value="Blue Express">Blue Express</option>
                    <option value="Retiro Local Patronato">Retiro en Local Patronato 447</option>
                    <option value="Otro">Otro Courier</option>
                  </select>
                </div>

                <div className="modal-field admin-modal-field-gap">
                  <label>N° Seguimiento / Tracking</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 9948215502"
                    value={processTracking} 
                    onChange={(e) => setProcessTracking(e.target.value)} 
                  />
                </div>
              </div>

              <div className="modal-field admin-modal-field-gap">
                <label>Dirección de Despacho (Calle, Número, Depto/Casa)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Av. Providencia 1234, Dpto 502"
                  value={processAddress} 
                  onChange={(e) => setProcessAddress(e.target.value)} 
                />
              </div>

              <div className="modal-grid-2cols">
                <div className="modal-field admin-modal-field-gap">
                  <label>Comuna / Ciudad</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Providencia / Santiago"
                    value={processCity} 
                    onChange={(e) => setProcessCity(e.target.value)} 
                  />
                </div>

                <div className="modal-field admin-modal-field-gap">
                  <label>Región</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Región Metropolitana"
                    value={processRegion} 
                    onChange={(e) => setProcessRegion(e.target.value)} 
                  />
                </div>
              </div>

              <div className="modal-field admin-modal-field-gap">
                <label>Notas Administrativas / Seguimiento Interno</label>
                <textarea 
                  rows={2}
                  placeholder="Ej: Paquete despachado el 24/10 en sucursal Recoleta."
                  value={processNotes} 
                  onChange={(e) => setProcessNotes(e.target.value)}
                  className="admin-modal-textarea"
                />
              </div>

              <div className="admin-modal-actions">
                <button 
                  type="button" 
                  onClick={() => setSelectedOrderForProcess(null)} 
                  className="cancel-btn"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="modal-submit-btn admin-modal-submit-btn"
                  disabled={processOrderMutation.isPending}
                >
                  {processOrderMutation.isPending ? 'Guardando...' : 'Guardar y Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: ETIQUETA IMPRIMIBLE */}
      <AdminShippingLabelModal 
        order={selectedOrderForLabel} 
        onClose={() => setSelectedOrderForLabel(null)} 
      />
    </div>
  );
};
