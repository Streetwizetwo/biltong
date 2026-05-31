"use client";

import { create } from "zustand";
import { persist, StateStorage } from "zustand/middleware";
import { hashCartData, verifyCartIntegrity } from "./cart-hash";
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

// Shipping rate from Courier Guy API
export interface ShippingRate {
  service_name: string;
  service_code: string;
  total_price: number;       // in cents
  estimated_delivery_days: number;
  courier_name: string;
  courier_code: string;
}

// Structured address from Google Maps
export interface StructuredAddress {
  street_address: string;
  local_area: string;
  city: string;
  zone: string;
  code: string;
  formatted: string;
}

interface CartStore {
  items: CartItem[];
  deliveryMode: DeliveryMode;
  deliveryAddress: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  currentOrderId: string | null;
  pendingIkhokhaOrder: Record<string, unknown> | null;

  // Shipping zone awareness
  isStangerDelivery: boolean;
  availableRates: ShippingRate[];
  selectedRate: ShippingRate | null;
  ratesLoading: boolean;

  // Structured address from Google Maps
  structuredAddress: StructuredAddress | null;

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
  setIsStangerDelivery: (isStanger: boolean) => void;
  setAvailableRates: (rates: ShippingRate[]) => void;
  setSelectedRate: (rate: ShippingRate | null) => void;
  setRatesLoading: (loading: boolean) => void;
  setStructuredAddress: (addr: StructuredAddress | null) => void;

  // Computed
  totalItems: () => number;
  subtotal: () => number;
  deliveryFee: () => number;
  total: () => number;
}

const generateCartItemId = (name: string, flavor: string) =>
  `${name}-${flavor}`.replace(/\s+/g, "-").toLowerCase();

// ============================================
// HASHED LOCAL STORAGE — prevents tampering
// ============================================
// We wrap localStorage so that every write also stores a hash,
// and every read verifies the hash. If someone edits the cart
// in DevTools (e.g. changes a price), the hash won't match
// and the cart is reset to empty.

const CART_STORAGE_KEY = "biltong-cart";
const CART_HASH_KEY = "biltong-cart-sig";

const hashedStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null;

    const data = localStorage.getItem(name);
    if (!data) return null;

    // Verify integrity
    const storedHash = localStorage.getItem(CART_HASH_KEY);
    if (!verifyCartIntegrity(data, storedHash || undefined)) {
      // Tampered! Clear everything and return null (cart resets)
      console.warn("[Cart] Integrity check failed — cart data was tampered. Resetting.");
      localStorage.removeItem(CART_STORAGE_KEY);
      localStorage.removeItem(CART_HASH_KEY);
      localStorage.removeItem("biltong_orders");
      return null;
    }

    return data;
  },

  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return;

    localStorage.setItem(name, value);
    // Compute and store integrity hash
    const hash = hashCartData(value);
    localStorage.setItem(CART_HASH_KEY, hash);
  },

  removeItem: (name: string): void => {
    if (typeof window === "undefined") return;

    localStorage.removeItem(name);
    localStorage.removeItem(CART_HASH_KEY);
  },
};

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

      // Shipping zone state
      isStangerDelivery: true,
      availableRates: [],
      selectedRate: null,
      ratesLoading: false,
      structuredAddress: null,

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
          availableRates: [],
          selectedRate: null,
          isStangerDelivery: true,
          structuredAddress: null,
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

      setIsStangerDelivery: (isStanger) => set({ isStangerDelivery: isStanger }),
      setAvailableRates: (rates) => set({ availableRates: rates }),
      setSelectedRate: (rate) => set({ selectedRate: rate }),
      setRatesLoading: (loading) => set({ ratesLoading: loading }),
      setStructuredAddress: (addr) => set({ structuredAddress: addr }),

      totalItems: () => get().items.reduce((s, i) => s + i.qty, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.qty, 0),

      deliveryFee: () => {
        if (get().deliveryMode !== "deliver") return 0;
        // If Stanger, use the settings delivery fee
        if (get().isStangerDelivery) {
          return useSettingsStore.getState()?.deliveryFee || 40;
        }
        // If national, use the selected shipping rate price
        const rate = get().selectedRate;
        if (rate) {
          return Math.round(rate.total_price / 100); // cents to rands
        }
        return 0;
      },

      total: () => get().subtotal() + get().deliveryFee(),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: hashedStorage,
      partialize: (state) => ({
        items: state.items,
        deliveryMode: state.deliveryMode,
        deliveryAddress: state.deliveryAddress,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        customerEmail: state.customerEmail,
        currentOrderId: state.currentOrderId,
        pendingIkhokhaOrder: state.pendingIkhokhaOrder,
        isStangerDelivery: state.isStangerDelivery,
        selectedRate: state.selectedRate,
        structuredAddress: state.structuredAddress,
      }),
    }
  )
);
