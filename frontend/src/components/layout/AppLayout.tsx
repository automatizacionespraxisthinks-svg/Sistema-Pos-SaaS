'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import InstallPWA from '@/components/pwa/InstallPWA';
import TopLoader from '@/components/ui/TopLoader';
import { useAuthStore } from '@/store/auth.store';
import { useTenantTheme } from '@/hooks/useTenantTheme';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, init } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tenant = useTenantTheme();

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('pos_token')) {
      router.push('/login');
    }
  }, [isAuthenticated]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <TopLoader />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} tenant={tenant} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-none">
          <button onClick={() => setSidebarOpen(true)}
            className="text-slate-600 hover:text-slate-900 p-1">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name}
                className="w-7 h-7 rounded-lg object-contain bg-white border border-slate-200" />
            ) : (
              <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-slate-900 text-sm">{tenant.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto relative">
          {/* Marca de agua — logo del tenant en escala de grises */}
          {tenant.logoUrl && (
            <div
              aria-hidden="true"
              className="fixed inset-0 lg:left-64 flex items-center justify-center pointer-events-none select-none overflow-hidden"
              style={{ zIndex: 0 }}>
              <img
                src={tenant.logoUrl}
                alt=""
                className="w-80 h-80 object-contain"
                style={{ filter: 'grayscale(100%)', opacity: 0.055 }}
              />
            </div>
          )}
          <div className="relative" style={{ zIndex: 1 }}>{children}</div>
        </main>
        <InstallPWA />
      </div>
    </div>
  );
}