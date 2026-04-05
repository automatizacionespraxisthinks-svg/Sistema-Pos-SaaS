'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { productsApi, categoriesApi, ordersApi, kitchenApi, authApi, fmt } from '@/lib/api';
import { useCartStore } from '@/store/cart.store';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import {
  Plus, Minus, Trash2, ShoppingCart, Search,
  X, ChevronUp, UserCheck, AlertCircle, SendHorizonal,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function POSPage() {
  useRoleGuard('/pos');

  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const qc = useQueryClient();

  const {
    items, addItem, removeItem, updateQty, clearCart,
    tableNumber, orderType, setTable, setType,
    waiterId, waiterName, setWaiter,
    subtotal, tax, total, discount,
  } = useCartStore();

  const cartCount = items.reduce((a, i) => a + i.quantity, 0);

  // ── queries ─────────────────────────────────────────────────────────────────

  const { data: cats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then(r => r.data),
  });

  const { data: pd } = useQuery({
    queryKey: ['products-pos', activeCat, search],
    queryFn: () => productsApi.list({
      categoryId: activeCat || undefined,
      search: search || undefined,
      limit: 100,
    }).then(r => r.data),
  });
  const products = (pd as any)?.data ?? [];

  const { data: waiters = [] } = useQuery<any[]>({
    queryKey: ['waiters'],
    queryFn: () => authApi.getUsers('waiter').then(r => r.data),
    enabled: orderType === 'dine_in',
    staleTime: 5 * 60 * 1000,
  });

  // ── crear pedido (SIN pago — el pago lo hace caja) ──────────────────────────

  const sendOrder = useMutation({
    mutationFn: async () => {
      const res = await ordersApi.create({
        type: orderType,
        tableNumber: tableNumber || undefined,
        waiterId:    waiterId    || undefined,
        waiterName:  waiterName  || undefined,
        items,
        discount,
      });
      // Confirmar de inmediato → va a cocina
      await ordersApi.updateStatus(res.data.id, 'confirmed');
      // Crear ticket en cocina
      await kitchenApi.create({
        orderId:     res.data.id,
        orderNumber: res.data.orderNumber,
        tableNumber: tableNumber || undefined,
        items: items.map(i => ({ productName: i.productName, quantity: i.quantity, notes: i.notes })),
      });
      return res;
    },
    onSuccess: (res) => {
      toast.success(`✅ Pedido ${res.data.orderNumber} enviado a cocina`);
      clearCart();
      setShowConfirm(false);
      setShowCart(false);
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => toast.error('Error al crear el pedido'),
  });

  // Validación: dine_in con mesa requiere mesero
  const needsWaiter = orderType === 'dine_in' && !!tableNumber && !waiterId;
  const canSend     = items.length > 0 && !needsWaiter;

  // ── cart panel (compartido desktop y mobile) ─────────────────────────────────

  const CartContent = () => (
    <>
      {/* Config pedido */}
      <div className="p-4 border-b border-slate-100 space-y-2">
        <select value={orderType} onChange={e => setType(e.target.value as any)} className="input text-sm">
          <option value="dine_in">🪑 Comer aquí</option>
          <option value="takeout">🥡 Para llevar</option>
          <option value="delivery">🛵 Domicilio</option>
        </select>

        {orderType === 'dine_in' && (
          <input className="input text-sm" placeholder="Mesa # (ej: 5)"
            value={tableNumber} onChange={e => setTable(e.target.value)} />
        )}

        {orderType === 'dine_in' && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <UserCheck size={13} className="text-slate-500" />
              <span className="text-xs font-medium text-slate-600">Mesero asignado</span>
              {tableNumber && !waiterId && (
                <span className="ml-auto flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                  <AlertCircle size={11} />Requerido
                </span>
              )}
            </div>
            <select
              value={waiterId}
              onChange={e => {
                const sel = (waiters as any[]).find(w => w.id === e.target.value);
                sel ? setWaiter(sel.id, `${sel.firstName} ${sel.lastName}`) : setWaiter('', '');
              }}
              className={`input text-sm ${tableNumber && !waiterId ? 'border-amber-400' : ''}`}
            >
              <option value="">— Sin asignar —</option>
              {(waiters as any[]).map(w => (
                <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
              ))}
            </select>
            {waiterName && (
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                <UserCheck size={11} />{waiterName} asignado/a
              </p>
            )}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Selecciona productos del menú</p>
          </div>
        ) : items.map(item => (
          <div key={item.productId} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{item.productName}</p>
              <p className="text-xs text-primary-600 font-semibold">{fmt(item.unitPrice)}</p>
            </div>
            <div className="flex items-center gap-1 flex-none">
              <button onClick={() => updateQty(item.productId, item.quantity - 1)}
                className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300">
                <Minus size={12} />
              </button>
              <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
              <button onClick={() => updateQty(item.productId, item.quantity + 1)}
                className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700">
                <Plus size={12} />
              </button>
              <button onClick={() => removeItem(item.productId)}
                className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 ml-1">
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Totales + botón enviar */}
      {items.length > 0 && (
        <div className="p-4 border-t border-slate-100 space-y-2 flex-none">
          <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{fmt(subtotal())}</span></div>
          <div className="flex justify-between text-sm text-slate-600"><span>IVA (19%)</span><span>{fmt(tax())}</span></div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600"><span>Descuento</span><span>-{fmt(discount)}</span></div>
          )}
          <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-200">
            <span>Total estimado</span>
            <span className="text-primary-600">{fmt(total())}</span>
          </div>

          {/* Aviso mesero faltante */}
          {needsWaiter && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
              <AlertCircle size={14} className="flex-none mt-0.5" />
              <span>Asigna un mesero antes de enviar el pedido de la mesa {tableNumber}</span>
            </div>
          )}

          {/* Nota informativa sobre el cobro */}
          <p className="text-xs text-slate-400 text-center pt-1">
            💳 El pago se registra en Caja cuando el cliente lo solicite
          </p>

          <div className="flex gap-2">
            <button onClick={clearCart}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
              Limpiar
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!canSend}
              className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <SendHorizonal size={16} />
              Enviar a cocina
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <AppLayout>
      <div className="flex h-full lg:h-screen">

        {/* Grilla de productos */}
        <div className="flex-1 flex flex-col p-3 md:p-4 overflow-hidden min-w-0">
          <h1 className="text-lg font-bold text-slate-900 mb-3 hidden lg:block">Punto de Venta</h1>

          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9 text-sm" placeholder="Buscar producto..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
            <button onClick={() => setActiveCat(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-none transition-colors ${!activeCat ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              Todos
            </button>
            {(cats as any[]).map((cat: any) => (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-none transition-colors ${activeCat === cat.id ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {products.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <ShoppingCart size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin productos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-3">
                {(products as any[]).map((p: any) => (
                  <button key={p.id}
                    onClick={() => addItem({ productId: p.id, productName: p.name, unitPrice: Number(p.price) })}
                    className="bg-white rounded-xl border border-slate-200 p-3 text-left hover:border-primary-600 hover:shadow-md transition-all active:scale-95">
                    <div className="w-full aspect-square bg-slate-100 rounded-lg mb-2 flex items-center justify-center text-2xl md:text-3xl overflow-hidden">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        p.category?.name === 'Bebidas' ? '☕'
                        : p.category?.name === 'Postres' ? '🍰'
                        : p.category?.name === 'Entradas' ? '🥗'
                        : '🍽️'
                      )}
                    </div>
                    <p className="text-xs md:text-sm font-semibold text-slate-900 truncate leading-tight">{p.name}</p>
                    <p className="text-primary-600 font-bold text-xs md:text-sm mt-0.5">{fmt(Number(p.price))}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Carrito — desktop */}
        <div className="hidden lg:flex w-80 bg-white border-l border-slate-200 flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary-600" />
            <h2 className="font-bold text-slate-900">Pedido</h2>
            {cartCount > 0 && (
              <span className="ml-auto bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </div>
          <CartContent />
        </div>
      </div>

      {/* Mobile: botón flotante */}
      {cartCount > 0 && !showCart && (
        <button onClick={() => setShowCart(true)}
          className="fixed bottom-6 right-4 z-30 lg:hidden bg-primary-600 text-white rounded-2xl px-5 py-3.5 shadow-xl flex items-center gap-3 font-semibold">
          <ShoppingCart size={18} />
          <span>{cartCount} items · {fmt(total())}</span>
          <ChevronUp size={16} />
        </button>
      )}

      {/* Mobile: bottom sheet */}
      {showCart && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setShowCart(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100 flex-none">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary-600" />
                <h2 className="font-bold text-slate-900">Pedido</h2>
                <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{cartCount}</span>
              </div>
              <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-slate-700 p-1"><X size={20} /></button>
            </div>
            <CartContent />
          </div>
        </div>
      )}

      {/* Modal de confirmación antes de enviar */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Confirmar pedido</h2>
            <p className="text-sm text-slate-500 mb-4">El pedido se enviará a cocina. El cobro se realiza en caja.</p>

            <div className="bg-slate-50 rounded-xl p-3 space-y-1 mb-4 text-sm">
              {orderType === 'dine_in' && tableNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Mesa</span>
                  <span className="font-semibold">#{tableNumber}</span>
                </div>
              )}
              {waiterName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Mesero</span>
                  <span className="font-semibold">{waiterName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Productos</span>
                <span className="font-semibold">{cartCount} items</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                <span className="text-slate-500">Total estimado</span>
                <span className="font-bold text-primary-600">{fmt(total())}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 btn-outline py-3">Revisar</button>
              <button
                onClick={() => sendOrder.mutate()}
                disabled={sendOrder.isPending}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                <SendHorizonal size={16} />
                {sendOrder.isPending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
