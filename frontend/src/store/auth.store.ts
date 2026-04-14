import { create } from 'zustand';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; tenantId: string; }

interface AuthState {
  user: User | null; token: string | null; tenantSlug: string | null; isAuthenticated: boolean;
  setAuth: (user: User, token: string, slug: string) => void;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, token: null, tenantSlug: null, isAuthenticated: false,
  init: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('pos_token');
    const raw   = localStorage.getItem('pos_user');
    const slug  = localStorage.getItem('pos_tenant_slug') || '';
    if (token && raw) {
      try { set({ user: JSON.parse(raw), token, tenantSlug: slug, isAuthenticated: true }); } catch {}
    }
  },
  setAuth: (user, token, slug) => {
    localStorage.setItem('pos_token', token);
    localStorage.setItem('pos_tenant_id', user.tenantId || '');
    localStorage.setItem('pos_tenant_slug', slug || '');
    localStorage.setItem('pos_user', JSON.stringify(user));
    set({ user, token, tenantSlug: slug, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_tenant_id');
    localStorage.removeItem('pos_tenant_slug');
    localStorage.removeItem('pos_user');
    set({ user: null, token: null, tenantSlug: null, isAuthenticated: false });
  },
}));
