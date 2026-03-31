'use client';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { ordersApi, paymentsApi, fmt } from '@/lib/api';
import { DollarSign, ShoppingCart, Clock, TrendingUp } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color, sub }: any) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-none ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  useRoleGuard('/dashboard');
  const { data: activeOrders = [] } = useQuery({
    queryKey: ['active-orders'],
    queryFn: () => ordersApi.getActive().then(r => r.data),
    refetchInterval: 15000,
  });
  const { data: summary = [] } = useQuery({
    queryKey: ['daily-summary'],
    queryFn: () => paymentsApi.getDailySummary().then(r => r.data),
  });

  const totalHoy = (summary as any[]).reduce((a, s) => a + Number(s.total || 0), 0);
  const totalTx = (summary as any[]).reduce((a, s) => a + Number(s.count || 0), 0);

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Ventas hoy" value={fmt(totalHoy)} icon={DollarSign} color="bg-green-100 text-green-600" sub="Pagos completados" />
          <StatCard title="Transacciones" value={totalTx} icon={ShoppingCart} color="bg-blue-100 text-blue-600" sub="Hoy" />
          <StatCard title="Pedidos activos" value={(activeOrders as any[]).length} icon={Clock} color="bg-amber-100 text-amber-600" sub="En proceso ahora" />
          <StatCard title="Ticket promedio" value={totalTx > 0 ? fmt(totalHoy / totalTx) : '$0'} icon={TrendingUp} color="bg-purple-100 text-purple-600" sub="Por transacción" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="font-bold text-slate-900 mb-4">Pedidos activos</h2>
            {(activeOrders as any[]).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Sin pedidos activos</p>
            ) : (
              <div className="space-y-2">
                {(activeOrders as any[]).slice(0, 8).map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-semibold">{o.orderNumber}</p>
                      <p className="text-xs text-slate-500">{o.items?.length} items{o.tableNumber ? ` · Mesa ${o.tableNumber}` : ''}</p>
                    </div>
                    <span className={`badge text-xs ${o.status === 'pending' ? 'bg-amber-100 text-amber-700' : o.status === 'preparing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h2 className="font-bold text-slate-900 mb-4">Ventas por método de pago</h2>
            {(summary as any[]).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Sin ventas registradas hoy</p>
            ) : (
              <div className="space-y-3">
                {(summary as any[]).map((s: any) => {
                  const pct = totalHoy > 0 ? (Number(s.total) / totalHoy) * 100 : 0;
                  const labels: Record<string, string> = { cash: '💵 Efectivo', card: '💳 Tarjeta', transfer: '🏦 Transferencia', mixed: '🔀 Mixto' };
                  return (
                    <div key={s.method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{labels[s.method] || s.method}</span>
                        <span className="text-slate-600">{fmt(Number(s.total))} <span className="text-slate-400">({s.count} ventas)</span></span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}