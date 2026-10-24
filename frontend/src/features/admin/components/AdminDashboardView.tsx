import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';
import type { AdminDashboardStats } from '../types';

interface AdminDashboardViewProps {
  onGoToOrders?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onGoToOrders }) => {
  const [datePreset, setDatePreset] = useState<'today' | '7days' | 'month' | '30days' | 'all' | 'custom'>('month');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [customStart, setCustomStart] = useState<string>(firstDayOfMonth);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  // Determinar startDate y endDate a enviar a la API
  let activeStart = firstDayOfMonth;
  let activeEnd = todayStr;

  if (datePreset === 'today') {
    activeStart = todayStr;
    activeEnd = todayStr;
  } else if (datePreset === '7days') {
    activeStart = sevenDaysAgo;
    activeEnd = todayStr;
  } else if (datePreset === 'month') {
    activeStart = firstDayOfMonth;
    activeEnd = todayStr;
  } else if (datePreset === '30days') {
    activeStart = thirtyDaysAgo;
    activeEnd = todayStr;
  } else if (datePreset === 'all') {
    activeStart = '2026-01-01';
    activeEnd = todayStr;
  } else if (datePreset === 'custom') {
    activeStart = customStart;
    activeEnd = customEnd;
  }

  const { data: stats, isLoading, error, refetch } = useQuery<AdminDashboardStats>({
    queryKey: ['adminDashboardStats', activeStart, activeEnd],
    queryFn: () => apiClient.get<AdminDashboardStats>(`/admindashboard/stats?startDate=${activeStart}&endDate=${activeEnd}`)
  });

  const formatClp = (val?: number) => {
    const num = Math.round(val ?? 0);
    return `$${num.toLocaleString('es-CL')} CLP`;
  };

  return (
    <div className="admin-dashboard-container">
      {/* Barra de Filtro de Fechas */}
      <div className="admin-date-filter-bar">
        <div className="date-filter-title">
          <i className="fa-solid fa-calendar-days" style={{ color: '#0F9D58' }}></i>
          <span>Filtrar Métricas & Ventas:</span>
        </div>

        <div className="date-presets-row">
          <button 
            type="button" 
            className={`preset-btn ${datePreset === 'today' ? 'active' : ''}`}
            onClick={() => setDatePreset('today')}
          >
            Hoy
          </button>
          <button 
            type="button" 
            className={`preset-btn ${datePreset === '7days' ? 'active' : ''}`}
            onClick={() => setDatePreset('7days')}
          >
            Últimos 7 días
          </button>
          <button 
            type="button" 
            className={`preset-btn ${datePreset === 'month' ? 'active' : ''}`}
            onClick={() => setDatePreset('month')}
          >
            Este Mes
          </button>
          <button 
            type="button" 
            className={`preset-btn ${datePreset === '30days' ? 'active' : ''}`}
            onClick={() => setDatePreset('30days')}
          >
            Últimos 30 días
          </button>
          <button 
            type="button" 
            className={`preset-btn ${datePreset === 'all' ? 'active' : ''}`}
            onClick={() => setDatePreset('all')}
          >
            Histórico (Todo)
          </button>
          <button 
            type="button" 
            className={`preset-btn ${datePreset === 'custom' ? 'active' : ''}`}
            onClick={() => setDatePreset('custom')}
          >
            Personalizado
          </button>
        </div>

        {datePreset === 'custom' && (
          <div className="custom-date-inputs">
            <div className="date-input-group">
              <label>Desde:</label>
              <input 
                type="date" 
                value={customStart} 
                onChange={(e) => setCustomStart(e.target.value)} 
              />
            </div>
            <div className="date-input-group">
              <label>Hasta:</label>
              <input 
                type="date" 
                value={customEnd} 
                onChange={(e) => setCustomEnd(e.target.value)} 
              />
            </div>
            <button 
              type="button" 
              className="btn-apply-date font-heading"
              onClick={() => refetch()}
            >
              Aplicar Rango
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="loading-spinner" style={{ padding: '3rem' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
          Calculando métricas y ventas del periodo...
        </div>
      ) : error ? (
        <div className="error-box">Error al cargar datos del panel: {(error as Error).message}</div>
      ) : stats ? (
        <>
          {/* SECCIÓN 1: KPIS DE USUARIOS */}
          <div className="admin-kpi-section-title">
            <i className="fa-solid fa-users-viewfinder"></i>
            <h3>Comunidad y Usuarios Registrados</h3>
          </div>

          <div className="admin-kpi-grid">
            <div className="admin-kpi-card kpi-card-users">
              <div className="kpi-icon-wrap">
                <i className="fa-solid fa-users"></i>
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Usuarios Total</span>
                <strong className="kpi-value">{stats.totalUsers.toLocaleString('es-CL')}</strong>
                <span className="kpi-sub">
                  +{stats.newUsersInPeriod} nuevos en este periodo
                </span>
              </div>
            </div>

            <div className="admin-kpi-card kpi-card-free">
              <div className="kpi-icon-wrap">
                <i className="fa-solid fa-user"></i>
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Usuarios Free</span>
                <strong className="kpi-value">{stats.freeUsers.toLocaleString('es-CL')}</strong>
                <span className="kpi-sub">
                  {stats.totalUsers > 0 ? `${Math.round((stats.freeUsers / stats.totalUsers) * 100)}% de la comunidad` : '0%'}
                </span>
              </div>
            </div>

            <div className="admin-kpi-card kpi-card-premium">
              <div className="kpi-icon-wrap">
                <i className="fa-solid fa-crown"></i>
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Usuarios Premium</span>
                <strong className="kpi-value text-gold">{stats.premiumUsers.toLocaleString('es-CL')}</strong>
                <span className="kpi-sub">
                  {stats.totalUsers > 0 ? `${Math.round((stats.premiumUsers / stats.totalUsers) * 100)}% de conversión` : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: KPIS DE VENTAS POR CANAL */}
          <div className="admin-kpi-section-title" style={{ marginTop: '2rem' }}>
            <i className="fa-solid fa-sack-dollar"></i>
            <h3>Ingresos y Ventas por Canal ({stats.startDate} al {stats.endDate})</h3>
          </div>

          <div className="admin-kpi-grid admin-sales-grid">
            <div className="admin-kpi-card kpi-card-sale">
              <div className="kpi-icon-wrap kpi-icon-green">
                <i className="fa-solid fa-handshake"></i>
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Venta Fee Intercambios</span>
                <strong className="kpi-value">{formatClp(stats.exchangeFeeSales)}</strong>
                <span className="kpi-sub">
                  Tarifas por matches confirmados
                </span>
              </div>
            </div>

            <div className="admin-kpi-card kpi-card-sale">
              <div className="kpi-icon-wrap kpi-icon-blue">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Venta Pack Swipe</span>
                <strong className="kpi-value">{formatClp(stats.swipePackSales)}</strong>
                <span className="kpi-sub">
                  Paquetes de exploración extra
                </span>
              </div>
            </div>

            <div className="admin-kpi-card kpi-card-sale">
              <div className="kpi-icon-wrap kpi-icon-gold">
                <i className="fa-solid fa-gem"></i>
              </div>
              <div className="kpi-info">
                <span className="kpi-label">Venta Upgrade Premium</span>
                <strong className="kpi-value">{formatClp(stats.premiumUpgradeSales)}</strong>
                <span className="kpi-sub">
                  Membresías mensuales contratadas
                </span>
              </div>
            </div>

            {/* VENTA TOTAL DESTACADA */}
            <div className="admin-kpi-card kpi-card-total-sales">
              <div className="kpi-icon-wrap kpi-icon-neon">
                <i className="fa-solid fa-cash-register"></i>
              </div>
              <div className="kpi-info">
                <span className="kpi-label">VENTA TOTAL PERIODO</span>
                <strong className="kpi-value text-neon-bright">{formatClp(stats.totalSales)}</strong>
                <span className="kpi-sub text-white-opacity">
                  Fees + Swipes + Membresías
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: RESUMEN DE ACTIVIDAD DE INTERCAMBIOS */}
          <div className="admin-summary-box-flex">
            <div className="summary-stat-pill">
              <i className="fa-solid fa-boxes-packing"></i>
              <span>Total Pedidos Periodo: <strong>{stats.totalOrdersCount}</strong></span>
            </div>
            <div className="summary-stat-pill pill-completed">
              <i className="fa-solid fa-circle-check"></i>
              <span>Entregados: <strong>{stats.completedOrdersCount}</strong></span>
            </div>
            <div className="summary-stat-pill pill-pending">
              <i className="fa-solid fa-clock"></i>
              <span>En Proceso: <strong>{stats.pendingOrdersCount}</strong></span>
            </div>
            {onGoToOrders && (
              <button 
                type="button" 
                onClick={onGoToOrders} 
                className="btn-link-action-orders font-heading"
              >
                Ver Bandeja de Pedidos →
              </button>
            )}
          </div>

          {/* SECCIÓN 4: DESGLOSE DIARIO DE VENTAS */}
          {stats.salesByDay && stats.salesByDay.length > 0 && (
            <div className="admin-daily-breakdown-card">
              <h4>
                <i className="fa-solid fa-chart-line" style={{ color: '#0F9D58', marginRight: '6px' }}></i>
                Desglose Diario de Ventas ({stats.salesByDay.length} días)
              </h4>
              <div className="daily-sales-table-wrapper">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Pedidos</th>
                      <th>Fee Intercambios</th>
                      <th>Upgrade Premium</th>
                      <th>Pack Swipe</th>
                      <th>Total Ventas Día</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.salesByDay.map((day) => (
                      <tr key={day.date} className={day.totalSales > 0 ? 'row-with-sales' : ''}>
                        <td><strong>{day.date}</strong></td>
                        <td>{day.orderCount}</td>
                        <td>{formatClp(day.feeSales)}</td>
                        <td>{formatClp(day.subscriptionSales)}</td>
                        <td>{formatClp(day.packSales)}</td>
                        <td><strong className={day.totalSales > 0 ? 'text-success-bold' : ''}>{formatClp(day.totalSales)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
