'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { productsApi, inventoryApi, recipesApi } from '@/lib/api';
import { BookOpen, Plus, Trash2, X, Search, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';

interface Ingredient {
  ingredientId:   string;
  ingredientName: string;
  quantity:       number;
  unit:           string;
}

interface RecipeForm {
  productId:   string;
  productName: string;
  ingredients: Ingredient[];
}

const EMPTY_FORM: RecipeForm = { productId: '', productName: '', ingredients: [] };
const EMPTY_ING: Ingredient  = { ingredientId: '', ingredientName: '', quantity: 1, unit: 'unidades' };

const UNITS = ['unidades', 'g', 'kg', 'ml', 'l', 'taza', 'cucharada', 'cucharadita', 'porción'];

export default function RecetasPage() {
  useRoleGuard('/recetas');
  const qc = useQueryClient();

  const [search,     setSearch]     = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [form,       setForm]       = useState<RecipeForm>(EMPTY_FORM);
  const [expanded,   setExpanded]   = useState<Record<string, boolean>>({});
  const [ingSearch,  setIngSearch]  = useState<Record<number, string>>({});

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: recipes = [], isLoading: loadingRecipes } = useQuery<any[]>({
    queryKey: ['recipes'],
    queryFn: () => recipesApi.list().then(r => r.data),
  });

  const { data: pd } = useQuery({
    queryKey: ['products-pos'],
    queryFn: () => productsApi.list({ limit: 200 }).then(r => r.data),
  });
  const products: any[] = (pd as any)?.data ?? [];

  const { data: inventoryItems = [] } = useQuery<any[]>({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list().then(r => r.data),
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  const upsert = useMutation({
    mutationFn: () => recipesApi.upsert({
      productId:   form.productId,
      productName: form.productName,
      ingredients: form.ingredients,
    }),
    onSuccess: () => {
      toast.success('✅ Receta guardada');
      setModalOpen(false);
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al guardar receta'),
  });

  const remove = useMutation({
    mutationFn: (productId: string) => recipesApi.delete(productId),
    onSuccess: () => {
      toast.success('Receta eliminada');
      qc.invalidateQueries({ queryKey: ['recipes'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al eliminar'),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setIngSearch({});
    setModalOpen(true);
  }

  function openEdit(recipe: any) {
    setForm({
      productId:   recipe.productId,
      productName: recipe.productName,
      ingredients: recipe.ingredients ?? [],
    });
    setIngSearch({});
    setModalOpen(true);
  }

  function addIngredient() {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { ...EMPTY_ING }] }));
  }

  function removeIngredient(idx: number) {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
    setIngSearch(s => { const next = { ...s }; delete next[idx]; return next; });
  }

  function updateIngredient(idx: number, field: keyof Ingredient, value: any) {
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.map((ing, i) =>
        i === idx ? { ...ing, [field]: value } : ing
      ),
    }));
  }

  function selectProduct(p: any) {
    setForm(f => ({ ...f, productId: p.id, productName: p.name }));
  }

  function selectInventoryItem(idx: number, item: any) {
    updateIngredient(idx, 'ingredientId',   item.productId);
    updateIngredient(idx, 'ingredientName', item.productName);
    setIngSearch(s => ({ ...s, [idx]: item.productName }));
  }

  const filteredRecipes = (recipes as any[]).filter(r =>
    r.productName?.toLowerCase().includes(search.toLowerCase())
  );

  const recipeProductIds = new Set((recipes as any[]).map(r => r.productId));
  const productsWithoutRecipe = products.filter(p => !recipeProductIds.has(p.id));

  const formValid = form.productId && form.ingredients.length > 0 &&
    form.ingredients.every(i => i.ingredientId && i.quantity > 0);

  // ── UI ───────────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Recetas e Inventario</h1>
              <p className="text-slate-500 text-sm">Define los ingredientes de cada producto para descuento automático</p>
            </div>
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nueva receta
          </button>
        </div>

        {/* Buscador */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9 text-sm"
            placeholder="Buscar por producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">¿Cómo funciona?</p>
          <p>Cuando un pedido es marcado como <strong>Pagado</strong> en caja, el sistema descuenta automáticamente los ingredientes de cada producto vendido según las recetas definidas aquí.</p>
        </div>

        {/* Lista de recetas */}
        {loadingRecipes ? (
          <p className="text-center py-16 text-slate-400">Cargando recetas...</p>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-20 text-slate-400 space-y-2">
            <BookOpen size={40} className="mx-auto opacity-30" />
            <p className="font-semibold">Sin recetas configuradas</p>
            <p className="text-sm">Agrega la primera receta con el botón de arriba</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecipes.map((recipe: any) => (
              <div key={recipe.id} className="card">
                {/* Header de la receta */}
                <div className="flex items-center justify-between">
                  <button
                    className="flex items-center gap-3 flex-1 text-left"
                    onClick={() => setExpanded(e => ({ ...e, [recipe.id]: !e[recipe.id] }))}>
                    <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-none">
                      {expanded[recipe.id]
                        ? <ChevronDown size={16} className="text-emerald-600" />
                        : <ChevronRight size={16} className="text-emerald-600" />
                      }
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{recipe.productName}</p>
                      <p className="text-xs text-slate-500">
                        {(recipe.ingredients ?? []).length} ingrediente{(recipe.ingredients ?? []).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(recipe)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`¿Eliminar receta de "${recipe.productName}"?`)) remove.mutate(recipe.productId); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Ingredientes desplegables */}
                {expanded[recipe.id] && (
                  <div className="mt-3 ml-11 space-y-2">
                    {(recipe.ingredients ?? []).map((ing: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-sm bg-slate-50 rounded-lg px-3 py-2">
                        <span className="w-6 h-6 bg-white border border-slate-200 rounded-full text-xs font-bold flex items-center justify-center flex-none">
                          {i + 1}
                        </span>
                        <span className="flex-1 font-medium text-slate-800">{ing.ingredientName}</span>
                        <span className="text-slate-500 flex-none">
                          {ing.quantity} {ing.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL NUEVA / EDITAR RECETA ────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 flex-none">
              <h2 className="text-base font-bold text-slate-900">
                {form.productId && recipeProductIds.has(form.productId) ? 'Editar receta' : 'Nueva receta'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Producto */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Producto *</label>
                {form.productId ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <span className="font-semibold text-emerald-800">{form.productName}</span>
                    <button
                      onClick={() => setForm(f => ({ ...f, productId: '', productName: '' }))}
                      className="text-emerald-500 hover:text-emerald-700 text-sm">
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">Selecciona el plato/producto para el que defines la receta:</p>
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                      {products.map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => selectProduct(p)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0 flex items-center justify-between">
                          <span className="font-medium">{p.name}</span>
                          {recipeProductIds.has(p.id) && (
                            <span className="text-xs text-emerald-600 font-medium">Receta existente</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ingredientes */}
              {form.productId && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Ingredientes *</label>
                    <button
                      onClick={addIngredient}
                      className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:text-primary-800">
                      <Plus size={13} /> Agregar ingrediente
                    </button>
                  </div>

                  {form.ingredients.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      Agrega al menos un ingrediente
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {form.ingredients.map((ing, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">Ingrediente {idx + 1}</span>
                            <button onClick={() => removeIngredient(idx)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Selector de item de inventario */}
                          {ing.ingredientId ? (
                            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                              <span className="font-medium">{ing.ingredientName}</span>
                              <button
                                onClick={() => {
                                  updateIngredient(idx, 'ingredientId', '');
                                  updateIngredient(idx, 'ingredientName', '');
                                  setIngSearch(s => ({ ...s, [idx]: '' }));
                                }}
                                className="text-slate-400 hover:text-slate-600 text-xs ml-2">
                                Cambiar
                              </button>
                            </div>
                          ) : (
                            <div>
                              <input
                                className="input text-sm mb-1"
                                placeholder="Buscar en inventario..."
                                value={ingSearch[idx] ?? ''}
                                onChange={e => setIngSearch(s => ({ ...s, [idx]: e.target.value }))}
                              />
                              {(ingSearch[idx] ?? '').length > 0 && (
                                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                                  {(inventoryItems as any[])
                                    .filter(i =>
                                      i.productName.toLowerCase().includes((ingSearch[idx] ?? '').toLowerCase())
                                    )
                                    .slice(0, 8)
                                    .map((item: any) => (
                                      <button
                                        key={item.productId}
                                        onClick={() => selectInventoryItem(idx, item)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between">
                                        <span>{item.productName}</span>
                                        <span className="text-slate-400 text-xs">{item.quantity} {item.unit || 'uds'}</span>
                                      </button>
                                    ))
                                  }
                                  {(inventoryItems as any[]).filter(i =>
                                    i.productName.toLowerCase().includes((ingSearch[idx] ?? '').toLowerCase())
                                  ).length === 0 && (
                                    <p className="text-xs text-slate-400 text-center py-3">
                                      Sin resultados — agrega el item en Inventario primero
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Cantidad y unidad */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Cantidad *</label>
                              <input
                                type="number" min="0.001" step="0.001"
                                className="input text-sm text-center font-semibold"
                                value={ing.quantity}
                                onChange={e => updateIngredient(idx, 'quantity', Number(e.target.value))}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">Unidad</label>
                              <select
                                className="input text-sm"
                                value={ing.unit}
                                onChange={e => updateIngredient(idx, 'unit', e.target.value)}>
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 flex gap-3 flex-none">
              <button onClick={() => setModalOpen(false)} className="flex-1 btn-outline py-3">
                Cancelar
              </button>
              <button
                onClick={() => upsert.mutate()}
                disabled={upsert.isPending || !formValid}
                className="flex-1 btn-primary py-3 disabled:opacity-50">
                {upsert.isPending ? 'Guardando...' : 'Guardar receta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
