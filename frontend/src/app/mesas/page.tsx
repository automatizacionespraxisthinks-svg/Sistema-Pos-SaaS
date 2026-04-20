'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { useAuthStore } from '@/store/auth.store';
import { ordersApi, tablesApi, fmt } from '@/lib/api';
import {
  Users, Clock, CreditCard, Plus, PackagePlus, ClipboardList,
  LayoutGrid, Map, Pencil, Trash2, Save, X, Check, AlertTriangle,
  UtensilsCrossed, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── types ────────────────────────────────────────────────────────────────────

interface RTable {
  id: string; tenantId: string;
  name: string; type: string; capacity: number; zone: string | null;
  posX: number; posY: number; width: number; height: number;
  isActive: boolean;
}

type TableStatus = 'libre' | 'ocupada' | 'esperando_cuenta';
type ViewMode    = 'cards' | 'plan';

interface TableInfo {
  status:      TableStatus;
  order?:      any;
  waiterName?: string;
  since?:      string;
  total?:      number;
  itemCount?:  number;
}

// ─── constants ────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  mesa: '🪑', barra: '🍺', terraza: '☀️', otro: '📍',
};
const TYPE_LABELS: Record<string, string> = {
  mesa: 'Mesa', barra: 'Barra', terraza: 'Terraza', otro: 'Otro',
};

const STATUS_CONFIG: Record<TableStatus, { label: string; bg: string; border: string; text: string; dot: string; planBg: string }> = {
  libre:            { label: 'Libre',            bg: 'bg-emerald-50',  border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-400', planBg: '#ecfdf5' },
  ocupada:          { label: 'Ocupada',           bg: 'bg-blue-50',    border: 'border-blue-300',    text: 'text-blue-700',    dot: 'bg-blue-500',    planBg: '#eff6ff' },
  esperando_cuenta: { label: 'Esperando cuenta', bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-700',   dot: 'bg-amber-400',   planBg: '#fffbeb' },
};

const CANVAS_W = 1400;
const CANVAS_H = 900;

// ─── page ─────────────────────────────────────────────────────────────────────

export default function MesasPage() {
  useRoleGuard('/mesas');
  const router = useRouter();
  const qc     = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = ['admin', 'super_admin'].includes(user?.role || '');

  // ── view state ──────────────────────────────────────────────────────────────
  const [view,     setView]     = useState<ViewMode>('cards');
  const [editMode, setEditMode] = useState(false);

  // ── drawer / modals ─────────────────────────────────────────────────────────
  const [selected,      setSelected]      = useState<{ table: RTable; info: TableInfo } | null>(null);
  const [showForm,      setShowForm]      = useState(false);
  const [editingTable,  setEditingTable]  = useState<RTable | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<RTable | null>(null);

  // ── floor plan drag ─────────────────────────────────────────────────────────
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});
  const [isDirty,  setIsDirty]  = useState(false);
  const dragRef   = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── form state ───────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ name: '', type: 'mesa', capacity: 4, zone: '' });

  // ── queries ─────────────────────────────────────────────────────────────────
  const { data: tables = [], isLoading: loadingTables } = useQuery<RTable[]>({
    queryKey: ['tables'],
    queryFn:  () => tablesApi.list().then(r => r.data),
    refetchInterval: editMode ? undefined : 15_000,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['mesas-orders'],
    queryFn:  () => ordersApi.list({ limit: 200 }).then(r => r.data),
    refetchInterval: 8_000,
  });
  const orders: any[] = (ordersData as any)?.data ?? [];

  // Sync local positions when tables load
  useEffect(() => {
    if (tables.length === 0) return;
    setLocalPos(prev => {
      const next = { ...prev };
      tables.forEach(t => {
        if (!next[t.id]) next[t.id] = { x: t.posX, y: t.posY, w: t.width, h: t.height };
      });
      return next;
    });
  }, [tables]);

  // ── status map ───────────────────────────────────────────────────────────────
  const statusMap: Record<string, TableInfo> = {};
  tables.forEach(t => { statusMap[t.id] = { status: 'libre' }; });
  for (const order of orders) {
    if (!order.tableNumber) continue;
    if (order.status === 'cancelled' || order.paymentStatus === 'paid') continue;
    const table = tables.find(t => t.name === String(order.tableNumber));
    if (!table) continue;
    const isWaiting = ['ready', 'delivered'].includes(order.status);
    statusMap[table.id] = {
      status:     isWaiting ? 'esperando_cuenta' : 'ocupada',
      order,
      waiterName: order.waiterName,
      since:      order.createdAt,
      total:      Number(order.total),
      itemCount:  order.items?.length ?? 0,
    };
  }

  const freeCount = Object.values(statusMap).filter(i => i.status === 'libre').length;
  const busyCount = Object.values(statusMap).filter(i => i.status !== 'libre').length;

  // ── drag handlers (floor plan) ───────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.MouseEvent, tableId: string) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    const p = localPos[tableId] ?? { x: 60, y: 60, w: 120, h: 90 };
    dragRef.current = { id: tableId, startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y };
  }, [editMode, localPos]);

  const handleCanvasMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    e.preventDefault();
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const p  = localPos[d.id] ?? { w: 120, h: 90, x: 0, y: 0 };
    setLocalPos(prev => ({
      ...prev,
      [d.id]: { ...prev[d.id], x: Math.max(0, d.origX + dx), y: Math.max(0, d.origY + dy) },
    }));
    setIsDirty(true);
  }, [localPos]);

  const handleCanvasUp = useCallback(() => { dragRef.current = null; }, []);

  // ── mutations ────────────────────────────────────────────────────────────────
  const saveLayoutMut = useMutation({
    mutationFn: () => tablesApi.saveLayout(
      Object.entries(localPos).map(([id, p]) => ({ id, posX: p.x, posY: p.y, width: p.w, height: p.h })),
    ),
    onSuccess: () => {
      toast.success('Plano guardado');
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: () => toast.error('Error al guardar el plano'),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => tablesApi.create(data),
    onSuccess: (res) => {
      toast.success(`"${res.data.name}" creada`);
      qc.invalidateQueries({ queryKey: ['tables'] });
      setShowForm(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al crear'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => tablesApi.update(id, data),
    onSuccess: () => {
      toast.success('Ubicación actualizada');
      qc.invalidateQueries({ queryKey: ['tables'] });
      setShowForm(false);
      setEditingTable(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tablesApi.remove(id),
    onSuccess: () => {
      toast.success('Ubicación eliminada');
      qc.invalidateQueries({ queryKey: ['tables'] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'No se puede eliminar'),
  });

  // ── helpers ──────────────────────────────────────────────────────────────────
  function handleTableClick(table: RTable, info: TableInfo) {
    if (editMode) return;
    if (info.status === 'libre') {
      router.push(`/pos?table=${encodeURIComponent(table.name)}`);
    } else {
      setSelected({ table, info });
    }
  }

  function openCreate() {
    setEditingTable(null);
    setForm({ name: '', type: 'mesa', capacity: 4, zone: '' });
    setShowForm(true);
  }

  function openEdit(t: RTable) {
    setEditingTable(t);
    setForm({ name: t.name, type: t.type, capacity: t.capacity, zone: t.zone || '' });
    setShowForm(true);
  }

  function submitForm() {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return; }
    if (editingTable) {
      updateMut.mutate({ id: editingTable.id, data: form });
    } else {
      createMut.mutate(form);
    }
  }

  const isPending = createMut.isPending || updateMut.isPending;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mesas</h1>
            <p className="text-slate-500 text-sm">
              {freeCount} libres · {busyCount} ocupadas · {tables.length} total
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => { setView('cards'); setEditMode(false); }}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${
                  view === 'cards' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid size={15} />Cards
              </button>
              <button
                onClick={() => setView('plan')}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${
                  view === 'plan' ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Map size={15} />Plano
              </button>
            </div>

            {/* Admin: Edit mode + Save + Add */}
            {isAdmin && view === 'plan' && (
              <>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="btn-outline text-sm flex items-center gap-2 px-3 py-2"
                  >
                    <Pencil size={14} />Editar plano
                  </button>
                ) : (
                  <>
                    {isDirty && (
                      <button
                        onClick={() => saveLayoutMut.mutate()}
                        disabled={saveLayoutMut.isPending}
                        className="btn-primary text-sm flex items-center gap-2 px-3 py-2"
                      >
                        <Save size={14} />{saveLayoutMut.isPending ? 'Guardando…' : 'Guardar plano'}
                      </button>
                    )}
                    <button
                      onClick={() => { setEditMode(false); setIsDirty(false); }}
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <X size={14} />Salir edición
                    </button>
                  </>
                )}
              </>
            )}

            {isAdmin && (
              <button
                onClick={openCreate}
                className="btn-primary text-sm flex items-center gap-2 px-3 py-2"
              >
                <Plus size={14} />Nueva ubicación
              </button>
            )}
          </div>
        </div>

        {/* ── Status legend ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          {(Object.entries(STATUS_CONFIG) as [TableStatus, typeof STATUS_CONFIG[TableStatus]][]).map(([key, cfg]) => (
            <span key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
            </span>
          ))}
        </div>

        {/* ── No tables empty state ─────────────────────────────────────────── */}
        {!loadingTables && tables.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <UtensilsCrossed size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium mb-1">No hay ubicaciones configuradas</p>
            {isAdmin ? (
              <p className="text-slate-400 text-sm mb-4">Crea las mesas, barras y zonas del restaurante</p>
            ) : (
              <p className="text-slate-400 text-sm">Pide al administrador que configure las ubicaciones</p>
            )}
            {isAdmin && (
              <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2.5">
                <Plus size={16} />Crear primera ubicación
              </button>
            )}
          </div>
        )}

        {/* ══ CARDS VIEW ════════════════════════════════════════════════════════ */}
        {view === 'cards' && tables.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map(t => {
              const info = statusMap[t.id] ?? { status: 'libre' as TableStatus };
              const cfg  = STATUS_CONFIG[info.status];
              return (
                <button
                  key={t.id}
                  onClick={() => handleTableClick(t, info)}
                  className={`relative rounded-2xl border-2 p-4 flex flex-col items-center gap-1.5
                    transition-all hover:shadow-md hover:scale-105 cursor-pointer
                    ${cfg.bg} ${cfg.border}`}
                >
                  <span className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${cfg.dot}`} />

                  {/* Icon + name */}
                  <span className="text-2xl">{TYPE_ICONS[t.type] || '🪑'}</span>
                  <p className={`font-black text-lg leading-none ${cfg.text}`}>{t.name}</p>
                  {t.capacity && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Users size={9} />{t.capacity}p
                    </p>
                  )}

                  {/* Occupied info */}
                  {info.status !== 'libre' && (
                    <div className="w-full space-y-0.5 mt-0.5">
                      {info.waiterName && (
                        <p className="text-[10px] text-slate-600 flex items-center gap-1 truncate">
                          <Users size={9} />{info.waiterName}
                        </p>
                      )}
                      {info.since && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock size={9} />
                          {new Date(info.since).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {info.total !== undefined && (
                        <p className={`text-xs font-bold ${cfg.text}`}>{fmt(info.total)}</p>
                      )}
                    </div>
                  )}

                  <span className={`text-[9px] font-semibold uppercase tracking-wide mt-0.5 ${cfg.text}`}>
                    {cfg.label}
                  </span>

                  {/* Admin edit button */}
                  {isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); openEdit(t); }}
                      className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full bg-white bg-opacity-80 flex items-center justify-center text-slate-400 hover:text-primary-600 hover:bg-opacity-100 transition-all"
                    >
                      <Pencil size={9} />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ══ FLOOR PLAN VIEW ═══════════════════════════════════════════════════ */}
        {view === 'plan' && tables.length > 0 && (
          <div className="space-y-2">
            {editMode && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Pencil size={12} className="flex-none" />
                Modo edición activo — arrastra las mesas para reposicionarlas. Los cambios no se guardan hasta que pulses "Guardar plano".
              </div>
            )}

            {/* Canvas wrapper */}
            <div className="border border-slate-200 rounded-xl overflow-auto bg-slate-50" style={{ maxHeight: 640 }}>
              <div
                ref={canvasRef}
                className="relative select-none"
                style={{ width: CANVAS_W, height: CANVAS_H }}
                onMouseMove={handleCanvasMove}
                onMouseUp={handleCanvasUp}
                onMouseLeave={handleCanvasUp}
              >
                {/* Grid dots */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    opacity: 0.6,
                  }}
                />

                {/* Tables */}
                {tables.map(t => {
                  const info = statusMap[t.id] ?? { status: 'libre' as TableStatus };
                  const cfg  = STATUS_CONFIG[info.status];
                  const pos  = localPos[t.id] ?? { x: t.posX, y: t.posY, w: t.width, h: t.height };

                  return (
                    <div
                      key={t.id}
                      style={{
                        position: 'absolute',
                        left: pos.x, top: pos.y,
                        width: pos.w, height: pos.h,
                        cursor: editMode ? 'grab' : 'pointer',
                        backgroundColor: cfg.planBg,
                        borderColor: cfg.border.replace('border-', ''),
                        userSelect: 'none',
                        transition: dragRef.current?.id === t.id ? 'none' : 'box-shadow 0.15s',
                      }}
                      className={`rounded-xl border-2 flex flex-col items-center justify-center gap-0.5
                        shadow-sm hover:shadow-md ${cfg.border}
                        ${editMode ? 'active:cursor-grabbing active:shadow-lg' : ''}`}
                      onMouseDown={e => handleDragStart(e, t.id)}
                      onClick={() => !editMode && handleTableClick(t, info)}
                    >
                      <span className="text-xl pointer-events-none">{TYPE_ICONS[t.type] || '🪑'}</span>
                      <span className={`text-xs font-bold pointer-events-none ${cfg.text}`}>{t.name}</span>
                      {info.total !== undefined && (
                        <span className={`text-[10px] font-semibold pointer-events-none ${cfg.text}`}>{fmt(info.total)}</span>
                      )}
                      <span className={`w-2 h-2 rounded-full pointer-events-none ${cfg.dot}`} />

                      {/* Admin: edit/delete overlay */}
                      {isAdmin && editMode && (
                        <div className="flex gap-1 mt-0.5" onClick={e => e.stopPropagation()}>
                          <button
                            onMouseDown={e => e.stopPropagation()}
                            onClick={() => openEdit(t)}
                            className="w-5 h-5 rounded bg-white shadow flex items-center justify-center text-slate-500 hover:text-primary-600"
                          >
                            <Pencil size={9} />
                          </button>
                          <button
                            onMouseDown={e => e.stopPropagation()}
                            onClick={() => setDeleteTarget(t)}
                            className="w-5 h-5 rounded bg-white shadow flex items-center justify-center text-slate-500 hover:text-red-500"
                          >
                            <Trash2 size={9} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ DRAWER: mesa ocupada ══════════════════════════════════════════════ */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl
                  ${selected.info.status === 'esperando_cuenta' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                  {TYPE_ICONS[selected.table.type] || '🪑'}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selected.table.name}</p>
                  <p className={`text-xs font-semibold ${STATUS_CONFIG[selected.info.status].text}`}>
                    {STATUS_CONFIG[selected.info.status].label}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selected.info.order && (
                <>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge bg-slate-100 text-slate-600 text-xs">{selected.info.order.orderNumber}</span>
                    {selected.info.waiterName && (
                      <span className="badge bg-emerald-50 text-emerald-700 text-xs">👤 {selected.info.waiterName}</span>
                    )}
                    {selected.info.since && (
                      <span className="badge bg-slate-100 text-slate-500 text-xs">
                        🕐 {new Date(selected.info.since).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Pedido ({selected.info.order.items?.length ?? 0} productos)
                    </p>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                      {(selected.info.order.items ?? []).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-700">
                            <span className="font-semibold">{item.quantity}×</span> {item.productName}
                            {item.notes && <span className="ml-1 text-xs text-amber-600">({item.notes})</span>}
                          </span>
                          <span className="font-medium text-slate-800 flex-none ml-2">{fmt(Number(item.subtotal))}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between font-bold text-base border-t border-slate-100 pt-3">
                    <span>Total</span>
                    <span className="text-primary-600">{fmt(selected.info.total ?? 0)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="p-5 pt-0 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelected(null); router.push(`/pos?table=${encodeURIComponent(selected.table.name)}`); }}
                  className="flex-1 btn-outline py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  <PackagePlus size={15} />Agregar productos
                </button>
                <button
                  onClick={() => { setSelected(null); router.push('/orders'); }}
                  className="flex-1 btn-outline py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  <ClipboardList size={15} />Ver pedido
                </button>
              </div>
              <button
                onClick={() => { setSelected(null); router.push('/caja'); }}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                <CreditCard size={16} />Ir a caja
              </button>
              <button onClick={() => setSelected(null)} className="w-full py-2 text-sm text-slate-400 hover:text-slate-600">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: crear / editar ubicación ══════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-lg">
                {editingTable ? 'Editar ubicación' : 'Nueva ubicación'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingTable(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  className="input text-sm"
                  placeholder="ej: Mesa 1, Barra 2, Terraza A"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submitForm()}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tipo</label>
                  <select
                    className="input text-sm"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  >
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{TYPE_ICONS[v]} {l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Capacidad</label>
                  <input
                    type="number" min={1} max={50}
                    className="input text-sm"
                    value={form.capacity}
                    onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Zona (opcional)</label>
                <input
                  className="input text-sm"
                  placeholder="ej: Interior, Terraza, Piso 2"
                  value={form.zone}
                  onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                />
              </div>

              {/* Admin-only delete from edit modal */}
              {editingTable && (
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setDeleteTarget(editingTable); }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg transition-colors"
                >
                  <Trash2 size={13} />Eliminar esta ubicación
                </button>
              )}
            </div>

            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => { setShowForm(false); setEditingTable(null); }} className="flex-1 btn-outline py-3">Cancelar</button>
              <button
                onClick={submitForm}
                disabled={isPending || !form.name.trim()}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Check size={16} />
                {isPending ? 'Guardando…' : (editingTable ? 'Guardar cambios' : 'Crear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: confirmar eliminación ══════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Eliminar "{deleteTarget.name}"</h3>
            <p className="text-slate-500 text-sm mb-5">
              Esta acción no se puede deshacer. El historial de pedidos asociado se conserva.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-outline py-2.5">Cancelar</button>
              <button
                onClick={() => deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
