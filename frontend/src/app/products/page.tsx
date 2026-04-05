'use client';
import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { productsApi, categoriesApi, fmt } from '@/lib/api';
import { ImagePlus, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY = {
  name: '', description: '', price: '', costPrice: '',
  sku: '', categoryId: '', status: 'active', imageUrl: '',
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ProductThumb({ src, alt }: { src?: string; alt: string }) {
  if (src) {
    return (
      <img src={src} alt={alt}
        className="w-10 h-10 object-cover rounded-lg flex-none border border-slate-100"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  const emoji = (() => {
    const n = alt.toLowerCase();
    if (n.includes('beb') || n.includes('café') || n.includes('jugo')) return '☕';
    if (n.includes('postre') || n.includes('torta') || n.includes('helado')) return '🍰';
    if (n.includes('ensalada') || n.includes('entrada')) return '🥗';
    return '🍽️';
  })();
  return (
    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg flex-none">
      {emoji}
    </div>
  );
}

export default function ProductsPage() {
  useRoleGuard('/products');
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState<any>(EMPTY);
  const [editing,    setEditing]    = useState<string | null>(null);
  const [preview,    setPreview]    = useState('');
  const [imgLoading, setImgLoading] = useState(false);

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
      const payload = {
        ...form,
        price:     Number(form.price),
        costPrice: Number(form.costPrice) || undefined,
        imageUrl:  form.imageUrl || undefined,
      };
      return editing ? productsApi.update(editing, payload) : productsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      closeModal();
      qc.invalidateQueries({ queryKey: ['products-admin'] });
      qc.invalidateQueries({ queryKey: ['products-pos'] });
    },
    onError: () => toast.error('Error al guardar'),
  });

  const del = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      toast.success('Eliminado');
      qc.invalidateQueries({ queryKey: ['products-admin'] });
    },
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagen menor a 2MB'); return; }
    setImgLoading(true);
    try {
      const b64 = await fileToBase64(file);
      setPreview(b64);
      setForm((f: any) => ({ ...f, imageUrl: b64 }));
    } catch { toast.error('Error al cargar imagen'); }
    finally { setImgLoading(false); }
  }

  function clearImage() {
    setPreview('');
    setForm((f: any) => ({ ...f, imageUrl: '' }));
    if (fileRef.current) fileRef.current.value = '';
  }

  function openNew() {
    setForm(EMPTY); setEditing(null); setPreview(''); setModal(true);
  }

  function openEdit(p: any) {
    setForm({
      name: p.name, description: p.description || '',
      price: p.price, costPrice: p.costPrice || '',
      sku: p.sku || '', categoryId: p.categoryId || '',
      status: p.status, imageUrl: p.imageUrl || '',
    });
    setPreview(p.imageUrl || '');
    setEditing(p.id);
    setModal(true);
  }

  function closeModal() {
    setModal(false); setForm(EMPTY); setEditing(null); setPreview('');
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900">Productos</h1>
          <button onClick={openNew} className="btn-primary text-sm">+ Nuevo producto</button>
        </div>

        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Img', 'Producto', 'Categoría', 'Precio', 'Costo', 'SKU', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">Sin productos. ¡Crea el primero!</td></tr>
              )}
              {products.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <ProductThumb src={p.imageUrl} alt={p.name} />
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.category?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-primary-600 font-semibold">{fmt(Number(p.price))}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.costPrice ? fmt(Number(p.costPrice)) : '—'}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.sku || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {p.status === 'active' ? 'Activo' : p.status === 'inactive' ? 'Inactivo' : 'Sin stock'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(p)} className="text-xs text-primary-600 hover:underline font-medium">Editar</button>
                      <button onClick={() => { if (confirm('¿Eliminar?')) del.mutate(p.id); }}
                        className="text-xs text-red-500 hover:underline font-medium">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── MODAL ──────────────────────────────────────────────────────────── */}
        {modal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">

              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-none">
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? 'Editar producto' : 'Nuevo producto'}
                </h2>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* Image upload */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-2 block">Imagen del producto</label>
                  <div className="flex items-start gap-4">

                    {/* Preview box */}
                    <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center flex-none bg-slate-50 overflow-hidden">
                      {preview ? (
                        <>
                          <img src={preview} alt="preview" className="w-full h-full object-cover" />
                          <button onClick={clearImage}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm">
                            <X size={10} />
                          </button>
                        </>
                      ) : (
                        <div className="text-center text-slate-400">
                          <ImagePlus size={22} className="mx-auto mb-1 opacity-60" />
                          <span className="text-[9px] font-medium">Sin imagen</span>
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex-1 space-y-2">
                      <button type="button" onClick={() => fileRef.current?.click()}
                        disabled={imgLoading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors">
                        <Upload size={15} />
                        {imgLoading ? 'Procesando...' : 'Subir imagen (máx. 2 MB)'}
                      </button>
                      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />

                      <div className="flex items-center gap-2 text-slate-300">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs text-slate-400">o URL</span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>

                      <input className="input text-sm" placeholder="https://..."
                        value={form.imageUrl?.startsWith('data:') ? '' : (form.imageUrl || '')}
                        onChange={e => {
                          const url = e.target.value;
                          setPreview(url);
                          setForm((f: any) => ({ ...f, imageUrl: url }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Fields */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Nombre *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Descripción</label>
                  <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Precio venta *</label>
                    <input type="number" className="input" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Costo</label>
                    <input type="number" className="input" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">SKU</label>
                    <input className="input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Categoría</label>
                    <select className="input" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                      <option value="">Sin categoría</option>
                      {(cats as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Estado</label>
                  <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="out_of_stock">Sin stock</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-none">
                <button onClick={closeModal} className="flex-1 btn-outline py-2.5">Cancelar</button>
                <button onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.price}
                  className="flex-1 btn-primary py-2.5 disabled:opacity-50">
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
