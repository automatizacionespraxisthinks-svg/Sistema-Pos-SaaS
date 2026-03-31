'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import InstallPWA from '@/components/pwa/InstallPWA';
import { useAuthStore } from '@/store/auth.store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, init } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('pos_token')) {
      router.push('/login');
    }
  }, [isAuthenticated]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-none">
          <button onClick={() => setSidebarOpen(true)}
            className="text-slate-600 hover:text-slate-900 p-1">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">P</div>
            <span className="font-semibold text-slate-900 text-sm">POS SaaS</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
        <InstallPWA />
      </div>
    </div>
  );
}