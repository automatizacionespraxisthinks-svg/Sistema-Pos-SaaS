'use client';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { auditApi } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import {
  ShieldCheck, Search, Filter, ChevronLeft, ChevronRight,
  User, Clock, Package, FileText, AlertCircle, RefreshCw,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  LOGIN:               'Inicio de sesión',
  REGISTER_TENANT:     'Registro de negocio',
  CREATE_USER:         'Crear usuario',
  UPDATE_USER:         'Editar usuario',
  DEACTIVATE_USER:     'Desactivar usuario',
  UPDATE_TENANT:       'Editar negocio',
  CREATE_ORDER:        'Crear pedido',
  UPDATE_ORDER_STATUS: 'Cambiar estado pedido',
  UPDATE_ORDER_ITEMS:  'Editar items pedido',
  CANCEL_ORDER:        'Cancelar pedido',
  CREATE_PRODUCT:      'Crear producto',
  UPDATE_PRODUCT:      'Editar producto',
  DELETE_PRODUCT:      'Eliminar producto',
  CREATE_CATEGORY:     'Crear categoría',
  UPDATE_CATEGORY:     'Editar categoría',
  DELETE_CATEGORY:     'Eliminar categoría',
  PROCESS_PAYMENT:     'Procesar pago',
  OPEN_SHIFT:          'Abrir turno',
  CLOSE_SHIFT:         'Cerrar turno',
  ADJUST_INVENTORY:    'Ajustar inventario',
};

const MODULE_LABELS: Record<string, string> = {
  auth:      'Autenticación',
  users:     'Usuarios',
  tenant:    'Negocio',
  orders:    'Pedidos',
  products:  'Productos',
  payments:  'Pagos',
  caja:      'Caja',
  inventory: 'Inventario',
};

const ACTION_COLORS: Record<string, string> = {
  LOGIN:               'bg-blue-100 text-blue-800',
  REGISTER_TENANT:     'bg-purple-100 text-purple-800',
  CREATE_USER:         'bg-green-100 text-green-800',
  UPDATE_USER:         'bg-yellow-100 text-yellow-800',
  DEACTIVATE_USER:     'bg-red-100 text-red-800',
  UPDATE_TENANT:       'bg-indigo-100 text-indigo-800',
  CREATE_ORDER:        'bg-green-100 text-green-800',
  UPDATE_ORDER_STATUS: 'bg-blue-100 text-blue-800',
  UPDATE_ORDER_ITEMS:  'bg-yellow-100 text-yellow-800',
  CANCEL_ORDER:        'bg-red-100 text-red-800',
  CREATE_PRODUCT:      'bg-green-100 text-green-800',
  UPDATE_PRODUCT:      'bg-yellow-100 text-yellow-800',
  DELETE_PRODUCT:      'bg-red-100 text-red-800',
  PROCESS_PAYMENT:     'bg-emerald-100 text-emerald-800',
  OPEN_SHIFT:          'bg-sky-100 text-sky-800',
  CLOSE_SHIFT:         'bg-slate-100 text-slate-800',
  ADJUST_INVENTORY:    'bg-orange-100 text-orange-800',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function JsonView({ data }: { data: any }) {
  if (!data) return <span className="text-slate-400 text-xs italic">—</span>;
  return (
    <pre className="text-xs bg-slate-50 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  module: string;
  action: string;
  entityId: string;
  entityType: string;
  previousValue: any;
  newValue: any;
  description: string;
  createdAt: string;
}

interface AuditFilters {
  search: string;
  userId: string;
  module: string;
  action: string;
  userRole: string;
  from: string;
  to: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditPage() {
  useRoleGuard('/audit');

  const [page, setPage] = useState(1);
  const LIMIT = 25;

  const [filters, setFilters] = useState<AuditFilters>({
    search: '', userId: '', module: '', action: '', userRole: '', from: '', to: '',
  });
  const [applied, setApplied] = useState<AuditFilters>({ ...filters });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter options
  const { data: filterOpts } = useQuery({
    queryKey: ['audit-filters'],
    queryFn: () => auditApi.getFilters().then(r => r.data),
    staleTime: 60_000,
  });

  // Audit logs
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', applied, page],
    queryFn: () => auditApi.list({
      search:   applied.search   || undefined,
      userId:   applied.userId   || undefined,
      module:   applied.module   || undefined,
      action:   applied.action   || undefined,
      userRole: applied.userRole || undefined,
      from:     applied.from     || undefined,
      to:       applied.to       || undefined,
      page,
      limit: LIMIT,
    }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  });

  const logs: AuditLog[]  = data?.data  ?? [];
  const total: number     = data?.total ?? 0;
  const totalPages        = Math.ceil(total / LIMIT);

  const applyFilters = useCallback(() => {
    setApplied({ ...filters });
    setPage(1);
  }, [filters]);

  const clearFilters = () => {
    const empty = { search: '', userId: '', module: '', action: '', userRole: '', from: '', to: '' };
    setFilters(empty);
    setApplied(empty);
    setPage(1);
  };

  const hasActiveFilters = Object.values(applied).some(v => v !== '');

  return (
    <AppLayout>
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Auditoría</h1>
            <p className="text-slate-500 text-sm">Registro completo de todas las acciones del sistema</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter size={14} />
            Filtros
            {hasActiveFilters && (
              <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5">!</span>
            )}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por acción, usuario, descripción..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && applyFilters()}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Módulo */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Módulo</label>
              <select
                value={filters.module}
                onChange={e => setFilters(f => ({ ...f, module: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos</option>
                {(filterOpts?.modules ?? []).map((m: string) => (
                  <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>
                ))}
              </select>
            </div>

            {/* Acción */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Acción</label>
              <select
                value={filters.action}
                onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todas</option>
                {(filterOpts?.actions ?? []).map((a: string) => (
                  <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
                ))}
              </select>
            </div>

            {/* Rol */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
              <select
                value={filters.userRole}
                onChange={e => setFilters(f => ({ ...f, userRole: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos</option>
                {(filterOpts?.roles ?? []).map((r: string) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Desde */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Desde</label>
              <input
                type="date"
                value={filters.from}
                onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Hasta */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Hasta</label>
              <input
                type="date"
                value={filters.to}
                onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col justify-end gap-1.5">
              <button
                onClick={applyFilters}
                className="w-full bg-indigo-600 text-white text-sm py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Aplicar
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="w-full text-slate-600 text-sm py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {isLoading ? 'Cargando...' : `${total.toLocaleString()} registros encontrados`}
        </span>
        {totalPages > 1 && (
          <span>Página {page} de {totalPages}</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <div className="text-center">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <p className="text-sm">Cargando registros...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <ShieldCheck size={32} className="mb-2 opacity-40" />
            <p className="text-sm font-medium">No hay registros</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-indigo-600 mt-1 hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map(log => {
              const isOpen = expanded === log.id;
              const actionColor = ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-700';
              return (
                <div key={log.id} className="hover:bg-slate-50 transition-colors">
                  {/* Row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                    className="w-full text-left px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-none mt-0.5">
                        {log.module === 'auth' || log.module === 'users' ? (
                          <User size={14} className="text-slate-600" />
                        ) : log.module === 'payments' || log.module === 'caja' ? (
                          <Package size={14} className="text-slate-600" />
                        ) : (
                          <FileText size={14} className="text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Action badge */}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${actionColor}`}>
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                          {/* Module badge */}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {MODULE_LABELS[log.module] ?? log.module}
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-slate-800 mt-1 leading-tight line-clamp-1">
                          {log.description || `${log.action} en ${log.entityType}`}
                        </p>

                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          {log.userName && (
                            <span className="flex items-center gap-1">
                              <User size={11} /> {log.userName}
                              {log.userRole && <span className="opacity-70">({log.userRole})</span>}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {fmtDate(log.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Expand indicator */}
                      <div className="text-slate-400 flex-none">
                        {isOpen ? '▲' : '▼'}
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        {/* Left col */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Detalles</p>
                            <div className="bg-white rounded-lg border border-slate-200 p-3 text-xs space-y-1.5">
                              <div className="flex gap-2">
                                <span className="text-slate-400 w-20 flex-none">ID log:</span>
                                <span className="text-slate-700 font-mono truncate">{log.id}</span>
                              </div>
                              {log.entityId && (
                                <div className="flex gap-2">
                                  <span className="text-slate-400 w-20 flex-none">Entidad ID:</span>
                                  <span className="text-slate-700 font-mono truncate">{log.entityId}</span>
                                </div>
                              )}
                              {log.entityType && (
                                <div className="flex gap-2">
                                  <span className="text-slate-400 w-20 flex-none">Tipo:</span>
                                  <span className="text-slate-700">{log.entityType}</span>
                                </div>
                              )}
                              {log.userId && (
                                <div className="flex gap-2">
                                  <span className="text-slate-400 w-20 flex-none">Usuario ID:</span>
                                  <span className="text-slate-700 font-mono truncate">{log.userId}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right col — before/after */}
                        <div className="space-y-3">
                          {log.previousValue !== null && log.previousValue !== undefined && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                Valor anterior
                              </p>
                              <div className="border border-red-100 rounded-lg overflow-hidden">
                                <div className="bg-red-50 px-2 py-0.5">
                                  <span className="text-xs text-red-600 font-medium">Antes</span>
                                </div>
                                <div className="p-2">
                                  <JsonView data={log.previousValue} />
                                </div>
                              </div>
                            </div>
                          )}

                          {log.newValue !== null && log.newValue !== undefined && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                Valor nuevo
                              </p>
                              <div className="border border-green-100 rounded-lg overflow-hidden">
                                <div className="bg-green-50 px-2 py-0.5">
                                  <span className="text-xs text-green-600 font-medium">Después</span>
                                </div>
                                <div className="p-2">
                                  <JsonView data={log.newValue} />
                                </div>
                              </div>
                            </div>
                          )}

                          {log.previousValue === null && log.newValue === null && (
                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                              <AlertCircle size={14} />
                              Sin datos de cambio registrados
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} /> Anterior
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;

              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-sm rounded-lg ${
                    p === page
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 disabled:cursor-not-allowed"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Legal notice */}
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
        <AlertCircle size={13} className="text-amber-500 flex-none" />
        Los registros de auditoría son de solo lectura. No se pueden modificar ni eliminar.
      </div>
    </div>
    </AppLayout>
  );
}
