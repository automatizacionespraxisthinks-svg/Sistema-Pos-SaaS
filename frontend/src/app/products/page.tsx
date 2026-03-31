'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { productsApi, categoriesApi, fmt } from '@/lib/api';
import toast from 'react-hot-toast';

const EMPTY = { name: '', description: '', price: '', costPrice: '', sku: '', categoryId: '', status: 'active' };

export default function ProductsPage() {
  useRoleGuard('/products');
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);

  const { data: pd } = useQuery({
    queryKey: ['products-admin'],
    queryFn: () => productsApi.list({ limit: 200 }).then(r => r.data),
  });
  const { data: cats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then(r => r.data),
  });
  const products = (pd as any)?.data ?? [];

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, price: Number(form.price), costPrice: Number(form.costPrice) || undefined };
      return editing ? productsApi.update(editing, payload) : productsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      setModal(false); setForm(EMPTY); setEditing(null);
      qc.invalidateQueries({ queryKey: ['products-admin'] });
      qc.invalidateQueries({ queryKey: ['products-pos'] });
    },
    onError: () => toast.error('Error al guardar'),
  });

  const del = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => { toast.success('Eliminado'); qc.invalidateQueries({ queryKey: ['products-admin'] }); },
  });

  const openEdit = (p: any) => {
    setForm({ name: p.name, description: p.description || '', price: p.price, costPrice: p.costPrice || '', sku: p.sku || '', categoryId: p.categoryId || '', status: p.status });
    setEditing(p.id); setModal(true);
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">Productos</h1>
          <button onClick={() => { setForm(EMPTY); setEditing(null); setModal(true); }} className="btn-primary text-sm">
            + Nuevo producto
          </button>
        </div>
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Producto','Categoría','Precio','Costo','SKU','Estado',''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(products as any[]).length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Sin productos. ¡Crea el primero!</td></tr>
              )}
              {(products as any[]).map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-primary-600 font-semibold">{fmt(Number(p.price))}</td>
                  <td className="px-4 py-3 text-slate-500">{p.costPrice ? fmt(Number(p.costPrice)) : '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.sku || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {p.status === 'active' ? 'Activo' : p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-xs text-primary-600 hover:underline">Editar</button>
                      <button onClick={() => { if (confirm('¿Eliminar?')) del.mutate(p.id); }} className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {modal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-screen overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs font-medium text-slate-600">Nombre *</label>
                  <input className="input mt-1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="col-span-2"><label className="text-xs font-medium text-slate-600">Descripción</label>
                  <textarea className="input mt-1" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Precio venta *</label>
                  <input type="number" className="input mt-1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Costo</label>
                  <input type="number" className="input mt-1" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">SKU</label>
                  <input className="input mt-1" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Categoría</label>
                  <select className="input mt-1" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">Sin categoría</option>
                    {(cats as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                <div className="col-span-2"><label className="text-xs font-medium text-slate-600">Estado</label>
                  <select className="input mt-1" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="out_of_stock">Sin stock</option>
                  </select></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setModal(false)} className="flex-1 btn-outline">Cancelar</button>
                <button onClick={() => save.mutate()} disabled={save.isPending} className="flex-1 btn-primary">
                  {save.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}