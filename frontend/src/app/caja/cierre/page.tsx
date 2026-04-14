'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { cashShiftApi, fmt } from '@/lib/api';
import { useTenantTheme } from '@/hooks/useTenantTheme';
import { BarChart3, Printer, Clock, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CierreDiaPage() {
  useRoleGuard('/caja/cierre');
  const tenant = useTenantTheme();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['cash-summary', date],
    queryFn: () => cashShiftApi.getSummary(date).then(r => r.data),
    staleTime: 30_000,
  });

  function printSummary() {
    if (!summary) return;
    const win = window.open('', '_blank', 'width=480,height=700');
    if (!win) return;

    const shiftRows = (summary.shifts ?? []).map((s: any) => `
      <tr>
        <td>${s.cashierName}</td>
        <td>${new Date(s.openedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${s.closedAt ? new Date(s.closedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
        <td class="right">${fmt(Number(s.initialCash))}</td>
        <td class="right">${fmt(Number(s.cashSales))}</td>
        <td class="right">${fmt(Number(s.cardSales))}</td>
        <td class="right">${fmt(Number(s.totalTips))}</td>
        <td class="right ${s.discrepancy == null ? '' : Number(s.discrepancy) < 0 ? 'neg' : Number(s.discrepancy) > 0 ? 'pos' : ''}">
          ${s.discrepancy != null ? fmt(Number(s.discrepancy)) : '—'}
        </td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Cierre del día ${date}</title>
    <style>
      body { font-family: monospace; font-size: 11px; max-width: 720px; margin: 0 auto; padding: 12px; }
      h1 { font-size: 16px; text-align: center; } h2 { font-size: 13px; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0; }
      th, td { border: 1px solid #ccc; padding: 4px 6px; }
      th { background: #f0f0f0; font-weight: bold; }
      .right { text-align: right; }
      .neg { color: red; font-weight: bold; }
      .pos { color: blue; font-weight: bold; }
      .total { background: #f8f8f8; font-weight: bold; }
      @media print { button { display: none; } }
    </style></head><body>
    <h1>${tenant.name || 'POS SaaS'} — Cierre del día</h1>
    <p style="text-align:center;color:#555">${new Date(date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <hr/>
    <h2>Detalle por cajero</h2>
    <table>
      <thead><tr><th>Cajero</th><th>Apertura</th><th>Cierre</th><th class="right">Base</th><th class="right">Efectivo</th><th class="right">Tarjeta</th><th class="right">Propinas</th><th class="right">Descuadre</th></tr></thead>
      <tbody>${shiftRows}</tbody>
    </table>
    <h2>Consolidado del día</h2>
    <table>
      <tbody>
        <tr><td>💵 Total efectivo (ventas)</td><td class="right"><strong>${fmt(summary.totals?.cashSales ?? 0)}</strong></td></tr>
        <tr><td>💳 Total tarjeta</td><td class="right"><strong>${fmt(summary.totals?.cardSales ?? 0)}</strong></td></tr>
        <tr><td>🏦 Total transferencias</td><td class="right"><strong>${fmt(summary.totals?.transferSales ?? 0)}</strong></td></tr>
        <tr><td>🪙 Total propinas</td><td class="right"><strong>${fmt(summary.totals?.totalTips ?? 0)}</strong></td></tr>
        <tr class="total"><td>TOTAL GENERAL</td><td class="right">${fmt((summary.totals?.cashSales ?? 0) + (summary.totals?.cardSales ?? 0) + (summary.totals?.transferSales ?? 0))}</td></tr>
        <tr><td>Efectivo esperado</td><td class="right">${fmt(summary.totals?.totalExpected ?? 0)}</td></tr>
        <tr><td>Efectivo declarado</td><td class="right">${fmt(summary.totals?.totalCounted ?? 0)}</td></tr>
        <tr class="total ${Number(summary.totals?.totalDiscrepancy) < 0 ? 'neg' : ''}">
          <td>DESCUADRE GLOBAL</td>
          <td class="right">${fmt(summary.totals?.totalDiscrepancy ?? 0)}</td>
        </tr>
      </tbody>
    </table>
    <p style="text-align:center;font-size:10px;color:#888;margin-top:16px">
      Generado el ${new Date().toLocaleString('es-CO')}
    </p>
    <script>window.onload = () => { window.print(); }</script>
    </body></html>`;

    win.document.write(html);
    win.document.close();
  }

  const t = summary?.totals ?? {};
  const totalGeneral = (Number(t.cashSales) || 0) + (Number(t.cardSales) || 0) + (Number(t.transferSales) || 0);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cierre de día</h1>
            <p className="text-slate-500 text-sm">Resumen consolidado por cajero</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              className="input text-sm"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            {summary && (
              <button
                onClick={printSummary}
                className="flex items-center gap-2 btn-primary text-sm">
                <Printer size={15} />Imprimir
              </button>
            )}
          </div>
        </div>

        {isLoading && <p className="text-center py-20 text-slate-400">Cargando...</p>}

        {summary?.hasOpen && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            <AlertCircle size={18} className="flex-none text-amber-500" />
            <p><strong>Hay turnos aún abiertos.</strong> El cierre de día no es definitivo hasta que todos los cajeros cierren su turno.</p>
          </div>
        )}

        {summary && !isLoading && (
          <>
            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '💵 Efectivo',       value: t.cashSales,     color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                { label: '💳 Tarjeta',         value: t.cardSales,     color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { label: '🪙 Propinas',        value: t.totalTips,     color: 'bg-amber-50 border-amber-200 text-amber-700' },
                { label: '📊 Total ventas',    value: totalGeneral,    color: 'bg-primary-50 border-primary-200 text-primary-700' },
              ].map(c => (
                <div key={c.label} className={`card border-2 ${c.color} p-4`}>
                  <p className="text-xs font-medium mb-1">{c.label}</p>
                  <p className="text-xl font-bold">{fmt(Number(c.value) || 0)}</p>
                </div>
              ))}
            </div>

            {/* Descuadre global */}
            {(summary.shifts ?? []).some((s: any) => s.status === 'closed') && (
              <div className={`rounded-xl p-4 border-2 flex items-center justify-between ${
                Math.abs(Number(t.totalDiscrepancy)) < 1
                  ? 'bg-emerald-50 border-emerald-300'
                  : Number(t.totalDiscrepancy) < 0
                    ? 'bg-red-50 border-red-300'
                    : 'bg-blue-50 border-blue-300'
              }`}>
                <div className="flex items-center gap-3">
                  {Math.abs(Number(t.totalDiscrepancy)) < 1
                    ? <CheckCircle size={22} className="text-emerald-600" />
                    : <AlertCircle size={22} className="text-red-500" />
                  }
                  <div>
                    <p className="font-bold text-slate-900">Descuadre global en efectivo</p>
                    <p className="text-sm text-slate-500">
                      Esperado: {fmt(Number(t.totalExpected) || 0)} · Declarado: {fmt(Number(t.totalCounted) || 0)}
                    </p>
                  </div>
                </div>
                <p className={`text-xl font-bold ${
                  Math.abs(Number(t.totalDiscrepancy)) < 1 ? 'text-emerald-700' :
                  Number(t.totalDiscrepancy) < 0 ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {Math.abs(Number(t.totalDiscrepancy)) < 1 ? '✓ Cuadra' : fmt(Number(t.totalDiscrepancy))}
                </p>
              </div>
            )}

            {/* Tabla por cajero */}
            <div className="card overflow-hidden p-0">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <BarChart3 size={16} className="text-slate-500" />
                <h2 className="font-bold text-slate-800 text-sm">Detalle por cajero ({(summary.shifts ?? []).length} turnos)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Cajero','Apertura','Cierre','Base','💵 Efectivo','💳 Tarjeta','🪙 Propinas','Esperado','Declarado','Descuadre'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(summary.shifts ?? []).length === 0 && (
                      <tr><td colSpan={10} className="text-center py-12 text-slate-400">No hay turnos para esta fecha</td></tr>
                    )}
                    {(summary.shifts ?? []).map((s: any) => {
                      const expected = Number(s.initialCash) + Number(s.cashSales);
                      const disc = Number(s.discrepancy);
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{s.cashierName}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            <Clock size={12} className="inline mr-1" />
                            {new Date(s.openedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {s.closedAt
                              ? new Date(s.closedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                              : <span className="badge bg-amber-100 text-amber-700 text-xs">Abierto</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-slate-500">{fmt(Number(s.initialCash))}</td>
                          <td className="px-4 py-3 font-medium text-emerald-700">{fmt(Number(s.cashSales))}</td>
                          <td className="px-4 py-3 font-medium text-blue-700">{fmt(Number(s.cardSales))}</td>
                          <td className="px-4 py-3 font-medium text-amber-700">{fmt(Number(s.totalTips))}</td>
                          <td className="px-4 py-3 text-slate-600">{fmt(expected)}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {s.countedCash != null ? fmt(Number(s.countedCash)) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {s.discrepancy != null ? (
                              <span className={`font-semibold ${
                                Math.abs(disc) < 1 ? 'text-emerald-600' :
                                disc < 0 ? 'text-red-600' : 'text-blue-600'
                              }`}>
                                {Math.abs(disc) < 1 ? '✓' : fmt(disc)}
                              </span>
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
