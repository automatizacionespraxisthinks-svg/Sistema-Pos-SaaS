'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Public registration is disabled. Tenants are created by the system administrator.
export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, []);
  return null;
}
