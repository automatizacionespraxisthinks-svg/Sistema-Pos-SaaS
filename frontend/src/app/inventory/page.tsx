'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { inventoryApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  useRoleGuard('/inventory');
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ productId: '', productName: '', quantity: '', type: 'in', reason: '' });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list().then(r => r.data),
  });
  const { data: lowStock = [] } = useQuery({
    queryKey: ['inventory-low'],
    queryFn: () => inventoryApi.getLowStock().then(r => r.data),
  });

  const adjust = useMutation({
    mutationFn: () => inventoryApi.adjust({ ...form, quantity: Number(form.quantity) }),
    onSuccess: () => {
      toast.success('Inventario actualizado');
      setShowModal(false);
      setForm({ productId: '', productName: '', quantity: '', type: 'in', reason: '' });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: () => toast.error('Error al ajustar inventario'),
  });

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">Inventario</h1>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ Ajustar stock</button>
        </div>
        {(lowStock as any[]).length > 0 && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="font-semibold text-amber-800 mb-2">⚠️ Stock bajo ({(lowStock as any[]).length} productos)</p>
            <div className="flex flex-wrap gap-2">
              {(lowStock as any[]).map((i: any) => (
                <span key={i.id} className="badge bg-amber-100 text-amber-700">{i.productName}: {i.quantity} {i.unit || 'u'}</span>
              ))}
            </div>
          </div>
        )}
        {isLoading ? <p className="text-center py-20 text-slate-400">Cargando...</p> : (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Producto','Stock actual','Stock mín.','Unidad','Estado'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(items as any[]).length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-400">Sin registros de inventario. Usa "Ajustar stock" para agregar.</td></tr>}
                {(items as any[]).map((item: any) => {
                  const low = Number(item.quantity) <= Number(item.minStock);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{item.productName}</td>
                      <td className={`px-4 py-3 font-bold ${low ? 'text-red-600' : 'text-green-600'}`}>{item.quantity}</td>
                      <td className="px-4 py-3 text-slate-500">{item.minStock}</td>
                      <td className="px-4 py-3 text-slate-500">{item.unit || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${low ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {low ? 'Bajo stock' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="text-lg font-bold mb-4">Ajustar inventario</h2>
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-slate-600">ID del producto</label>
                  <input className="input mt-1" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Nombre del producto</label>
                  <input className="input mt-1" value={form.productName} onChange={e => setForm({ ...form, productName: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Cantidad</label>
                  <input type="number" className="input mt-1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Tipo</label>
                  <select className="input mt-1" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="in">Entrada (+)</option>
                    <option value="out">Salida (-)</option>
                    <option value="adjustment">Ajuste</option>
                    <option value="waste">Merma</option>
                  </select></div>
                <div><label className="text-xs font-medium text-slate-600">Motivo (opcional)</label>
                  <input className="input mt-1" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowModal(false)} className="flex-1 btn-outline">Cancelar</button>
                <button onClick={() => adjust.mutate()} disabled={adjust.isPending} className="flex-1 btn-primary">
                  {adjust.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}