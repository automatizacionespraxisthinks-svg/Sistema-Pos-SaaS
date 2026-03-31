'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { ordersApi, fmt } from '@/lib/api';
import { UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700', confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700', ready: 'bg-green-100 text-green-700',
  delivered: 'bg-teal-100 text-teal-700', paid: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmado', preparing: 'Preparando',
  ready: 'Listo', delivered: 'Entregado', paid: 'Pagado', cancelled: 'Cancelado',
};
const NEXT: Record<string, { status: string; label: string; cls: string }[]> = {
  pending:   [{ status: 'confirmed', label: 'Confirmar', cls: 'bg-blue-500 text-white' }, { status: 'cancelled', label: 'Cancelar', cls: 'bg-red-100 text-red-700' }],
  confirmed: [{ status: 'preparing', label: 'En cocina', cls: 'bg-purple-500 text-white' }],
  preparing: [{ status: 'ready',     label: 'Marcar listo', cls: 'bg-green-500 text-white' }],
  ready:     [{ status: 'delivered', label: 'Entregar', cls: 'bg-teal-500 text-white' }],
  delivered: [{ status: 'paid',      label: 'Cobrado', cls: 'bg-primary-600 text-white' }],
};

export default function OrdersPage() {
  useRoleGuard('/orders');
  const [filter, setFilter] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', filter],
    queryFn: () => ordersApi.list(filter ? { status: filter } : {}).then(r => r.data),
    refetchInterval: 10000,
  });
  const orders = (data as any)?.data ?? [];

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ordersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Estado actualizado'); qc.invalidateQueries({ queryKey: ['orders'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const statuses = ['', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'paid', 'cancelled'];

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-5">Pedidos</h1>
        <div className="flex gap-2 mb-5 flex-wrap">
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-600'}`}>
              {s ? STATUS_LABEL[s] : 'Todos'}
            </button>
          ))}
        </div>
        {isLoading && <p className="text-center py-20 text-slate-400">Cargando...</p>}
        {!isLoading && orders.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg">No hay pedidos</p>
            <p className="text-sm mt-1">Los pedidos creados desde el POS aparecerán aquí</p>
          </div>
        )}
        <div className="space-y-3">
          {orders.map((order: any) => (
            <div key={order.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{order.orderNumber}</p>
                    <span className={`badge ${STATUS_BADGE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                    {order.tableNumber && <span className="badge bg-slate-100 text-slate-600">🪑 Mesa {order.tableNumber}</span>}
                    {order.waiterName  && (
                      <span className="badge bg-emerald-50 text-emerald-700">
                        <UserCheck size={10} className="inline mr-1" />{order.waiterName}
                      </span>
                    )}
                    <span className="badge bg-slate-50 text-slate-500 capitalize">{order.type}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{new Date(order.createdAt).toLocaleString('es-CO')}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {order.items?.slice(0, 5).map((item: any, i: number) => (
                      <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{item.quantity}x {item.productName}</span>
                    ))}
                    {order.items?.length > 5 && <span className="text-xs text-slate-400">+{order.items.length - 5} más</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600 text-lg">{fmt(Number(order.total))}</p>
                  <p className="text-xs text-slate-500">{order.items?.length} items</p>
                </div>
              </div>
              {NEXT[order.status] && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  {NEXT[order.status].map(a => (
                    <button key={a.status}
                      onClick={() => updateStatus.mutate({ id: order.id, status: a.status })}
                      disabled={updateStatus.isPending}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${a.cls}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}