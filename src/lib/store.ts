"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSettingsStore } from "./settings-store";

export interface CartItem {
  id: string;
  name: string;
  weight: string;
  flavor: string;
  price: number;
  qty: number;
  img: string;
}

export type DeliveryMode = "collect" | "deliver";
export type PaymentMethod = "ikhokha" | "cash";
export type OrderStatus = "new" | "payment_initiated" | "paid" | "confirmed";

interface CartStore {
  items: CartItem[];
  deliveryMode: DeliveryMode;
  deliveryAddress: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  currentOrderId: string | null;
  pendingIkhokhaOrder: Record<string, unknown> | null;

  // Actions
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  incrementQty: (id: string) => void;
  decrementQty: (id: string) => void;
  clearCart: () => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setDeliveryAddress: (address: string) => void;
  setCustomerInfo: (name: string, phone: string, email: string) => void;
  setCurrentOrderId: (id: string | null) => void;
  setPendingIkhokhaOrder: (order: Record<string, unknown> | null) => void;

  // Computed
  totalItems: () => number;
  subtotal: () => number;
  deliveryFee: () => number;
  total: () => number;
}

const generateCartItemId = (name: string, flavor: string) =>
  `${name}-${flavor}`.replace(/\s+/g, "-").toLowerCase();

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      deliveryMode: "collect",
      deliveryAddress: "",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      currentOrderId: null,
      pendingIkhokhaOrder: null,

      addItem: (item) => {
        const id = generateCartItemId(item.name, item.flavor);
        const existing = get().items.find((i) => i.id === id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === id ? { ...i, qty: i.qty + item.qty } : i
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, id }] });
        }
      },

      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),

      updateQty: (id, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.id !== id) });
        } else {
          set({
            items: get().items.map((i) => (i.id === id ? { ...i, qty } : i)),
          });
        }
      },

      incrementQty: (id) => {
        const item = get().items.find((i) => i.id === id);
        if (item) get().updateQty(id, item.qty + 1);
      },

      decrementQty: (id) => {
        const item = get().items.find((i) => i.id === id);
        if (item && item.qty > 1) get().updateQty(id, item.qty - 1);
      },

      clearCart: () =>
        set({
          items: [],
          currentOrderId: null,
          pendingIkhokhaOrder: null,
          deliveryAddress: "",
        }),

      setDeliveryMode: (mode) => set({ deliveryMode: mode }),
      setDeliveryAddress: (address) => set({ deliveryAddress: address }),
      setCustomerInfo: (name, phone, email) =>
        set({
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
        }),
      setCurrentOrderId: (id) => set({ currentOrderId: id }),
      setPendingIkhokhaOrder: (order) =>
        set({ pendingIkhokhaOrder: order }),

      totalItems: () => get().items.reduce((s, i) => s + i.qty, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),
      deliveryFee: () => (get().deliveryMode === "deliver" ? (useSettingsStore.getState()?.deliveryFee || 40) : 0),
      total: () => get().subtotal() + get().deliveryFee(),
    }),
    {
      name: "biltong-cart",
      partialize: (state) => ({
        items: state.items,
        deliveryMode: state.deliveryMode,
        deliveryAddress: state.deliveryAddress,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        customerEmail: state.customerEmail,
        currentOrderId: state.currentOrderId,
        pendingIkhokhaOrder: state.pendingIkhokhaOrder,
      }),
    }
  )
);
