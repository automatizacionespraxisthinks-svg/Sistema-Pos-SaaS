'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { inventoryApi } from '@/lib/api';
import { Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

const UNITS = [
  'Unidades', 'Gramos', 'Kilogramos', 'Libras', 'Onzas',
  'Litros', 'Mililitros', 'Porciones', 'Docenas', 'Cajas', 'Bolsas',
];

const EMPTY_FORM = { productId: '', productName: '', quantity: '', type: 'in', reason: '', unit: 'Unidades' };

export default function InventoryPage() {
  useRoleGuard('/inventory');
  const qc = useQueryClient();
  const [tableSearch, setTableSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  // Unit search (searchable dropdown)
  const [unitSearch, setUnitSearch]   = useState('');
  const [showUnitDrop, setShowUnitDrop] = useState(false);
  const unitRef = useRef<HTMLDivElement>(null);
  const filteredUnits = UNITS.filter(u => u.toLowerCase().includes(unitSearch.toLowerCase()));

  // Close unit dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (unitRef.current && !unitRef.current.contains(e.target as Node)) {
        setShowUnitDrop(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      setForm(EMPTY_FORM);
      setUnitSearch('');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-low'] });
    },
    onError: () => toast.error('Error al ajustar inventario'),
  });

  function openModal() {
    setForm(EMPTY_FORM);
    setUnitSearch('');
    setShowUnitDrop(false);
    setShowModal(true);
  }

  // Filtro de tabla — activo desde 2 caracteres, busca en todas las columnas
  const filteredItems = tableSearch.trim().length >= 2
    ? (items as any[]).filter((i: any) => {
        const q = tableSearch.toLowerCase();
        const status = Number(i.quantity) <= Number(i.minStock) ? 'bajo stock' : 'ok';
        return (
          i.productName?.toLowerCase().includes(q) ||
          i.unit?.toLowerCase().includes(q) ||
          String(i.quantity).includes(q) ||
          String(i.minStock).includes(q) ||
          status.includes(q)
        );
      })
    : (items as any[]);

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-900">Inventario</h1>
          <button onClick={openModal} className="btn-primary text-sm">+ Ajustar stock</button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="input pl-9 text-sm"
            placeholder="Buscar por nombre, unidad, cantidad..."
            value={tableSearch}
            onChange={e => setTableSearch(e.target.value)}
          />
          {tableSearch && (
            <button onClick={() => setTableSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
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
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      {tableSearch.trim().length >= 2
                        ? `Sin resultados para "${tableSearch}"`
                        : 'Sin registros de inventario. Usa "Ajustar stock" para agregar.'}
                    </td>
                  </tr>
                )}
                {filteredItems.map((item: any) => {
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Ajustar inventario</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">

                {/* Nombre del ítem (texto libre — ingrediente, insumo, etc.) */}
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre del ítem / ingrediente *</label>
                  <input
                    className="input"
                    placeholder="Ej: Harina de trigo, Aceite, Tomate..."
                    value={form.productName}
                    onChange={e => setForm({ ...form, productName: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Puede ser un ingrediente, insumo o producto de bodega</p>
                </div>

                {/* Cantidad + Unidad (searchable) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Cantidad *</label>
                    <input type="number" className="input" placeholder="0"
                      value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                  </div>

                  {/* Unidad con búsqueda */}
                  <div ref={unitRef}>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Unidad</label>
                    <div className="relative">
                      <input
                        className="input pr-8"
                        placeholder="Buscar unidad..."
                        value={unitSearch || form.unit}
                        onFocus={() => { setUnitSearch(''); setShowUnitDrop(true); }}
                        onChange={e => { setUnitSearch(e.target.value); setShowUnitDrop(true); }}
                      />
                      <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      {showUnitDrop && filteredUnits.length > 0 && (
                        <div className="absolute z-10 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                          {filteredUnits.map(u => (
                            <button key={u} onMouseDown={() => {
                              setForm((f: any) => ({ ...f, unit: u }));
                              setUnitSearch('');
                              setShowUnitDrop(false);
                            }} className="w-full text-left px-3 py-2 hover:bg-primary-50 text-sm">
                              {u}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo de movimiento</label>
                  <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="in">Entrada (+)</option>
                    <option value="out">Salida (-)</option>
                    <option value="adjustment">Ajuste de inventario</option>
                    <option value="waste">Merma / Pérdida</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Motivo (opcional)</label>
                  <input className="input" placeholder="Ej: Compra a proveedor, Caducidad..."
                    value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowModal(false)} className="flex-1 btn-outline">Cancelar</button>
                <button
                  onClick={() => adjust.mutate()}
                  disabled={adjust.isPending || !form.productName || !form.quantity}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
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
