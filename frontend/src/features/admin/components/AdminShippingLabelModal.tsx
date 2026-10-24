import React from 'react';
import { createPortal } from 'react-dom';
import type { AdminOrder } from '../types';

interface AdminShippingLabelModalProps {
  order: AdminOrder | null;
  onClose: () => void;
}

export const AdminShippingLabelModal: React.FC<AdminShippingLabelModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return createPortal(
    <div className="guest-limit-modal-overlay no-print-overlay" onClick={onClose}>
      <div 
        className="guest-limit-modal-card admin-shipping-modal-card" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button" 
          onClick={onClose} 
          className="guest-limit-close-btn no-print"
          title="Cerrar"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Barra superior de acciones */}
        <div className="shipping-modal-actions-top no-print">
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1f2937' }}>
              <i className="fa-solid fa-tag" style={{ color: '#0F9D58', marginRight: '8px' }}></i>
              Etiqueta de Despacho Oficial
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
              Lista para imprimir en tamaño estándar (A6 / 10x15 cm) o formato carta.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              onClick={handlePrint}
              className="checkout-proceed-btn font-heading"
              style={{ background: '#0F9D58', color: '#fff', padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fa-solid fa-print"></i> Imprimir Etiqueta
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="cancel-btn"
              style={{ padding: '8px 14px', fontSize: '0.9rem' }}
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* ETIQUETA IMPRIMIBLE (Identificada con clase printable-shipping-label) */}
        <div className="printable-shipping-label">
          {/* Header de Etiqueta */}
          <div className="label-header">
            <div className="label-brand">
              <span className="label-brand-title">INTERCAMBIA<strong>LIBROS</strong>.CL</span>
              <span className="label-brand-sub">Comunidad de Reutilización y Lectura Circular</span>
            </div>
            <div className="label-order-box">
              <span className="label-order-label">ORDEN DE INTERCAMBIO</span>
              <span className="label-order-id">#{order.buyOrder}</span>
              <span className="label-order-date">{formattedDate}</span>
            </div>
          </div>

          <div className="label-divider-heavy"></div>

          {/* Bloque Remitente y Courier */}
          <div className="label-grid-row">
            <div className="label-block remitente-block">
              <span className="label-section-tag">REMITENTE (ORIGEN)</span>
              <strong className="label-strong-name">Intercambialibros SpA</strong>
              <div className="label-detail-line">RUT: 77.412.890-5</div>
              <div className="label-detail-line">Patronato 447, Local 12</div>
              <div className="label-detail-line">Recoleta, Santiago - Región Metropolitana</div>
              <div className="label-detail-line">Tel: +56 9 8452 3190 | contacto@intercambialibros.cl</div>
            </div>

            <div className="label-block courier-block">
              <span className="label-section-tag">SERVICIO DE TRANSPORTE</span>
              <div className="label-courier-title">{order.courierName || 'Starken / Chilexpress'}</div>
              <div className="label-tracking-box">
                <span className="label-tracking-title">N° SEGUIMIENTO:</span>
                <span className="label-tracking-code">{order.trackingNumber || 'POR ASIGNAR EN SUCURSAL'}</span>
              </div>
              <div className="label-method-badge">
                MÉTODO: <strong>{order.logisticsMethod.toUpperCase()}</strong>
              </div>
            </div>
          </div>

          <div className="label-divider"></div>

          {/* Bloque Destinatario (Principal) */}
          <div className="label-block destinatario-block">
            <div className="label-dest-header">
              <span className="label-section-tag label-tag-dest">DESTINATARIO (ENTREGA)</span>
              {order.requester.isPremium && <span className="label-premium-pill">★ CLIENTE PREMIUM</span>}
            </div>
            <div className="label-dest-name">{order.requester.name}</div>
            <div className="label-dest-meta-grid">
              <div>
                <strong>RUT / Documento:</strong> {order.requester.documentoIdentidad || 'No registrado'}
              </div>
              <div>
                <strong>Teléfono:</strong> {order.requester.telefono || 'No registrado'}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>Correo:</strong> {order.requester.email}
              </div>
            </div>
            <div className="label-dest-address-box">
              <span className="label-address-title">DIRECCIÓN DE DESTINO:</span>
              <div className="label-address-text">{order.shippingAddress}</div>
              <div className="label-address-city">
                <strong>Comuna/Ciudad:</strong> {order.shippingCity} | <strong>Región:</strong> {order.shippingRegion}
              </div>
            </div>
          </div>

          <div className="label-divider"></div>

          {/* Bloque de Contenido y Barcode Simulado */}
          <div className="label-grid-row label-footer-grid">
            <div className="label-block">
              <span className="label-section-tag">DETALLE DEL CONTENIDO</span>
              <div className="label-book-summary">
                <strong>1x {order.requestedBook.title}</strong>
                <div>Autor: {order.requestedBook.author}</div>
                <div style={{ fontSize: '0.8rem', color: '#4b5563' }}>Condición física: {order.requestedBook.condition}</div>
                {order.offeredBook && (
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '3px' }}>
                    A cambio de: {order.offeredBook.title}
                  </div>
                )}
              </div>
            </div>

            <div className="label-block label-barcode-wrapper">
              <div className="barcode-visual">
                {/* Barras de código de barras generadas con CSS */}
                <div className="barcode-stripes">
                  <span style={{ width: '3px' }}></span>
                  <span style={{ width: '1px' }}></span>
                  <span style={{ width: '4px' }}></span>
                  <span style={{ width: '2px' }}></span>
                  <span style={{ width: '1px' }}></span>
                  <span style={{ width: '3px' }}></span>
                  <span style={{ width: '5px' }}></span>
                  <span style={{ width: '2px' }}></span>
                  <span style={{ width: '4px' }}></span>
                  <span style={{ width: '1px' }}></span>
                  <span style={{ width: '3px' }}></span>
                  <span style={{ width: '2px' }}></span>
                  <span style={{ width: '4px' }}></span>
                  <span style={{ width: '2px' }}></span>
                  <span style={{ width: '1px' }}></span>
                  <span style={{ width: '3px' }}></span>
                  <span style={{ width: '5px' }}></span>
                  <span style={{ width: '2px' }}></span>
                  <span style={{ width: '3px' }}></span>
                </div>
                <span className="barcode-number">*{order.buyOrder || order.id.slice(0, 12)}*</span>
              </div>
            </div>
          </div>

          <div className="label-bottom-footer">
            <span>Intercambialibros.cl • Manejo con cuidado • Libro de lectura circular</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
