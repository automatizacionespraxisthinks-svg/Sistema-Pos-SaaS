'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { ordersApi, paymentsApi, cashShiftApi, fmt } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import {
  Receipt, CreditCard, X, CheckCircle,
  ChefHat, UserCheck, AlertCircle, Coins,
  LockKeyhole, Unlock, Clock, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── constantes ───────────────────────────────────────────────────────────────

type PayMethod = 'cash' | 'card' | 'transfer';

const ORDER_TYPE_LABEL: Record<string, string> = {
  dine_in:  'Comer en restaurante',
  takeout:  'Para llevar',
  delivery: 'Domicilio',
};
const ORDER_TYPE_ICON: Record<string, string> = {
  dine_in: '🪑', takeout: '🥡', delivery: '🛵',
};
const STATUS_LABEL: Record<string, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready:     'Listo para entregar',
  delivered: 'Entregado — pendiente de pago',
  paid:      'Pagado',
  cancelled: 'Cancelado',
};
const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  ready:     'bg-emerald-100 text-emerald-700',
  delivered: 'bg-teal-100 text-teal-700',
  paid:      'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-600',
};

// Porcentajes predefinidos de propina; null = no elegido aún; -1 = manual
const TIP_PRESETS = [
  { label: '0%',  value: 0 },
  { label: '5%',  value: 5 },
  { label: '10%', value: 10, suggested: true },
  { label: '15%', value: 15 },
  { label: 'Otro', value: -1 },
];

// ─── generador de factura ─────────────────────────────────────────────────────

interface TenantInfo {
  name: string;
  logoUrl?: string | null;
  phone?: string | null;
  taxId?: string | null;
  address?: string | null;
}

function printInvoice(
  order: any,
  payment: { method: PayMethod; tip: number; cashReceived?: number; splits?: Split[] },
  cashierName: string,
  tenant?: TenantInfo,
) {
  const win = window.open('', '_blank', 'width=440,height=780');
  if (!win) return;

  const methodLabel: Record<string, string> = {
    cash: 'Efectivo', card: 'Tarjeta / Datáfono', transfer: 'Transferencia',
  };
  const grandTotal = Number(order.total) + payment.tip;
  const change = payment.method === 'cash' && payment.cashReceived
    ? Math.max(0, payment.cashReceived - grandTotal) : 0;

  const itemRows = (order.items ?? []).map((item: any) => `
    <tr>
      <td class="product-name">${item.productName}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${fmt(Number(item.unitPrice))}</td>
      <td class="right">${fmt(Number(item.subtotal))}</td>
    </tr>`).join('');

  const tipPctDisplay = order.subtotal > 0
    ? ` (${Math.round((payment.tip / Number(order.subtotal)) * 100)}%)`
    : '';

  const now = new Date().toLocaleString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const businessName = tenant?.name || 'POS SaaS';
  const logoHtml = tenant?.logoUrl
    ? `<img src="${tenant.logoUrl}" alt="${businessName}" style="max-width:80px;max-height:60px;object-fit:contain;margin-bottom:6px;" />`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${order.orderNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #111; max-width: 360px; margin: 0 auto; }
    .center { text-align: center; }
    .right  { text-align: right; }
    .divider { border-top: 1px dashed #555; margin: 8px 0; }
    .double  { border-top: 2px solid #111; margin: 8px 0; }
    .header { text-align: center; margin-bottom: 10px; }
    .header .brand { font-size: 18px; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
    .header .subtitle { font-size: 10px; color: #555; }
    .header .invoice-tag {
      display: inline-block; background: #111; color: #fff;
      font-size: 11px; font-weight: bold; padding: 3px 10px;
      border-radius: 4px; margin-top: 6px; letter-spacing: 1px;
    }
    .info { width: 100%; font-size: 11px; margin-bottom: 4px; }
    .info tr td:first-child { color: #555; padding-right: 6px; white-space: nowrap; }
    .info tr td:last-child  { font-weight: bold; }
    .items { width: 100%; font-size: 11px; border-collapse: collapse; }
    .items thead td { font-weight: bold; border-bottom: 1px solid #555; padding-bottom: 4px; }
    .items tbody tr td { padding: 3px 0; vertical-align: top; }
    .product-name { max-width: 130px; word-wrap: break-word; }
    .totals { width: 100%; font-size: 12px; }
    .totals tr td:first-child { color: #555; }
    .totals tr td:last-child  { text-align: right; }
    .totals .tip-row td { color: #059669; font-style: italic; }
    .totals .grand-total td { font-size: 15px; font-weight: bold; border-top: 2px solid #111; padding-top: 4px; }
    .payment { font-size: 11px; margin-top: 6px; }
    .payment .method { font-weight: bold; font-size: 13px; }
    .footer { text-align: center; font-size: 10px; color: #555; margin-top: 12px; }
    .footer .paid-stamp {
      display: inline-block; border: 2px solid #16a34a; color: #16a34a;
      font-weight: bold; font-size: 14px; padding: 4px 14px;
      border-radius: 4px; letter-spacing: 2px; margin-bottom: 6px;
    }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="brand">${businessName}</div>
    ${tenant?.phone    ? `<div class="subtitle">Tel: ${tenant.phone}</div>` : ''}
    ${tenant?.taxId    ? `<div class="subtitle">NIT: ${tenant.taxId}</div>` : ''}
    ${tenant?.address  ? `<div class="subtitle">${tenant.address}</div>` : ''}
    <div class="invoice-tag">FACTURA / RECIBO</div>
  </div>
  <div class="divider"></div>
  <table class="info">
    <tr><td>Factura Nº</td><td>${order.orderNumber}</td></tr>
    <tr><td>Fecha</td><td>${now}</td></tr>
    <tr><td>Tipo</td><td>${ORDER_TYPE_ICON[order.type] ?? ''} ${ORDER_TYPE_LABEL[order.type] ?? order.type}</td></tr>
    ${order.tableNumber ? `<tr><td>Mesa</td><td>#${order.tableNumber}</td></tr>` : ''}
    ${order.waiterName  ? `<tr><td>Mesero</td><td>${order.waiterName}</td></tr>` : ''}
    <tr><td>Cajero</td><td>${cashierName}</td></tr>
  </table>
  <div class="divider"></div>
  <table class="items">
    <thead>
      <tr>
        <td class="product-name">Producto</td>
        <td class="center">Cant.</td>
        <td class="right">P.Unit</td>
        <td class="right">Total</td>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="double"></div>
  <table class="totals">
    <tr><td>Subtotal</td><td>${fmt(Number(order.subtotal))}</td></tr>
    <tr><td>IVA (19%)</td><td>${fmt(Number(order.tax))}</td></tr>
    ${Number(order.discount) > 0 ? `<tr><td>Descuento</td><td>-${fmt(Number(order.discount))}</td></tr>` : ''}
    <tr><td>Total pedido</td><td>${fmt(Number(order.total))}</td></tr>
    ${payment.tip > 0 ? `<tr class="tip-row"><td>Propina${tipPctDisplay}</td><td>+ ${fmt(payment.tip)}</td></tr>` : ''}
    <tr class="grand-total"><td>TOTAL FINAL</td><td>${fmt(grandTotal)}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="payment">
    ${payment.splits ? `
      <div style="font-weight:bold;margin-bottom:4px">Cuenta dividida en ${payment.splits.length} partes:</div>
      <table style="width:100%;font-size:11px">
        ${payment.splits.map((sp, i) => {
          const spChange = sp.method === 'cash' && sp.cashReceived
            ? Math.max(0, Number(sp.cashReceived) - Number(sp.amount)) : 0;
          return `<tr>
            <td>Persona ${i + 1} (${methodLabel[sp.method] ?? sp.method})</td>
            <td style="text-align:right">${fmt(Number(sp.amount))}</td>
          </tr>${sp.method === 'cash' && sp.cashReceived ? `<tr><td style="color:#555;font-size:10px">  Cambio</td><td style="text-align:right;color:#555;font-size:10px">${fmt(spChange)}</td></tr>` : ''}`;
        }).join('')}
      </table>` : `
    <div>Método: <span class="method">${methodLabel[payment.method]}</span></div>
    ${payment.method === 'cash' && payment.cashReceived ? `
      <div>Recibido: ${fmt(payment.cashReceived)}</div>
      <div><strong>Cambio: ${fmt(change)}</strong></div>` : ''}`}
  </div>
  <div class="footer">
    <div class="divider"></div>
    <div class="paid-stamp">✓ PAGADO</div>
    <p>¡Gracias por su visita!</p>
    <p style="margin-top:4px;font-size:9px;">${new Date().toLocaleDateString('es-CO')} · ${order.orderNumber}</p>
  </div>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

// ─── tipos split ─────────────────────────────────────────────────────────────

interface Split {
  amount:       string;
  method:       PayMethod;
  cashReceived: string;
}

// ─── página ───────────────────────────────────────────────────────────────────

export default function CajaPage() {
  useRoleGuard('/caja');

  const { user } = useAuthStore();
  const cashierName = user ? `${user.firstName} ${user.lastName}` : 'Cajero';
  const tenant = useTenantTheme();

  // ── Turno de caja ─────────────────────────────────────────────────────────────
  const [openShiftModal,  setOpenShiftModal]  = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [shiftInitial,    setShiftInitial]    = useState('');
  const [shiftCounted,    setShiftCounted]    = useState('');
  const [shiftNotes,      setShiftNotes]      = useState('');

  const [filter, setFilter]            = useState('pending_payment');
  const [selectedOrder, setSelected]   = useState<any>(null);
  const [payMethod, setPayMethod]       = useState<PayMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  // Propina: null = no elegida aún, -1 = manual, >= 0 = porcentaje elegido
  const [tipPct, setTipPct]             = useState<number | null>(null);
  const [tipCustom, setTipCustom]       = useState('');
  // Split bill
  const [splitMode, setSplitMode]       = useState(false);
  const [splits, setSplits]             = useState<Split[]>([
    { amount: '', method: 'cash', cashReceived: '' },
    { amount: '', method: 'cash', cashReceived: '' },
  ]);
  const qc = useQueryClient();

  // ── Queries de turno ─────────────────────────────────────────────────────────

  const { data: currentShift, isLoading: loadingShift, refetch: refetchShift } = useQuery({
    queryKey: ['cash-shift-current'],
    queryFn: () => cashShiftApi.getCurrent().then(r => r.data),
    staleTime: 0,
  });

  const openShift = useMutation({
    mutationFn: () => cashShiftApi.open({
      cashierName,
      initialCash: Number(shiftInitial),
      notes: shiftNotes || undefined,
    }),
    onSuccess: () => {
      toast.success('✅ Caja abierta');
      setOpenShiftModal(false);
      setShiftInitial('');
      setShiftNotes('');
      refetchShift();
      qc.invalidateQueries({ queryKey: ['cash-shift-current'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al abrir caja'),
  });

  const closeShift = useMutation({
    mutationFn: () => cashShiftApi.close({
      countedCash: Number(shiftCounted),
      notes: shiftNotes || undefined,
    }),
    onSuccess: () => {
      toast.success('✅ Turno cerrado correctamente');
      setCloseShiftModal(false);
      setShiftCounted('');
      setShiftNotes('');
      refetchShift();
      qc.invalidateQueries({ queryKey: ['cash-shift-current'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al cerrar turno'),
  });

  const shiftOpen = !!currentShift?.id;

  // ── Pedidos ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['caja-orders'],
    queryFn: () => ordersApi.list({ limit: 200 }).then(r => r.data),
    refetchInterval: 8_000,
  });

  const allOrders: any[] = (data as any)?.data ?? [];
  const pendingPayment = allOrders.filter(
    o => o.paymentStatus !== 'paid' && o.status !== 'cancelled' && o.status !== 'paid',
  );
  const filtered =
    filter === 'dine_in'  ? pendingPayment.filter(o => o.type === 'dine_in')  :
    filter === 'takeout'  ? pendingPayment.filter(o => o.type === 'takeout')  :
    pendingPayment;

  // ── Cálculo propina ───────────────────────────────────────────────────────────

  const subtotal   = Number(selectedOrder?.subtotal ?? 0);
  const orderTotal = Number(selectedOrder?.total    ?? 0);
  const isDineIn   = selectedOrder?.type === 'dine_in';

  const tipAmount: number = (() => {
    if (!isDineIn) return 0;          // para llevar → sin propina
    if (tipPct === null) return 0;
    if (tipPct === -1)   return Math.max(0, Number(tipCustom) || 0);
    return Math.round(subtotal * tipPct / 100);
  })();

  const grandTotal = orderTotal + tipAmount;

  // Propina seleccionada (obligatoria en dine_in)
  const tipSelected = !isDineIn || tipPct !== null;
  // Efectivo suficiente
  const cashOk = payMethod !== 'cash' || (!!cashReceived && Number(cashReceived) >= grandTotal);
  // Pedido en estado cobrable
  const canPay = selectedOrder && ['ready', 'delivered', 'confirmed', 'preparing'].includes(selectedOrder.status);

  const changeAmt = payMethod === 'cash' && cashReceived
    ? Math.max(0, Number(cashReceived) - grandTotal) : 0;

  // ── Procesar pago ─────────────────────────────────────────────────────────────

  const processPayment = useMutation({
    mutationFn: async () => {
      // Determine method for payment record
      const uniqueMethods = splitMode
        ? Array.from(new Set(splits.map(s => s.method)))
        : [payMethod];
      const method: PayMethod = uniqueMethods.length === 1 ? uniqueMethods[0] as PayMethod : 'cash';

      await paymentsApi.process({
        orderId:      selectedOrder.id,
        amount:       orderTotal,
        tip:          tipAmount,
        method:       splitMode ? (uniqueMethods.length === 1 ? method : 'cash') : payMethod,
        cashReceived: !splitMode && payMethod === 'cash' && cashReceived ? Number(cashReceived) : undefined,
        cashierId:    user?.id,
        cashierName,
        waiterId:     selectedOrder.waiterId   || undefined,
        waiterName:   selectedOrder.waiterName || undefined,
      });
      const st = selectedOrder.status;
      if (st === 'delivered' || st === 'ready') {
        await ordersApi.updateStatus(selectedOrder.id, 'paid');
      }
    },
    onSuccess: () => {
      printInvoice(
        selectedOrder,
        {
          method:       splitMode ? 'cash' : payMethod,
          tip:          tipAmount,
          cashReceived: !splitMode && cashReceived ? Number(cashReceived) : undefined,
          splits:       splitMode ? splits : undefined,
        },
        cashierName,
        tenant,
      );
      toast.success(`✅ Pago registrado — ${selectedOrder.orderNumber}`);
      resetModal();
      qc.invalidateQueries({ queryKey: ['caja-orders'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al procesar el pago'),
  });

  // ── Split helpers ────────────────────────────────────────────────────────────

  function updateSplit(idx: number, field: keyof Split, value: string) {
    setSplits(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function addSplit() {
    setSplits(prev => [...prev, { amount: '', method: 'cash', cashReceived: '' }]);
  }

  function removeSplit(idx: number) {
    setSplits(prev => prev.filter((_, i) => i !== idx));
  }

  function distributeEqually() {
    const perPerson = Math.ceil(grandTotal / splits.length);
    setSplits(prev => prev.map((s, i) => ({
      ...s,
      amount: i === prev.length - 1
        ? String(grandTotal - perPerson * (prev.length - 1))
        : String(perPerson),
    })));
  }

  const splitTotal     = splits.reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
  const splitRemaining = grandTotal - splitTotal;
  const splitValid     = splitMode
    ? Math.abs(splitRemaining) < 1 && splits.every(sp => Number(sp.amount) > 0)
    : false;
  const splitCashOk    = splitMode
    ? splits.every(sp =>
        sp.method !== 'cash' ||
        (!!sp.cashReceived && Number(sp.cashReceived) >= Number(sp.amount))
      )
    : false;

  // ── Modal open/reset ──────────────────────────────────────────────────────────

  function openModal(order: any) {
    setSelected(order);
    setPayMethod('cash');
    setCashReceived('');
    setTipPct(order.type === 'dine_in' ? null : 0);
    setTipCustom('');
    setSplitMode(false);
    setSplits([
      { amount: '', method: 'cash', cashReceived: '' },
      { amount: '', method: 'cash', cashReceived: '' },
    ]);
  }

  function resetModal() {
    setSelected(null);
    setPayMethod('cash');
    setCashReceived('');
    setTipPct(null);
    setTipCustom('');
    setSplitMode(false);
    setSplits([
      { amount: '', method: 'cash', cashReceived: '' },
      { amount: '', method: 'cash', cashReceived: '' },
    ]);
  }

  // ── UI ────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Caja</h1>
            <p className="text-slate-500 text-sm">
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!loadingShift && (
              shiftOpen ? (
                <button
                  onClick={() => { setShiftCounted(''); setShiftNotes(''); setCloseShiftModal(true); }}
                  className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                  <Unlock size={15} />
                  Turno abierto · Cerrar turno
                </button>
              ) : (
                <button
                  onClick={() => { setShiftInitial(''); setShiftNotes(''); setOpenShiftModal(true); }}
                  className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-xl px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                  <LockKeyhole size={15} />
                  Abrir caja
                </button>
              )
            )}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
              <Receipt size={16} className="text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                {pendingPayment.length} pendiente{pendingPayment.length !== 1 ? 's' : ''} de cobro
              </span>
            </div>
          </div>
        </div>

        {/* ── Banner: caja cerrada ─────────────────────────────────────────────── */}
        {!loadingShift && !shiftOpen && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 text-center space-y-3">
            <LockKeyhole size={40} className="mx-auto text-amber-500" />
            <div>
              <p className="font-bold text-amber-900 text-lg">Caja cerrada</p>
              <p className="text-amber-700 text-sm">Abre un turno para registrar cobros</p>
            </div>
            <button
              onClick={() => { setShiftInitial(''); setShiftNotes(''); setOpenShiftModal(true); }}
              className="btn-primary px-8 py-2.5 mx-auto block">
              Abrir caja ahora
            </button>
          </div>
        )}

        {/* ── Info turno activo ────────────────────────────────────────────────── */}
        {shiftOpen && currentShift && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <Clock size={14} />
              Turno desde {new Date(currentShift.openedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">Base: <strong>{fmt(Number(currentShift.initialCash))}</strong></span>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-700">💵 Efectivo: <strong>{fmt(Number(currentShift.cashSales))}</strong></span>
            {Number(currentShift.cardSales) > 0 && (
              <span className="text-slate-600">💳 Tarjeta: <strong>{fmt(Number(currentShift.cardSales))}</strong></span>
            )}
            {Number(currentShift.totalTips) > 0 && (
              <span className="text-emerald-600">🪙 Propinas: <strong>{fmt(Number(currentShift.totalTips))}</strong></span>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'pending_payment', label: 'Todos' },
            { key: 'dine_in',         label: '🪑 Mesas' },
            { key: 'takeout',         label: '🥡 Para llevar' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-400'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Estado vacío */}
        {isLoading && <p className="text-center py-16 text-slate-400">Cargando pedidos...</p>}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400 space-y-2">
            <CheckCircle size={40} className="mx-auto text-emerald-400" />
            <p className="font-semibold">No hay pedidos pendientes de cobro</p>
            <p className="text-sm">Los pedidos aparecerán aquí cuando estén confirmados</p>
          </div>
        )}

        {/* Tarjetas de pedidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(order => (
            <div key={order.id}
              onClick={() => openModal(order)}
              className="card cursor-pointer hover:shadow-md hover:border-primary-300 border-2 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-900">{order.orderNumber}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`badge text-xs ${STATUS_COLOR[order.status]}`}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="badge bg-slate-100 text-slate-600 text-xs">
                  {ORDER_TYPE_ICON[order.type]} {ORDER_TYPE_LABEL[order.type]}
                </span>
                {order.tableNumber && (
                  <span className="badge bg-blue-100 text-blue-700 text-xs">Mesa #{order.tableNumber}</span>
                )}
                {order.waiterName && (
                  <span className="badge bg-emerald-50 text-emerald-700 text-xs">
                    <UserCheck size={10} className="inline mr-1" />{order.waiterName}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {(order.items ?? []).slice(0, 3).map((item: any, i: number) => (
                  <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                    {item.quantity}× {item.productName}
                  </span>
                ))}
                {(order.items ?? []).length > 3 && (
                  <span className="text-xs text-slate-400">+{order.items.length - 3} más</span>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-lg font-bold text-primary-600">{fmt(Number(order.total))}</span>
                <button className="flex items-center gap-1.5 bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                  <CreditCard size={14} />Cobrar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL DE PAGO ─────────────────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[95vh]">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-none">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Registrar pago</h2>
                <p className="text-xs text-slate-500">{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={resetModal} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={22} />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Badges de mesa / mesero */}
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-slate-100 text-slate-700 text-xs">
                  {ORDER_TYPE_ICON[selectedOrder.type]} {ORDER_TYPE_LABEL[selectedOrder.type]}
                </span>
                {selectedOrder.tableNumber && (
                  <span className="badge bg-blue-100 text-blue-700 text-xs">
                    Mesa #{selectedOrder.tableNumber}
                  </span>
                )}
                {selectedOrder.waiterName && (
                  <span className="badge bg-emerald-100 text-emerald-700 text-xs">
                    <UserCheck size={10} className="inline mr-1" />{selectedOrder.waiterName}
                  </span>
                )}
              </div>

              {/* Detalle ítems */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Detalle del pedido</p>
                <div className="space-y-1.5">
                  {(selectedOrder.items ?? []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-700">
                        <span className="font-semibold text-slate-900">{item.quantity}×</span> {item.productName}
                      </span>
                      <span className="font-medium text-slate-800 flex-none ml-3">{fmt(Number(item.subtotal))}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtotales */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span><span>{fmt(Number(selectedOrder.subtotal))}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IVA (19%)</span><span>{fmt(Number(selectedOrder.tax))}</span>
                </div>
                {Number(selectedOrder.discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span><span>-{fmt(Number(selectedOrder.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-slate-800 pt-1 border-t border-slate-200">
                  <span>Total pedido</span><span>{fmt(orderTotal)}</span>
                </div>
              </div>

              {/* ── PROPINA (solo dine_in) ──────────────────────────────────── */}
              {isDineIn && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-emerald-600 flex-none" />
                    <p className="text-sm font-semibold text-slate-800">
                      Propina para{selectedOrder.waiterName ? `: ${selectedOrder.waiterName}` : ' el mesero'}
                    </p>
                    {tipPct === null && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <AlertCircle size={12} />Requerida
                      </span>
                    )}
                  </div>

                  {/* Botones de porcentaje */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {TIP_PRESETS.map(preset => (
                      <button key={preset.value}
                        onClick={() => { setTipPct(preset.value); setTipCustom(''); }}
                        className={`relative py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          tipPct === preset.value
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        {preset.label}
                        {preset.suggested && (
                          <span className={`absolute -top-1.5 -right-1 text-[9px] font-bold px-1 rounded-full ${
                            tipPct === preset.value ? 'bg-white text-emerald-700' : 'bg-emerald-500 text-white'
                          }`}>
                            ★
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Input manual */}
                  {tipPct === -1 && (
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">
                        Monto manual de propina
                      </label>
                      <input
                        type="number" inputMode="numeric" min="0"
                        className="input text-center font-bold text-lg"
                        placeholder="$ 0"
                        value={tipCustom}
                        onChange={e => setTipCustom(e.target.value)}
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Confirmación del monto de propina */}
                  {tipPct !== null && (
                    <div className={`rounded-xl p-3 flex items-center justify-between text-sm ${
                      tipAmount > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'
                    }`}>
                      <span className={tipAmount > 0 ? 'text-emerald-700' : 'text-slate-500'}>
                        {tipAmount > 0 ? '✓ Propina registrada' : 'Sin propina'}
                        {selectedOrder.waiterName && tipAmount > 0 && ` → ${selectedOrder.waiterName}`}
                      </span>
                      <span className={`font-bold text-base ${tipAmount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {fmt(tipAmount)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Total final a cobrar */}
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-center">
                <p className="text-xs text-primary-600 font-medium mb-1">
                  {isDineIn && tipAmount > 0 ? 'Total pedido + propina' : 'Total a cobrar'}
                </p>
                <p className="text-3xl font-bold text-primary-700">{fmt(grandTotal)}</p>
                {isDineIn && tipAmount > 0 && (
                  <p className="text-xs text-primary-500 mt-1">
                    {fmt(orderTotal)} + {fmt(tipAmount)} propina
                  </p>
                )}
              </div>

              {/* Toggle dividir cuenta */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {splitMode ? '🔀 Dividir cuenta' : 'Método de pago'}
                </span>
                <button
                  onClick={() => setSplitMode(v => !v)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    splitMode
                      ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>
                  {splitMode ? '✕ Pago único' : '⇄ Dividir cuenta'}
                </button>
              </div>

              {/* ── MODO DIVIDIR CUENTA ────────────────────────────────────────── */}
              {splitMode ? (
                <div className="space-y-3">

                  {/* Distribución rápida */}
                  <button
                    onClick={distributeEqually}
                    className="w-full text-xs font-medium text-violet-600 hover:text-violet-800 py-1.5 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors">
                    ↔ Distribuir en partes iguales ({splits.length} personas)
                  </button>

                  {/* Splits */}
                  {splits.map((sp, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Persona {idx + 1}</span>
                        {splits.length > 2 && (
                          <button
                            onClick={() => removeSplit(idx)}
                            className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        )}
                      </div>

                      {/* Amount */}
                      <input
                        type="number" inputMode="numeric" placeholder="$ Monto"
                        value={sp.amount}
                        onChange={e => updateSplit(idx, 'amount', e.target.value)}
                        className="input text-center font-bold"
                      />

                      {/* Method */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['cash', 'card', 'transfer'] as PayMethod[]).map(m => (
                          <button key={m}
                            onClick={() => updateSplit(idx, 'method', m)}
                            className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              sp.method === m ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {m === 'cash' ? '💵 Efectivo' : m === 'card' ? '💳 Tarjeta' : '🏦 Transfer'}
                          </button>
                        ))}
                      </div>

                      {/* Cash received for this split */}
                      {sp.method === 'cash' && sp.amount && (
                        <div>
                          <input
                            type="number" inputMode="numeric" placeholder="$ Recibido"
                            value={sp.cashReceived}
                            onChange={e => updateSplit(idx, 'cashReceived', e.target.value)}
                            className="input text-center text-sm"
                          />
                          {sp.cashReceived && Number(sp.cashReceived) >= Number(sp.amount) && (
                            <p className="text-xs text-green-600 text-center mt-1 font-medium">
                              Cambio: {fmt(Math.max(0, Number(sp.cashReceived) - Number(sp.amount)))}
                            </p>
                          )}
                          {sp.cashReceived && Number(sp.cashReceived) < Number(sp.amount) && (
                            <p className="text-xs text-red-500 text-center mt-1">
                              Faltan {fmt(Number(sp.amount) - Number(sp.cashReceived))}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add person */}
                  <button
                    onClick={addSplit}
                    className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors">
                    + Agregar persona
                  </button>

                  {/* Running total */}
                  <div className={`rounded-xl p-3 flex items-center justify-between text-sm ${
                    Math.abs(splitRemaining) < 1 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <span className={Math.abs(splitRemaining) < 1 ? 'text-green-700' : 'text-amber-700'}>
                      {Math.abs(splitRemaining) < 1 ? '✓ Total cubierto' : splitRemaining > 0 ? `Falta asignar` : 'Excede el total'}
                    </span>
                    <span className={`font-bold ${Math.abs(splitRemaining) < 1 ? 'text-green-700' : 'text-amber-700'}`}>
                      {Math.abs(splitRemaining) < 1 ? fmt(grandTotal) : fmt(Math.abs(splitRemaining))}
                    </span>
                  </div>
                </div>

              ) : (
                <>
                  {/* ── PAGO ÚNICO ──────────────────────────────────────────────── */}
                  <div className="grid grid-cols-3 gap-2">
                    {(['cash', 'card', 'transfer'] as PayMethod[]).map(m => (
                      <button key={m}
                        onClick={() => { setPayMethod(m); setCashReceived(''); }}
                        className={`py-3 rounded-xl text-sm font-medium flex flex-col items-center gap-1 transition-colors ${
                          payMethod === m ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        <span className="text-lg">{m === 'cash' ? '💵' : m === 'card' ? '💳' : '🏦'}</span>
                        <span>{m === 'cash' ? 'Efectivo' : m === 'card' ? 'Tarjeta' : 'Transferencia'}</span>
                      </button>
                    ))}
                  </div>

                  {payMethod === 'cash' && (
                    <div>
                      <label className="text-sm font-semibold text-slate-700 mb-1 block">Efectivo recibido</label>
                      <input
                        type="number" inputMode="numeric"
                        className="input text-xl text-center font-bold tracking-wide"
                        placeholder="$ 0"
                        value={cashReceived}
                        onChange={e => setCashReceived(e.target.value)}
                      />
                      {cashReceived && Number(cashReceived) >= grandTotal && (
                        <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                          <p className="text-xs text-green-600 font-medium">Cambio a devolver</p>
                          <p className="text-2xl font-bold text-green-700">{fmt(changeAmt)}</p>
                        </div>
                      )}
                      {cashReceived && Number(cashReceived) < grandTotal && (
                        <p className="text-xs text-red-500 mt-1 text-center">
                          Faltan {fmt(grandTotal - Number(cashReceived))}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Alerta pedido no cobrable */}
              {!canPay && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  <ChefHat size={16} className="flex-none" />
                  Estado actual: <strong className="ml-1">{STATUS_LABEL[selectedOrder.status]}</strong>
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div className="p-5 border-t border-slate-100 flex gap-3 flex-none">
              <button onClick={resetModal} className="flex-1 btn-outline py-3">
                Cancelar
              </button>
              <button
                onClick={() => processPayment.mutate()}
                disabled={
                processPayment.isPending || !canPay || !tipSelected ||
                (splitMode ? (!splitValid || !splitCashOk) : !cashOk)
              }
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 text-base disabled:opacity-50 disabled:cursor-not-allowed">
                <Receipt size={18} />
                {processPayment.isPending ? 'Procesando...' : 'Cobrar y emitir factura'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL ABRIR TURNO ──────────────────────────────────────────────────── */}
      {openShiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-none">
                <Unlock size={20} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Abrir caja</h2>
                <p className="text-xs text-slate-500">{cashierName}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Fondo inicial en efectivo *
                </label>
                <input
                  type="number" inputMode="numeric" min="0"
                  className="input text-xl text-center font-bold"
                  placeholder="$ 0"
                  value={shiftInitial}
                  onChange={e => setShiftInitial(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1 text-center">
                  Dinero en la gaveta al iniciar turno
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Notas (opcional)</label>
                <input className="input text-sm" placeholder="Ej: Turno mañana"
                  value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setOpenShiftModal(false)} className="flex-1 btn-outline py-3">
                Cancelar
              </button>
              <button
                onClick={() => openShift.mutate()}
                disabled={openShift.isPending || !shiftInitial}
                className="flex-1 btn-primary py-3 disabled:opacity-50">
                {openShift.isPending ? 'Abriendo...' : 'Abrir caja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CERRAR TURNO ─────────────────────────────────────────────────── */}
      {closeShiftModal && currentShift && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-none">
                <LockKeyhole size={20} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Cerrar turno</h2>
                <p className="text-xs text-slate-500">{cashierName}</p>
              </div>
            </div>

            {/* Resumen del turno */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Fondo inicial</span>
                <strong>{fmt(Number(currentShift.initialCash))}</strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>💵 Ventas efectivo</span>
                <strong>{fmt(Number(currentShift.cashSales))}</strong>
              </div>
              <div className="flex justify-between font-semibold text-slate-800 border-t border-slate-200 pt-1.5">
                <span>Efectivo esperado en caja</span>
                <strong className="text-emerald-700">
                  {fmt(Number(currentShift.initialCash) + Number(currentShift.cashSales))}
                </strong>
              </div>
              {Number(currentShift.cardSales) > 0 && (
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                  <span>💳 Ventas tarjeta</span>
                  <strong>{fmt(Number(currentShift.cardSales))}</strong>
                </div>
              )}
              {Number(currentShift.totalTips) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>🪙 Propinas totales</span>
                  <strong>{fmt(Number(currentShift.totalTips))}</strong>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                  Efectivo contado en caja *
                </label>
                <input
                  type="number" inputMode="numeric" min="0"
                  className="input text-xl text-center font-bold"
                  placeholder="$ 0"
                  value={shiftCounted}
                  onChange={e => setShiftCounted(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Preview descuadre */}
              {shiftCounted && (
                (() => {
                  const expected = Number(currentShift.initialCash) + Number(currentShift.cashSales);
                  const diff = Number(shiftCounted) - expected;
                  return (
                    <div className={`rounded-xl p-3 flex justify-between text-sm font-semibold ${
                      Math.abs(diff) < 1 ? 'bg-emerald-50 text-emerald-700' :
                      diff > 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <span>{Math.abs(diff) < 1 ? '✓ Sin descuadre' : diff > 0 ? '↑ Sobrante' : '↓ Faltante'}</span>
                      <span>{Math.abs(diff) < 1 ? 'Cuadra perfecto' : fmt(Math.abs(diff))}</span>
                    </div>
                  );
                })()
              )}

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Notas de cierre (opcional)</label>
                <input className="input text-sm" placeholder="Observaciones del turno"
                  value={shiftNotes} onChange={e => setShiftNotes(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setCloseShiftModal(false)} className="flex-1 btn-outline py-3">
                Cancelar
              </button>
              <button
                onClick={() => closeShift.mutate()}
                disabled={closeShift.isPending || !shiftCounted}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors">
                {closeShift.isPending ? 'Cerrando...' : 'Cerrar turno'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
