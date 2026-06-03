"use client";
import { create } from "zustand";

interface SettingsStore {
  deliveryFee: number; // Stanger local delivery fee
  nationwideDeliveryFee: number; // Nationwide delivery fee
  productPrices: Record<string, number>; // { "0": 35, "1": 100, etc }
  loaded: boolean;
  fetchSettings: () => Promise<void>;
  getPrice: (productId: number, fallbackPrice: number) => number;
}

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  deliveryFee: 40,
  nationwideDeliveryFee: 150,
  productPrices: {},
  loaded: false,

  fetchSettings: async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        set({
          deliveryFee: data.deliveryFee ?? 40,
          nationwideDeliveryFee: data.nationwideDeliveryFee ?? 150,
          productPrices: data.productPrices ?? {},
          loaded: true,
        });
      } else {
        console.error("Failed to fetch settings, using defaults");
        set({ loaded: true });
      }
    } catch (err) {
      console.error("Settings fetch error:", err);
      set({ loaded: true });
    }
  },

  getPrice: (productId: number, fallbackPrice: number) => {
    const prices = get().productPrices;
    const key = String(productId);
    return prices[key] != null ? prices[key] : fallbackPrice;
  },
}));
