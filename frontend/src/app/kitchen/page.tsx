'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { kitchenApi } from '@/lib/api';
import { ChefHat, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS: Record<string, string> = {
  pending: 'bg-amber-50 border-amber-300', in_progress: 'bg-blue-50 border-blue-300', ready: 'bg-green-50 border-green-300',
};
const LABELS: Record<string, string> = {
  pending: '⏳ Pendiente', in_progress: '👨‍🍳 Preparando', ready: '✅ Listo',
};
const NEXT: Record<string, { status: string; label: string }> = {
  pending: { status: 'in_progress', label: '▶ Iniciar' },
  in_progress: { status: 'ready', label: '✅ Marcar listo' },
};

export default function KitchenPage() {
  useRoleGuard('/kitchen');
  const qc = useQueryClient();
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['kitchen'],
    queryFn: () => kitchenApi.getActive().then(r => r.data),
    refetchInterval: 5000,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => kitchenApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Estado actualizado'); qc.invalidateQueries({ queryKey: ['kitchen'] }); },
  });

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <ChefHat size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pantalla de Cocina (KDS)</h1>
            <p className="text-slate-500 text-sm">Actualización automática cada 5s</p>
          </div>
          <span className="ml-auto badge bg-primary-100 text-primary-700 border border-primary-200">
            {(tickets as any[]).length} activos
          </span>
        </div>
        {isLoading && <p className="text-center py-20 text-slate-400">Cargando...</p>}
        {!isLoading && (tickets as any[]).length === 0 && (
          <div className="text-center py-24 text-slate-400">
            <ChefHat size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Sin pedidos pendientes</p>
            <p className="text-sm">Los nuevos pedidos aparecerán aquí automáticamente</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(tickets as any[]).map((t: any) => (
            <div key={t.id} className={`rounded-xl border-2 p-4 ${COLORS[t.status] || 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-base">{t.orderNumber}</p>
                  {t.tableNumber && <p className="text-sm opacity-70">Mesa {t.tableNumber}</p>}
                </div>
                <p className="text-xs opacity-60 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(t.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="space-y-1.5 mb-4">
                {t.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-white bg-opacity-70 rounded-full text-xs font-bold flex items-center justify-center flex-none">{item.quantity}</span>
                    <span className="text-sm font-medium">{item.productName}</span>
                  </div>
                ))}
                {t.notes && <p className="text-xs italic opacity-70 mt-2 pt-2 border-t border-current border-opacity-20">📝 {t.notes}</p>}
              </div>
              <p className="text-xs font-semibold mb-3">{LABELS[t.status]}</p>
              {NEXT[t.status] && (
                <button onClick={() => update.mutate({ id: t.id, status: NEXT[t.status].status })}
                  disabled={update.isPending}
                  className="w-full bg-white bg-opacity-70 hover:bg-opacity-100 rounded-lg py-2 text-sm font-semibold transition-all">
                  {NEXT[t.status].label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}