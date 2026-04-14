'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { ordersApi, productsApi, fmt } from '@/lib/api';
import { UserCheck, Pencil, Plus, Minus, Trash2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  ready:     'bg-green-100 text-green-700',
  delivered: 'bg-teal-100 text-teal-700',
  paid:      'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<string, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready:     'Listo',
  delivered: 'Entregado',
  paid:      'Pagado',
  cancelled: 'Cancelado',
};

const CANCEL_BTN = { status: 'cancelled', label: 'Cancelar', cls: 'bg-red-100 text-red-700 hover:bg-red-200' };

const NEXT: Record<string, { status: string; label: string; cls: string }[]> = {
  pending:   [{ status: 'confirmed', label: 'Confirmar',    cls: 'bg-blue-500 text-white'    }, CANCEL_BTN],
  confirmed: [{ status: 'preparing', label: 'En cocina',    cls: 'bg-purple-500 text-white'  }, CANCEL_BTN],
  preparing: [{ status: 'ready',     label: 'Marcar listo', cls: 'bg-green-500 text-white'   }, CANCEL_BTN],
  ready:     [{ status: 'delivered', label: 'Entregar',     cls: 'bg-teal-500 text-white'    }, CANCEL_BTN],
  delivered: [{ status: 'paid',      label: 'Cobrado',      cls: 'bg-primary-600 text-white' }],
};

const EDITABLE_STATUSES = ['pending', 'confirmed'];

export default function OrdersPage() {
  useRoleGuard('/orders');

  const [filter, setFilter]       = useState('');
  const [editOrder, setEdit]      = useState<any>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['orders', filter],
    queryFn: () => ordersApi.list(filter ? { status: filter } : {}).then(r => r.data),
    refetchInterval: 10000,
  });
  const orders = (data as any)?.data ?? [];

  const { data: prodData, isLoading: loadingProds } = useQuery({
    queryKey: ['products-orders', prodSearch],
    queryFn: () => productsApi.list({ search: prodSearch || undefined, limit: 50 }).then(r => r.data),
    enabled: !!editOrder,
    staleTime: 60_000,
  });
  const products: any[] = (prodData as any)?.data ?? [];

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Estado actualizado');
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const saveItems = useMutation({
    mutationFn: ({ id, items }: { id: string; items: any[] }) =>
      ordersApi.updateItems(id, { items }),
    onSuccess: () => {
      toast.success('Pedido actualizado');
      setEdit(null);
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al guardar'),
  });

  function openEdit(order: any) {
    setEdit(order);
    setEditItems(order.items.map((i: any) => ({
      productId:   i.productId,
      productName: i.productName,
      unitPrice:   Number(i.unitPrice),
      quantity:    i.quantity,
    })));
    setProdSearch('');
  }

  function addProduct(p: any) {
    setEditItems(prev => {
      const existing = prev.find(i => i.productId === p.id);
      if (existing) return prev.map(i => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: p.id, productName: p.name, unitPrice: Number(p.price), quantity: 1 }];
    });
  }

  function changeQty(productId: string, qty: number) {
    if (qty <= 0) setEditItems(prev => prev.filter(i => i.productId !== productId));
    else setEditItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty } : i));
  }

  const editSubtotal = editItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const editTotal    = editSubtotal + Math.round(editSubtotal * 0.19);

  const statuses = ['', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'paid', 'cancelled'];

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-5">Pedidos</h1>

        <div className="flex gap-2 mb-5 flex-wrap">
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-600'
              }`}>
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{order.orderNumber}</p>
                    <span className={`badge ${STATUS_BADGE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                    {order.tableNumber && (
                      <span className="badge bg-slate-100 text-slate-600">🪑 Mesa {order.tableNumber}</span>
                    )}
                    {order.waiterName && (
                      <span className="badge bg-emerald-50 text-emerald-700">
                        <UserCheck size={10} className="inline mr-1" />{order.waiterName}
                      </span>
                    )}
                    <span className="badge bg-slate-50 text-slate-500 capitalize">{order.type}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {new Date(order.createdAt).toLocaleString('es-CO')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {order.items?.slice(0, 5).map((item: any, i: number) => (
                      <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                        {item.quantity}x {item.productName}
                      </span>
                    ))}
                    {order.items?.length > 5 && (
                      <span className="text-xs text-slate-400">+{order.items.length - 5} más</span>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4 flex-none">
                  <p className="font-bold text-primary-600 text-lg">{fmt(Number(order.total))}</p>
                  <p className="text-xs text-slate-500">{order.items?.length} items</p>
                  {EDITABLE_STATUSES.includes(order.status) && (
                    <button
                      onClick={() => openEdit(order)}
                      className="mt-1 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium ml-auto">
                      <Pencil size={11} />Editar
                    </button>
                  )}
                </div>
              </div>

              {NEXT[order.status] && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                  {NEXT[order.status].map(a => (
                    <button key={a.status}
                      onClick={() => updateStatus.mutate({ id: order.id, status: a.status })}
                      disabled={updateStatus.isPending}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${a.cls}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── EDIT MODAL ─────────────────────────────────────────────────────────── */}
      {editOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-none">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Editar pedido</h2>
                <p className="text-xs text-slate-500">{editOrder.orderNumber}</p>
              </div>
              <button onClick={() => setEdit(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Current items */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Productos del pedido
                </p>
                {editItems.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Sin productos — agrega al menos uno</p>
                )}
                <div className="space-y-2">
                  {editItems.map((item) => (
                    <div key={item.productId}
                      className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.productName}</p>
                        <p className="text-xs text-primary-600 font-semibold">{fmt(item.unitPrice)}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-none">
                        <button onClick={() => changeQty(item.productId, item.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => changeQty(item.productId, item.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700">
                          <Plus size={12} />
                        </button>
                        <button onClick={() => changeQty(item.productId, 0)}
                          className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 ml-1">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {editItems.length > 0 && (
                <div className="bg-primary-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                  <span className="text-primary-600">Nuevo total estimado</span>
                  <span className="font-bold text-primary-700 text-base">{fmt(editTotal)}</span>
                </div>
              )}

              {/* Add products */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Agregar productos
                </p>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9 text-sm"
                    placeholder="Buscar producto..."
                    value={prodSearch}
                    onChange={e => setProdSearch(e.target.value)}
                  />
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {loadingProds && (
                    <p className="text-sm text-slate-400 text-center py-3">Cargando productos...</p>
                  )}
                  {!loadingProds && products.map((p: any) => (
                    <button key={p.id} onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-primary-50 border border-transparent hover:border-primary-200 transition-colors text-left">
                      <span className="text-sm font-medium text-slate-700">{p.name}</span>
                      <span className="flex items-center gap-1 text-xs text-primary-600 font-semibold flex-none">
                        {fmt(Number(p.price))}<Plus size={12} />
                      </span>
                    </button>
                  ))}
                  {!loadingProds && products.length === 0 && prodSearch && (
                    <p className="text-sm text-slate-400 text-center py-3">Sin resultados para "{prodSearch}"</p>
                  )}
                  {!loadingProds && products.length === 0 && !prodSearch && (
                    <p className="text-sm text-slate-400 text-center py-3">No hay productos disponibles</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3 flex-none">
              <button onClick={() => setEdit(null)} className="flex-1 btn-outline py-3">
                Cancelar
              </button>
              <button
                onClick={() => saveItems.mutate({ id: editOrder.id, items: editItems })}
                disabled={saveItems.isPending || editItems.length === 0}
                className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                {saveItems.isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
