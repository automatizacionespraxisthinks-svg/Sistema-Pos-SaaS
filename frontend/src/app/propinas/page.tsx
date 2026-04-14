'use client';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { paymentsApi, fmt } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Coins, TrendingUp } from 'lucide-react';

export default function PropinasPage() {
  useRoleGuard('/propinas');

  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['my-tips'],
    queryFn: () => paymentsApi.getMyTips().then(r => r.data),
    refetchInterval: 30_000,  // actualiza cada 30s
    staleTime: 0,
  });

  const totalTips = Number(data?.totalTips ?? 0);
  const count     = Number(data?.count     ?? 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis propinas</h1>
          <p className="text-slate-500 text-sm">
            {user?.firstName} {user?.lastName} · Hoy {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {isLoading ? (
          <p className="text-center py-16 text-slate-400">Cargando...</p>
        ) : (
          <>
            {/* Total del día */}
            <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-center py-10 space-y-2">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mx-auto">
                <Coins size={32} className="text-white" />
              </div>
              <p className="text-emerald-100 text-sm font-medium">Total propinas hoy</p>
              <p className="text-4xl font-bold">{fmt(totalTips)}</p>
              <p className="text-emerald-200 text-sm">{count} mesa{count !== 1 ? 's' : ''} te dejaron propina</p>
            </div>

            {/* Info */}
            {totalTips === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <Coins size={40} className="mx-auto opacity-30" />
                <p className="font-medium">Sin propinas registradas hoy</p>
                <p className="text-sm">Las propinas aparecen aquí cuando el cajero procesa un pago de tu mesa</p>
              </div>
            ) : (
              <div className="card flex items-center gap-4 bg-emerald-50 border border-emerald-200">
                <TrendingUp size={24} className="text-emerald-600 flex-none" />
                <div>
                  <p className="font-semibold text-slate-800">¡Excelente trabajo!</p>
                  <p className="text-sm text-slate-500">
                    Promedio por mesa: <strong className="text-emerald-700">{fmt(count > 0 ? totalTips / count : 0)}</strong>
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center">
              Se actualiza automáticamente cada 30 segundos
            </p>
          </>
        )}
      </div>
    </AppLayout>
  );
}
