'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

const ROLE_ROUTES: Record<string, string[]> = {
    '/pos': ['admin', 'super_admin', 'cashier', 'waiter'],
    '/orders': ['admin', 'super_admin', 'cashier', 'waiter', 'viewer'],
    '/kitchen': ['admin', 'super_admin', 'kitchen'],
    '/inventory': ['admin', 'super_admin', 'viewer'],
    '/products': ['admin', 'super_admin'],
    '/dashboard': ['admin', 'super_admin', 'viewer'],
    '/analytics': ['admin', 'super_admin', 'viewer'],
    '/propinas':    ['waiter', 'admin', 'super_admin'],
    '/caja':        ['admin', 'super_admin', 'cashier'],
    '/caja/cierre': ['admin', 'super_admin'],
    '/admin':       ['admin', 'super_admin'],
};

export function useRoleGuard(path: string) {
    const { user, isAuthenticated, init } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('pos_token');
        if (!token) { router.push('/login'); return; }

        if (user) {
            const allowed = ROLE_ROUTES[path] || [];
            if (!allowed.includes(user.role)) {
                // Redirect to first allowed route for this role
                const first = Object.entries(ROLE_ROUTES).find(([, roles]) => roles.includes(user.role));
                router.push(first ? first[0] : '/login');
            }
        }
    }, [user, path]);
}