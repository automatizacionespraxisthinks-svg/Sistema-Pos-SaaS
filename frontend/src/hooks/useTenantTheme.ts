'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '@/lib/api';
import { applyPrimaryColor } from '@/lib/themeUtils';
import { useAuthStore } from '@/store/auth.store';

export interface TenantBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
}

const DEFAULTS: TenantBranding = {
  name:         'Sistema POS',
  logoUrl:      null,
  primaryColor: null,
  phone:        null,
  address:      null,
  taxId:        null,
};

/**
 * Fetches the current tenant's branding once per session,
 * applies the primary color as CSS variables on <html> so every
 * Tailwind `primary-*` class reflects the custom color instantly.
 */
export function useTenantTheme(): TenantBranding {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const { data } = useQuery({
    queryKey: ['tenant-theme'],
    queryFn:  () => tenantApi.get().then(r => r.data),
    enabled:  isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 min — changes after saving in admin
    gcTime:    30 * 60 * 1000,
  });

  useEffect(() => {
    if (data?.primaryColor) applyPrimaryColor(data.primaryColor);
  }, [data?.primaryColor]);

  if (!data) return DEFAULTS;
  return {
    name:         data.name         || DEFAULTS.name,
    logoUrl:      data.logoUrl      || null,
    primaryColor: data.primaryColor || null,
    phone:        data.phone        || null,
    address:      data.address      || null,
    taxId:        data.taxId        || null,
  };
}
