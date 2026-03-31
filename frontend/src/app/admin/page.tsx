'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '@/lib/api';
import { Package, Boxes, BarChart3, Settings, Tag, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const sections = [
  { href: '/products',  label: 'Productos',    desc: 'Gestionar catálogo y precios',    icon: Package,  color: 'bg-blue-100 text-blue-600' },
  { href: '/inventory', label: 'Inventario',   desc: 'Control de stock y movimientos',  icon: Boxes,    color: 'bg-green-100 text-green-600' },
  { href: '/dashboard', label: 'Reportes',     desc: 'Métricas y análisis de ventas',   icon: BarChart3, color: 'bg-purple-100 text-purple-600' },
];

export default function AdminPage() {
  useRoleGuard('/admin');
  const qc = useQueryClient();
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#3B82F6');

  const { data: cats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then(r => r.data),
  });

  const createCat = useMutation({
    mutationFn: () => categoriesApi.create({ name: catName, color: catColor }),
    onSuccess: () => { toast.success('Categoría creada'); setCatName(''); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: () => toast.error('Error al crear categoría'),
  });

  const delCat = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => { toast.success('Categoría eliminada'); qc.invalidateQueries({ queryKey: ['categories'] }); },
    onError: () => toast.error('Error al eliminar'),
  });

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Administración</h1>
        <p className="text-slate-500 text-sm mb-6">Configuración y gestión del negocio</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {sections.map(({ href, label, desc, icon: Icon, color }) => (
            <Link key={label} href={href}
              className="card hover:shadow-md transition-all hover:border-primary-600 group flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-none ${color}`}><Icon size={22} /></div>
              <div>
                <p className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">{label}</p>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Categories management */}
        <div className="card">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Tag size={18} />Categorías</h2>
          <div className="flex gap-3 mb-4">
            <input className="input flex-1" placeholder="Nombre de la categoría"
              value={catName} onChange={e => setCatName(e.target.value)} />
            <input type="color" className="h-10 w-10 rounded-lg border border-slate-300 cursor-pointer"
              value={catColor} onChange={e => setCatColor(e.target.value)} />
            <button onClick={() => createCat.mutate()} disabled={!catName || createCat.isPending} className="btn-primary px-4">
              Agregar
            </button>
          </div>
          <div className="space-y-2">
            {(cats as any[]).length === 0 && <p className="text-slate-400 text-sm">Sin categorías. Crea la primera.</p>}
            {(cats as any[]).map((cat: any) => (
              <div key={cat.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full flex-none" style={{ backgroundColor: cat.color || '#94a3b8' }} />
                  <span className="text-sm font-medium">{cat.name}</span>
                </div>
                <button onClick={() => { if (confirm(`¿Eliminar "${cat.name}"?`)) delCat.mutate(cat.id); }}
                  className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}