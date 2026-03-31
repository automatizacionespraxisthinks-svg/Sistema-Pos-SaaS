import { create } from 'zustand';

interface User { id: string; email: string; firstName: string; lastName: string; role: string; tenantId: string; }

interface AuthState {
  user: User | null; token: string | null; isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, token: null, isAuthenticated: false,
  init: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('pos_token');
    const raw = localStorage.getItem('pos_user');
    if (token && raw) {
      try { set({ user: JSON.parse(raw), token, isAuthenticated: true }); } catch {}
    }
  },
  setAuth: (user, token) => {
    localStorage.setItem('pos_token', token);
    localStorage.setItem('pos_tenant_id', user.tenantId || '');
    localStorage.setItem('pos_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_tenant_id');
    localStorage.removeItem('pos_user');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
