'use client';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Receipt, Percent, ChevronLeft, ChevronRight, FileDown, Calendar, HandCoins,
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { analyticsApi, fmt } from '@/lib/api';

// ─── types ────────────────────────────────────────────────────────────────────

type Period = 'day' | 'week' | 'month';

interface Overview {
  revenue: number; orders: number; avgTicket: number;
  tax: number; discount: number; totalTips: number;
  prev: { revenue: number; orders: number };
}
interface TrendRow   { bucket: string; revenue: number; orders: number; tax: number }
interface Product    { productId: string; productName: string; qty: number; revenue: number; orderCount: number }
interface PayMethod  { method: string; count: number; total: number; totalTips: number }
interface HourlyRow  { hour: number; label: string; orders: number; revenue: number }

// ─── constants ────────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<Period, string> = { day: 'Día', week: 'Semana', month: 'Mes' };
const PAYMENT_NAMES: Record<string, string>  = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Mixto' };
const PIE_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }

function getPeriodLabel(period: Period, date: string): string {
  const d = parseISO(date);
  if (period === 'day')   return format(d, "EEEE, d 'de' MMMM yyyy", { locale: es });
  if (period === 'week') {
    const from = startOfWeek(d, { weekStartsOn: 1 });
    const to   = endOfWeek(d,   { weekStartsOn: 1 });
    return `${format(from, "d MMM", { locale: es })} – ${format(to, "d MMM yyyy", { locale: es })}`;
  }
  return format(d, "MMMM yyyy", { locale: es });
}

function navigate(period: Period, date: string, dir: 1 | -1): string {
  const d = parseISO(date);
  if (period === 'day')   return format(addDays(d, dir),    'yyyy-MM-dd');
  if (period === 'week')  return format(addWeeks(d, dir),   'yyyy-MM-dd');
  return                         format(addMonths(d, dir),  'yyyy-MM-dd');
}

function pct(current: number, prev: number): number {
  if (!prev) return 0;
  return Math.round(((current - prev) / prev) * 100);
}

function trendLabel(period: Period, bucket: string): string {
  const d = parseISO(bucket);
  if (period === 'day') return format(d, 'HH:mm');
  return format(d, 'd MMM', { locale: es });
}

// ─── sub-components ───────────────────────────────────────────────────────────

function KPICard({
  title, value, sub, icon: Icon, color, change, changeLabel,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
  change?: number; changeLabel?: string;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-none ${color}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{title}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
          {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{children}</h2>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">{text}</div>
  );
}

// ─── custom tooltip for recharts ─────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'revenue' ? 'Ingresos' : 'Pedidos'}: {p.name === 'revenue' ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── PDF export ───────────────────────────────────────────────────────────────

function exportPDF(
  periodLabel: string,
  overview: Overview | undefined,
  topProducts: Product[],
  paymentMethods: PayMethod[],
  trend: TrendRow[],
  period: Period,
) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  const rows = (arr: string[][]) =>
    arr.map(r => `<tr>${r.map((c, i) => `<td class="${i > 0 ? 'right' : ''}">${c}</td>`).join('')}</tr>`).join('');

  const trendRows = trend.slice(0, 50).map(t => [
    new Date(t.bucket).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
    String(t.orders),
    fmt(t.revenue),
  ]);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Analítica — ${periodLabel}</title>
  <style>
    @page { margin: 2cm; size: A4 portrait; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.5; }
    h1 { color: #2563eb; font-size: 22px; margin: 0 0 2px; }
    .subtitle { color: #64748b; font-size: 10px; margin-bottom: 20px; }
    h2 { font-size: 13px; color: #1e40af; border-bottom: 2px solid #2563eb; padding-bottom: 3px; margin: 20px 0 10px; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 4px; }
    .kpi { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .kpi-label { color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
    .kpi-value { font-size: 17px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
    .right { text-align: right; }
    .footer { margin-top: 32px; color: #94a3b8; font-size: 9px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Reporte de Analítica</h1>
  <p class="subtitle">
    Período: <strong>${periodLabel}</strong> &nbsp;|&nbsp;
    Generado: ${new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
  </p>

  <h2>Resumen General</h2>
  <div class="kpis">
    <div class="kpi"><div class="kpi-label">Ingresos Totales</div><div class="kpi-value">${fmt(overview?.revenue ?? 0)}</div></div>
    <div class="kpi"><div class="kpi-label">Pedidos</div><div class="kpi-value">${overview?.orders ?? 0}</div></div>
    <div class="kpi"><div class="kpi-label">Ticket Promedio</div><div class="kpi-value">${fmt(overview?.avgTicket ?? 0)}</div></div>
    <div class="kpi"><div class="kpi-label">IVA Recaudado</div><div class="kpi-value">${fmt(overview?.tax ?? 0)}</div></div>
    <div class="kpi"><div class="kpi-label">Descuentos</div><div class="kpi-value">${fmt(overview?.discount ?? 0)}</div></div>
    <div class="kpi"><div class="kpi-label">Propinas</div><div class="kpi-value" style="color:#0d9488">${fmt(overview?.totalTips ?? 0)}</div></div>
    <div class="kpi"><div class="kpi-label">Ingresos Netos</div><div class="kpi-value">${fmt((overview?.revenue ?? 0) - (overview?.tax ?? 0))}</div></div>
  </div>

  ${topProducts.length > 0 ? `
  <h2>Productos Más Vendidos</h2>
  <table>
    <thead><tr><th>Producto</th><th class="right">Unidades</th><th class="right">Ingresos</th><th class="right">Pedidos</th></tr></thead>
    <tbody>${rows(topProducts.map(p => [p.productName, String(p.qty), fmt(p.revenue), String(p.orderCount)]))}</tbody>
  </table>` : ''}

  ${paymentMethods.length > 0 ? `
  <h2>Métodos de Pago</h2>
  <table>
    <thead><tr><th>Método</th><th class="right">Transacciones</th><th class="right">Total</th><th class="right">Propinas</th></tr></thead>
    <tbody>${rows(paymentMethods.map(p => [PAYMENT_NAMES[p.method] || p.method, String(p.count), fmt(p.total), fmt(p.totalTips ?? 0)]))}</tbody>
  </table>` : ''}

  ${trend.length > 0 ? `
  <h2>Detalle de ${period === 'day' ? 'Ventas por Hora' : 'Ventas por Día'}</h2>
  <table>
    <thead><tr><th>Período</th><th class="right">Pedidos</th><th class="right">Ingresos</th></tr></thead>
    <tbody>${rows(trendRows)}</tbody>
  </table>` : ''}

  <div class="footer">POS SaaS · Omnicanal · Reporte generado automáticamente · ${new Date().toLocaleDateString('es-CO')}</div>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  useRoleGuard('/analytics');

  const [period, setPeriod] = useState<Period>('day');
  const [refDate, setRefDate] = useState(todayStr);

  const qKey = [period, refDate];

  const { data: overview, isLoading: loadingOv } = useQuery<Overview>({
    queryKey: ['analytics-overview', ...qKey],
    queryFn:  () => analyticsApi.getOverview(period, refDate).then(r => r.data),
  });

  const { data: trend = [], isLoading: loadingTrend } = useQuery<TrendRow[]>({
    queryKey: ['analytics-trend', ...qKey],
    queryFn:  () => analyticsApi.getRevenueTrend(period, refDate).then(r => r.data),
  });

  const { data: topProducts = [], isLoading: loadingProd } = useQuery<Product[]>({
    queryKey: ['analytics-top', ...qKey],
    queryFn:  () => analyticsApi.getTopProducts(period, refDate).then(r => r.data),
  });

  const { data: paymentMethods = [], isLoading: loadingPay } = useQuery<PayMethod[]>({
    queryKey: ['analytics-payments', ...qKey],
    queryFn:  () => analyticsApi.getPaymentMethods(period, refDate).then(r => r.data),
  });

  const { data: hourly = [], isLoading: loadingHourly } = useQuery<HourlyRow[]>({
    queryKey: ['analytics-hourly', refDate],
    queryFn:  () => analyticsApi.getHourly(refDate).then(r => r.data),
    enabled:  period === 'day',
  });

  const periodLabel = getPeriodLabel(period, refDate);
  const isToday     = refDate === todayStr();
  const isLoading   = loadingOv || loadingTrend || loadingProd || loadingPay;

  const trendData = trend.map(t => ({
    label:   trendLabel(period, t.bucket),
    revenue: t.revenue,
    orders:  t.orders,
  }));

  const productsData = topProducts.slice(0, 8).map(p => ({
    name:    p.productName.length > 22 ? p.productName.slice(0, 20) + '…' : p.productName,
    revenue: p.revenue,
    qty:     p.qty,
  }));

  const totalPay = paymentMethods.reduce((s, p) => s + p.total, 0);

  const revenueChange = pct(overview?.revenue ?? 0, overview?.prev?.revenue ?? 0);
  const ordersChange  = pct(overview?.orders  ?? 0, overview?.prev?.orders  ?? 0);

  const handleExport = useCallback(() => {
    exportPDF(periodLabel, overview, topProducts, paymentMethods, trend, period);
  }, [periodLabel, overview, topProducts, paymentMethods, trend, period]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analítica</h1>
            <p className="text-slate-500 text-sm capitalize">{periodLabel}</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 btn-outline text-sm"
          >
            <FileDown size={16} />
            Exportar PDF
          </button>
        </div>

        {/* ── Period tabs + date navigation ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Period selector */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden self-start">
            {(['day', 'week', 'month'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-2 self-start">
            <button
              onClick={() => setRefDate(d => navigate(period, d, -1))}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white min-w-[160px] justify-center">
              <Calendar size={14} className="text-slate-400 flex-none" />
              <span className="text-sm text-slate-700 font-medium capitalize truncate">{periodLabel}</span>
            </div>

            <button
              onClick={() => setRefDate(d => navigate(period, d, 1))}
              disabled={isToday && period === 'day'}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>

            {refDate !== todayStr() && (
              <button
                onClick={() => setRefDate(todayStr())}
                className="text-xs text-primary-600 hover:underline px-2"
              >
                Hoy
              </button>
            )}
          </div>

          {isLoading && (
            <span className="text-xs text-slate-400 animate-pulse">Cargando…</span>
          )}
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
          <KPICard
            title="Ingresos"
            value={fmt(overview?.revenue ?? 0)}
            icon={DollarSign}
            color="bg-emerald-100 text-emerald-600"
            change={revenueChange}
          />
          <KPICard
            title="Pedidos"
            value={String(overview?.orders ?? 0)}
            icon={ShoppingCart}
            color="bg-blue-100 text-blue-600"
            change={ordersChange}
          />
          <KPICard
            title="Ticket Promedio"
            value={fmt(overview?.avgTicket ?? 0)}
            icon={Receipt}
            color="bg-purple-100 text-purple-600"
          />
          <KPICard
            title="IVA Recaudado"
            value={fmt(overview?.tax ?? 0)}
            icon={Percent}
            color="bg-amber-100 text-amber-600"
          />
          <KPICard
            title="Descuentos"
            value={fmt(overview?.discount ?? 0)}
            icon={TrendingDown}
            color="bg-red-100 text-red-500"
          />
          <KPICard
            title="Propinas"
            value={fmt(overview?.totalTips ?? 0)}
            icon={HandCoins}
            color="bg-teal-100 text-teal-600"
          />
          <KPICard
            title="Ingresos Netos"
            value={fmt((overview?.revenue ?? 0) - (overview?.tax ?? 0))}
            icon={TrendingUp}
            color="bg-primary-100 text-primary-600"
          />
        </div>

        {/* ── Revenue Trend ──────────────────────────────────────────────────── */}
        <div className="card">
          <SectionTitle>
            {period === 'day' ? 'Ingresos por hora' : period === 'week' ? 'Ingresos por día' : 'Ingresos diarios del mes'}
          </SectionTitle>
          {trendData.length === 0 ? (
            <EmptyState text="Sin ventas registradas en este período" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false} axisLine={false} width={52}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone" dataKey="revenue" name="revenue"
                  stroke="#2563EB" strokeWidth={2}
                  fill="url(#colorRevenue)" dot={false} activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Top products + Payment methods ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top products */}
          <div className="card">
            <SectionTitle>Productos más vendidos</SectionTitle>
            {productsData.length === 0 ? (
              <EmptyState text="Sin ventas en este período" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  layout="vertical"
                  data={productsData}
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis
                    type="category" dataKey="name"
                    width={110} tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false} axisLine={false}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      name === 'revenue' ? [fmt(v), 'Ingresos'] : [v, 'Unidades']
                    }
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="revenue" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={16} name="revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Payment methods */}
          <div className="card">
            <SectionTitle>Métodos de pago</SectionTitle>
            {paymentMethods.length === 0 ? (
              <EmptyState text="Sin pagos en este período" />
            ) : (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={paymentMethods}
                      dataKey="total"
                      nameKey="method"
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={3}
                    >
                      {paymentMethods.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [fmt(v), 'Total']}
                      contentStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend with detail */}
                <div className="space-y-2">
                  {paymentMethods.map((p, i) => {
                    const share = totalPay > 0 ? (p.total / totalPay) * 100 : 0;
                    return (
                      <div key={p.method}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {PAYMENT_NAMES[p.method] || p.method}
                          </span>
                          <span className="text-slate-500 flex items-center gap-2">
                            {fmt(p.total)}
                            {p.totalTips > 0 && (
                              <span className="text-teal-600 font-medium">+{fmt(p.totalTips)} prop.</span>
                            )}
                            <span className="text-slate-400">({p.count})</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${share}%`, background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {paymentMethods.some(p => p.totalTips > 0) && (
                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-teal-700 font-medium flex items-center gap-1">
                        <HandCoins size={12} /> Total propinas
                      </span>
                      <span className="text-teal-700 font-semibold">
                        {fmt(paymentMethods.reduce((s, p) => s + (p.totalTips ?? 0), 0))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Hourly distribution (day view only) ────────────────────────────── */}
        {period === 'day' && (
          <div className="card">
            <SectionTitle>Distribución por hora del día</SectionTitle>
            {loadingHourly ? (
              <EmptyState text="Cargando…" />
            ) : hourly.every(h => h.revenue === 0) ? (
              <EmptyState text="Sin ventas hoy" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label" interval={2}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false} axisLine={false}
                  />
                  <YAxis
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false} axisLine={false} width={48}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      name === 'revenue' ? [fmt(v), 'Ingresos'] : [v, 'Pedidos']
                    }
                    contentStyle={{ fontSize: 11 }}
                  />
                  <Bar dataKey="revenue" fill="#10B981" radius={[3, 3, 0, 0]} barSize={14} name="revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ── Top products table ─────────────────────────────────────────────── */}
        {topProducts.length > 0 && (
          <div className="card overflow-hidden">
            <SectionTitle>Tabla de productos</SectionTitle>
            <div className="overflow-x-auto -mx-4 -mb-4 px-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="text-left py-2 pr-4 font-medium">#</th>
                    <th className="text-left py-2 pr-4 font-medium">Producto</th>
                    <th className="text-right py-2 pr-4 font-medium">Unidades</th>
                    <th className="text-right py-2 pr-4 font-medium">Pedidos</th>
                    <th className="text-right py-2 font-medium">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.productId} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-4 text-slate-400 text-xs">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-medium text-slate-800">{p.productName}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{p.qty}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-600">{p.orderCount}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">{fmt(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={4} className="py-2.5 pr-4 text-xs font-semibold text-slate-500 uppercase">Total</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      {fmt(topProducts.reduce((s, p) => s + p.revenue, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
