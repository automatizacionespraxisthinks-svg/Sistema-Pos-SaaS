'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { ordersApi, fmt } from '@/lib/api';
import { UtensilsCrossed, Users, Clock, CreditCard, Plus } from 'lucide-react';

// Número de mesas — ajustable según el restaurante
const TABLE_COUNT = 12;
const TABLES = Array.from({ length: TABLE_COUNT }, (_, i) => String(i + 1));

type TableStatus = 'libre' | 'ocupada' | 'esperando_cuenta';

interface TableInfo {
  status:       TableStatus;
  order?:       any;
  waiterName?:  string;
  since?:       string;
  total?:       number;
  itemCount?:   number;
}

const STATUS_CONFIG: Record<TableStatus, { label: string; bg: string; border: string; text: string; dot: string }> = {
  libre:            { label: 'Libre',             bg: 'bg-emerald-50',  border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  ocupada:          { label: 'Ocupada',            bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-700',    dot: 'bg-blue-500'    },
  esperando_cuenta: { label: 'Esperando cuenta',  bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
};

export default function MesasPage() {
  useRoleGuard('/mesas');
  const router = useRouter();
  const [selected, setSelected] = useState<{ number: string; info: TableInfo } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mesas-orders'],
    queryFn: () => ordersApi.list({ limit: 200 }).then(r => r.data),
    refetchInterval: 8_000,
  });
  const orders: any[] = (data as any)?.data ?? [];

  // Build table → status map from active orders
  const tableMap: Record<string, TableInfo> = {};
  for (const t of TABLES) tableMap[t] = { status: 'libre' };

  for (const order of orders) {
    if (!order.tableNumber) continue;
    if (order.status === 'cancelled' || order.paymentStatus === 'paid') continue;
    const t = String(order.tableNumber);
    if (!TABLES.includes(t)) continue;

    const isWaiting = ['ready', 'delivered'].includes(order.status);
    tableMap[t] = {
      status:      isWaiting ? 'esperando_cuenta' : 'ocupada',
      order,
      waiterName:  order.waiterName,
      since:       order.createdAt,
      total:       Number(order.total),
      itemCount:   order.items?.length ?? 0,
    };
  }

  function handleTableClick(tableNumber: string, info: TableInfo) {
    if (info.status === 'libre') {
      router.push(`/pos?table=${tableNumber}`);
    } else {
      setSelected({ number: tableNumber, info });
    }
  }

  const freeCount  = TABLES.filter(t => tableMap[t].status === 'libre').length;
  const busyCount  = TABLES.filter(t => tableMap[t].status !== 'libre').length;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mapa de Mesas</h1>
            <p className="text-slate-500 text-sm">Actualización automática cada 8s</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {freeCount} libres
            </span>
            <span className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm font-semibold text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {busyCount} ocupadas
            </span>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 text-xs font-medium">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <span key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-slate-50 border-slate-200 text-slate-500">
            <Plus size={10} />
            Libre → abre POS
          </span>
        </div>

        {/* Grid de mesas */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400">Cargando mesas...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {TABLES.map(t => {
              const info = tableMap[t];
              const cfg  = STATUS_CONFIG[info.status];
              return (
                <button
                  key={t}
                  onClick={() => handleTableClick(t, info)}
                  className={`
                    relative rounded-2xl border-2 p-4 flex flex-col items-center gap-2
                    transition-all hover:shadow-md hover:scale-105 cursor-pointer
                    ${cfg.bg} ${cfg.border}
                  `}
                >
                  {/* Status dot */}
                  <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${cfg.dot}`} />

                  {/* Table number */}
                  <div className={`text-3xl font-black ${cfg.text}`}>{t}</div>
                  <div className="text-xs text-slate-500 font-medium">Mesa</div>

                  {/* Info */}
                  {info.status !== 'libre' && (
                    <div className="w-full space-y-1 mt-1">
                      {info.waiterName && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Users size={10} />
                          <span className="truncate">{info.waiterName}</span>
                        </div>
                      )}
                      {info.since && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={10} />
                          {new Date(info.since).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {info.total !== undefined && (
                        <div className={`text-xs font-bold ${cfg.text}`}>
                          {fmt(info.total)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Label */}
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Drawer de mesa ocupada ─────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black
                  ${selected.info.status === 'esperando_cuenta' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {selected.number}
                </div>
                <div>
                  <p className="font-bold text-slate-900">Mesa {selected.number}</p>
                  <p className={`text-xs font-semibold ${STATUS_CONFIG[selected.info.status].text}`}>
                    {STATUS_CONFIG[selected.info.status].label}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1">
                ✕
              </button>
            </div>

            {/* Order details */}
            <div className="p-5 space-y-4">
              {selected.info.order && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge bg-slate-100 text-slate-600 text-xs">
                      {selected.info.order.orderNumber}
                    </span>
                    {selected.info.waiterName && (
                      <span className="badge bg-emerald-50 text-emerald-700 text-xs">
                        👤 {selected.info.waiterName}
                      </span>
                    )}
                    {selected.info.since && (
                      <span className="badge bg-slate-100 text-slate-500 text-xs">
                        🕐 {new Date(selected.info.since).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Items */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pedido</p>
                    <div className="space-y-1.5">
                      {(selected.info.order.items ?? []).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            <span className="font-semibold">{item.quantity}×</span> {item.productName}
                            {item.notes && <span className="ml-1 text-xs text-amber-600">({item.notes})</span>}
                          </span>
                          <span className="font-medium text-slate-800 flex-none ml-2">{fmt(Number(item.subtotal))}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between font-bold text-base border-t border-slate-100 pt-3">
                    <span>Total</span>
                    <span className="text-primary-600">{fmt(selected.info.total ?? 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => setSelected(null)}
                className="flex-1 btn-outline py-3">
                Cerrar
              </button>
              <button
                onClick={() => {
                  setSelected(null);
                  router.push('/caja');
                }}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                <CreditCard size={16} />
                Ir a caja
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
