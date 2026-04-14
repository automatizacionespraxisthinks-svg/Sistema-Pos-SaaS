import { create } from 'zustand';

export interface CartItem {
  productId: string; productName: string; unitPrice: number; quantity: number; notes?: string;
}

interface CartState {
  items: CartItem[];
  tableNumber: string;
  orderType: 'dine_in' | 'takeout' | 'delivery';
  discount: number;
  notes: string;
  // Mesero asignado a la mesa
  waiterId: string;
  waiterName: string;

  addItem:     (item: Omit<CartItem, 'quantity'>) => void;
  removeItem:  (productId: string) => void;
  updateQty:   (productId: string, qty: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart:   () => void;
  setTable:    (t: string) => void;
  setType:     (t: CartState['orderType']) => void;
  setDiscount: (n: number) => void;
  setWaiter:   (id: string, name: string) => void;
  subtotal: () => number;
  tax:      () => number;
  total:    () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [], tableNumber: '', orderType: 'dine_in', discount: 0, notes: '',
  waiterId: '', waiterName: '',

  addItem: (item) => set((s) => {
    const ex = s.items.find(i => i.productId === item.productId);
    return ex
      ? { items: s.items.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i) }
      : { items: [...s.items, { ...item, quantity: 1 }] };
  }),

  removeItem:  (id) => set(s => ({ items: s.items.filter(i => i.productId !== id) })),
  updateNotes: (id, notes) => set(s => ({
    items: s.items.map(i => i.productId === id ? { ...i, notes } : i),
  })),
  updateQty:   (id, qty) => set(s => ({
    items: qty <= 0
      ? s.items.filter(i => i.productId !== id)
      : s.items.map(i => i.productId === id ? { ...i, quantity: qty } : i),
  })),

  clearCart:   () => set({ items: [], tableNumber: '', discount: 0, notes: '', waiterId: '', waiterName: '' }),
  setTable:    (tableNumber) => set({ tableNumber }),
  setType:     (orderType)   => set({ orderType, waiterId: '', waiterName: '' }),
  setDiscount: (discount)    => set({ discount }),
  setWaiter:   (id, name)    => set({ waiterId: id, waiterName: name }),

  subtotal: () => get().items.reduce((a, i) => a + i.unitPrice * i.quantity, 0),
  tax:      () => get().subtotal() * 0.19,
  total:    () => get().subtotal() + get().tax() - get().discount,
}));
