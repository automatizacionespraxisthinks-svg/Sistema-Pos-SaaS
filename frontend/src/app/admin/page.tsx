'use client';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { categoriesApi, authApi, tenantApi } from '@/lib/api';
import { applyPrimaryColor } from '@/lib/themeUtils';
import {
  Package, Boxes, BarChart3, Tag, Trash2,
  Users, UserPlus, Pencil, X, ShieldCheck,
  Eye, EyeOff, ChefHat, CreditCard, UserCheck,
  Palette, Upload, Store,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── constants ────────────────────────────────────────────────────────────────

const SHORTCUTS = [
  { href: '/products',  label: 'Productos',  desc: 'Catálogo y precios',          icon: Package,  color: 'bg-blue-100 text-blue-600'   },
  { href: '/inventory', label: 'Inventario', desc: 'Stock y movimientos',          icon: Boxes,    color: 'bg-green-100 text-green-600' },
  { href: '/analytics', label: 'Analítica',  desc: 'Métricas y reportes',          icon: BarChart3, color: 'bg-purple-100 text-purple-600' },
];

const ROLES = [
  { value: 'admin',       label: 'Administrador', icon: ShieldCheck, color: 'bg-red-100 text-red-700'      },
  { value: 'cashier',     label: 'Cajero',         icon: CreditCard,  color: 'bg-blue-100 text-blue-700'    },
  { value: 'waiter',      label: 'Mesero',         icon: UserCheck,   color: 'bg-emerald-100 text-emerald-700' },
  { value: 'kitchen',     label: 'Cocina',         icon: ChefHat,     color: 'bg-orange-100 text-orange-700' },
  { value: 'viewer',      label: 'Solo lectura',   icon: Eye,         color: 'bg-slate-100 text-slate-600'  },
];

const ROLE_META: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-violet-100 text-violet-700' },
  admin:       { label: 'Admin',       color: 'bg-red-100 text-red-700'       },
  cashier:     { label: 'Cajero',      color: 'bg-blue-100 text-blue-700'     },
  waiter:      { label: 'Mesero',      color: 'bg-emerald-100 text-emerald-700' },
  kitchen:     { label: 'Cocina',      color: 'bg-orange-100 text-orange-700' },
  viewer:      { label: 'Viewer',      color: 'bg-slate-100 text-slate-600'   },
};

const USER_EMPTY = { firstName: '', lastName: '', email: '', password: '', role: 'cashier' };

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  useRoleGuard('/admin');
  const qc = useQueryClient();

  const [tab, setTab]         = useState<'general' | 'users' | 'branding'>('general');

  // categories
  const [catName, setCatName]   = useState('');
  const [catColor, setCatColor] = useState('#3B82F6');

  // users
  const [userModal, setUserModal]   = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm]     = useState<any>(USER_EMPTY);
  const [showPass, setShowPass]     = useState(false);
  const [roleFilter, setRoleFilter] = useState('');

  // branding
  const [brandForm, setBrandForm] = useState<any>(null);

  // ── queries ─────────────────────────────────────────────────────────────────

  const { data: cats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then(r => r.data),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ['admin-users', roleFilter],
    queryFn: () => authApi.getUsers(roleFilter || undefined).then(r => r.data),
    enabled: tab === 'users',
  });

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => tenantApi.get().then(r => r.data),
    enabled: tab === 'branding',
  });

  useEffect(() => {
    if (tenant && !brandForm) setBrandForm(tenant);
  }, [tenant]);

  // ── category mutations ───────────────────────────────────────────────────────

  const createCat = useMutation({
    mutationFn: () => categoriesApi.create({ name: catName, color: catColor }),
    onSuccess: () => {
      toast.success('Categoría creada');
      setCatName('');
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => toast.error('Error al crear categoría'),
  });

  const delCat = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      toast.success('Categoría eliminada');
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => toast.error('Error al eliminar'),
  });

  // ── user mutations ────────────────────────────────────────────────────────────

  const saveUser = useMutation({
    mutationFn: () => {
      if (editingUser) {
        const { password, email, ...patch } = userForm;
        return authApi.updateUser(editingUser.id, patch);
      }
      // New user — created within the current tenant (tenantId from JWT header)
      return authApi.createUser(userForm);
    },
    onSuccess: () => {
      toast.success(editingUser ? 'Usuario actualizado' : 'Usuario creado');
      closeUserModal();
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al guardar'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      authApi.updateUser(id, { isActive }),
    onSuccess: () => {
      toast.success('Usuario actualizado');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const deactivateUser = useMutation({
    mutationFn: (id: string) => authApi.deleteUser(id),
    onSuccess: () => {
      toast.success('Usuario desactivado');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const saveBrand = useMutation({
    mutationFn: () => tenantApi.update(brandForm),
    onSuccess: () => {
      toast.success('Personalización guardada ✓');
      // Apply color immediately without page reload
      if (brandForm?.primaryColor) applyPrimaryColor(brandForm.primaryColor);
      // Update both caches so sidebar/header reflect new name & logo instantly
      qc.setQueryData(['tenant-theme'], (old: any) => ({ ...(old ?? {}), ...brandForm }));
      qc.invalidateQueries({ queryKey: ['tenant'] });
      qc.invalidateQueries({ queryKey: ['tenant-theme'] });
    },
    onError: () => toast.error('Error al guardar'),
  });

  async function brandLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen debe ser menor a 2 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setBrandForm((f: any) => ({ ...f, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  function openNewUser() {
    setEditingUser(null);
    setUserForm(USER_EMPTY);
    setShowPass(false);
    setUserModal(true);
  }

  function openEditUser(u: any) {
    setEditingUser(u);
    setUserForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', role: u.role });
    setShowPass(false);
    setUserModal(true);
  }

  function closeUserModal() {
    setUserModal(false);
    setEditingUser(null);
    setUserForm(USER_EMPTY);
  }

  const filteredUsers = (users as any[]).filter(u =>
    !roleFilter || u.role === roleFilter,
  );

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="p-4 md:p-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Administración</h1>
          <p className="text-slate-500 text-sm">Configuración y gestión del negocio</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          {[
            { key: 'general',  label: 'General',          icon: Tag     },
            { key: 'users',    label: 'Usuarios',          icon: Users   },
            { key: 'branding', label: 'Personalización',   icon: Palette },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key}
              onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        {/* ── TAB GENERAL ─────────────────────────────────────────────────────── */}
        {tab === 'general' && (
          <div className="space-y-6">

            {/* Shortcuts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SHORTCUTS.map(({ href, label, desc, icon: Icon, color }) => (
                <Link key={label} href={href}
                  className="card hover:shadow-md transition-all hover:border-primary-400 group flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-none ${color}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">{label}</p>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Categories */}
            <div className="card">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Tag size={18} className="text-slate-500" />Categorías de productos
              </h2>
              <div className="flex gap-3 mb-4">
                <input className="input flex-1" placeholder="Nombre de la categoría"
                  value={catName} onChange={e => setCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && catName && createCat.mutate()}
                />
                <input type="color" title="Color"
                  className="h-10 w-10 rounded-lg border border-slate-300 cursor-pointer p-1"
                  value={catColor} onChange={e => setCatColor(e.target.value)}
                />
                <button
                  onClick={() => createCat.mutate()}
                  disabled={!catName || createCat.isPending}
                  className="btn-primary px-5">
                  Agregar
                </button>
              </div>
              <div className="space-y-2">
                {(cats as any[]).length === 0 && (
                  <p className="text-slate-400 text-sm text-center py-4">Sin categorías — crea la primera.</p>
                )}
                {(cats as any[]).map((cat: any) => (
                  <div key={cat.id}
                    className="flex items-center justify-between py-2.5 px-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex-none border border-white shadow-sm"
                        style={{ backgroundColor: cat.color || '#94a3b8' }} />
                      <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                    </div>
                    <button
                      onClick={() => { if (confirm(`¿Eliminar "${cat.name}"?`)) delCat.mutate(cat.id); }}
                      className="text-red-400 hover:text-red-600 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB USUARIOS ────────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="space-y-4">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 flex-wrap">
                {['', ...ROLES.map(r => r.value)].map(r => (
                  <button key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      roleFilter === r
                        ? 'bg-primary-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-400'
                    }`}>
                    {r ? (ROLE_META[r]?.label ?? r) : 'Todos'}
                  </button>
                ))}
              </div>
              <button onClick={openNewUser}
                className="btn-primary text-sm flex items-center gap-2">
                <UserPlus size={15} />Nuevo usuario
              </button>
            </div>

            {/* Role cards summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {ROLES.map(({ value, label, icon: Icon, color }) => {
                const count = (users as any[]).filter(u => u.role === value).length;
                return (
                  <button key={value}
                    onClick={() => setRoleFilter(roleFilter === value ? '' : value)}
                    className={`card flex items-center gap-3 py-3 transition-all hover:shadow-md ${
                      roleFilter === value ? 'border-primary-400 ring-1 ring-primary-300' : ''
                    }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-slate-900 leading-none">{count}</p>
                      <p className="text-xs text-slate-500 truncate">{label}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Users table */}
            {loadingUsers && (
              <p className="text-center py-12 text-slate-400">Cargando usuarios...</p>
            )}
            {!loadingUsers && (
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Usuario', 'Correo', 'Rol', 'Estado', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400">
                          <Users size={32} className="mx-auto mb-2 opacity-30" />
                          No hay usuarios{roleFilter ? ` con rol ${ROLE_META[roleFilter]?.label}` : ''}
                        </td>
                      </tr>
                    )}
                    {filteredUsers.map((u: any) => {
                      const meta = ROLE_META[u.role] ?? { label: u.role, color: 'bg-slate-100 text-slate-600' };
                      return (
                        <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-none">
                                <span className="text-xs font-bold text-primary-600">
                                  {u.firstName?.[0]}{u.lastName?.[0]}
                                </span>
                              </div>
                              <span className="font-medium text-slate-900">
                                {u.firstName} {u.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`badge text-xs ${meta.color}`}>{meta.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                                u.isActive
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}>
                              {u.isActive ? <><Eye size={12} />Activo</> : <><EyeOff size={12} />Inactivo</>}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditUser(u)}
                                className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium">
                                <Pencil size={11} />Editar
                              </button>
                              {u.isActive && (
                                <button
                                  onClick={() => { if (confirm(`¿Desactivar a ${u.firstName}?`)) deactivateUser.mutate(u.id); }}
                                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium">
                                  <Trash2 size={11} />Desactivar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB PERSONALIZACIÓN ──────────────────────────────────────────── */}
        {tab === 'branding' && (
          <div className="max-w-2xl space-y-6">
            {!brandForm ? (
              <p className="text-slate-400 text-center py-10">Cargando...</p>
            ) : (
              <>
                {/* Logo + color */}
                <div className="card">
                  <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Store size={18} className="text-slate-500" />Identidad del negocio
                  </h2>
                  <div className="flex items-start gap-6 mb-5">
                    <div className="flex-none">
                      <p className="text-xs font-medium text-slate-600 mb-2">Logo</p>
                      <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                        {brandForm.logoUrl
                          ? <img src={brandForm.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                          : <Store size={32} className="text-slate-300" />
                        }
                      </div>
                      <div className="mt-2 flex gap-2">
                        <label className="btn-outline text-xs py-1 px-2 cursor-pointer flex items-center gap-1">
                          <Upload size={11} />Subir
                          <input type="file" className="hidden" accept="image/*" onChange={brandLogoFile} />
                        </label>
                        {brandForm.logoUrl && (
                          <button onClick={() => setBrandForm((f: any) => ({ ...f, logoUrl: '' }))}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded-lg">
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre del negocio *</label>
                        <input className="input" value={brandForm.name || ''}
                          onChange={e => setBrandForm((f: any) => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">Color principal</label>
                        <div className="flex items-center gap-3">
                          <input type="color" className="h-10 w-14 rounded-lg border border-slate-300 cursor-pointer p-1"
                            value={brandForm.primaryColor || '#3B82F6'}
                            onChange={e => setBrandForm((f: any) => ({ ...f, primaryColor: e.target.value }))} />
                          <input className="input flex-1 font-mono text-sm" placeholder="#3B82F6"
                            value={brandForm.primaryColor || ''}
                            onChange={e => setBrandForm((f: any) => ({ ...f, primaryColor: e.target.value }))} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact & billing info */}
                <div className="card">
                  <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Tag size={18} className="text-slate-500" />Información del negocio
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Teléfono</label>
                      <input className="input" placeholder="+57 300 000 0000"
                        value={brandForm.phone || ''}
                        onChange={e => setBrandForm((f: any) => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">NIT / RUT</label>
                      <input className="input" placeholder="900.123.456-7"
                        value={brandForm.taxId || ''}
                        onChange={e => setBrandForm((f: any) => ({ ...f, taxId: e.target.value }))} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Dirección</label>
                      <input className="input" placeholder="Calle 10 #5-20, Bogotá"
                        value={brandForm.address || ''}
                        onChange={e => setBrandForm((f: any) => ({ ...f, address: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => saveBrand.mutate()}
                    disabled={saveBrand.isPending || !brandForm.name}
                    className="btn-primary px-8 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
                    {saveBrand.isPending ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── USER MODAL ──────────────────────────────────────────────────────────── */}
      {userModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <button onClick={closeUserModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre *</label>
                  <input className="input" placeholder="Juan"
                    value={userForm.firstName}
                    onChange={e => setUserForm({ ...userForm, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Apellido *</label>
                  <input className="input" placeholder="Pérez"
                    value={userForm.lastName}
                    onChange={e => setUserForm({ ...userForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Correo electrónico *</label>
                    <input className="input" type="email" placeholder="correo@ejemplo.com"
                      value={userForm.email}
                      onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Contraseña *</label>
                    <div className="relative">
                      <input
                        className="input pr-10"
                        type={showPass ? 'text' : 'password'}
                        placeholder="Mínimo 6 caracteres"
                        value={userForm.password}
                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">Rol *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(({ value, label, icon: Icon, color }) => (
                    <button key={value}
                      type="button"
                      onClick={() => setUserForm({ ...userForm, role: value })}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                        userForm.role === value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-none ${color}`}>
                        <Icon size={13} />
                      </div>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeUserModal} className="flex-1 btn-outline py-2.5">
                Cancelar
              </button>
              <button
                onClick={() => saveUser.mutate()}
                disabled={
                  saveUser.isPending ||
                  !userForm.firstName || !userForm.lastName ||
                  (!editingUser && (!userForm.email || !userForm.password))
                }
                className="flex-1 btn-primary py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {saveUser.isPending ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
