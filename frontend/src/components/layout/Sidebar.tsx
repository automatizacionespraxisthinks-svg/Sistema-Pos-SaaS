'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
// (no local state needed)
import {
  ShoppingCart, Package, ClipboardList, ChefHat,
  BarChart3, LineChart, Settings, LogOut, Boxes, X, Landmark, BarChart2, Coins, ShieldCheck,
  LayoutGrid, BookOpen,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { TenantBranding } from '@/hooks/useTenantTheme';

const ALL_NAV = [
  { href: '/pos',         label: 'Punto de Venta', icon: ShoppingCart, roles: ['admin','super_admin','cashier','waiter'] },
  { href: '/mesas',       label: 'Mesas',           icon: LayoutGrid,   roles: ['admin','super_admin','cashier','waiter'] },
  { href: '/orders',      label: 'Pedidos',         icon: ClipboardList, roles: ['admin','super_admin','cashier','waiter','viewer'] },
  { href: '/caja',        label: 'Caja',            icon: Landmark,      roles: ['admin','super_admin','cashier'] },
  { href: '/caja/cierre', label: 'Cierre de día',   icon: BarChart2,     roles: ['admin','super_admin'] },
  { href: '/kitchen',     label: 'Cocina',          icon: ChefHat,       roles: ['admin','super_admin','kitchen'] },
  { href: '/propinas',    label: 'Mis propinas',    icon: Coins,         roles: ['waiter'] },
  { href: '/products',    label: 'Productos',       icon: Package,       roles: ['admin','super_admin'] },
  { href: '/recetas',     label: 'Recetas',         icon: BookOpen,      roles: ['admin','super_admin'] },
  { href: '/inventory',   label: 'Inventario',      icon: Boxes,         roles: ['admin','super_admin','viewer'] },
  { href: '/dashboard',   label: 'Dashboard',       icon: BarChart3,     roles: ['admin','super_admin','viewer'] },
  { href: '/analytics',   label: 'Analítica',       icon: LineChart,     roles: ['admin','super_admin','viewer'] },
  { href: '/audit',       label: 'Auditoría',       icon: ShieldCheck,   roles: ['admin','super_admin'] },
  { href: '/admin',       label: 'Administración',  icon: Settings,      roles: ['admin','super_admin'] },
];

interface Props {
  open: boolean;
  onClose: () => void;
  tenant: TenantBranding;
}

export default function Sidebar({ open, onClose, tenant }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  // Filter nav by role
  const role = user?.role || '';
  const nav = ALL_NAV.filter(item => item.roles.includes(role));

  const handleLogout = () => { logout(); router.push('/login'); };

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    onClose();
  };

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 text-white flex flex-col h-screen min-h-0
        transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="w-9 h-9 rounded-lg object-contain bg-white flex-none border border-slate-600"
              />
            ) : (
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center font-bold text-lg flex-none">
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold leading-tight truncate">{tenant.name}</p>
              <p className="text-slate-400 text-xs">Sistema POS</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto min-h-0 scrollbar-thin">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}>
                <Icon size={18} className="flex-none" />{label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-slate-700 space-y-1">
          {/* User info */}
          {user && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold flex-none">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-slate-400 capitalize">{user.role}</p>
              </div>
            </div>
          )}

          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all w-full">
            <LogOut size={16} className="flex-none" />Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}