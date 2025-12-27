/**
 * Skin Store - Manages user's skins, purchases, and active skins
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Skin, CarSkin, ThemeSkin, AvatarSkin } from "@/constants/skins/types";

interface SkinStore {
  // Monedas del usuario (mockup)
  coins: number;

  // IDs de skins compradas
  ownedSkins: string[];

  // Skins activas
  activeCarSkin: string;
  activeThemeSkin: string;
  activeAvatarSkin: string;

  // Acciones
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  purchaseSkin: (skin: Skin) => boolean;
  ownsSkin: (skinId: string) => boolean;
  setActiveCarSkin: (skinId: string) => void;
  setActiveThemeSkin: (skinId: string) => void;
  setActiveAvatarSkin: (skinId: string) => void;

  // Para testing/mockup
  resetStore: () => void;
  grantFreeSkin: (skinId: string) => void;
}

const INITIAL_STATE = {
  coins: 1000, // Monedas iniciales para probar
  ownedSkins: ['car_default', 'theme_toro', 'avatar_default'], // Skins gratis por defecto
  activeCarSkin: 'car_default',
  activeThemeSkin: 'theme_toro',
  activeAvatarSkin: 'avatar_default',
};

export const useSkinStore = create<SkinStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      addCoins: (amount) => {
        set((state) => ({ coins: state.coins + amount }));
      },

      spendCoins: (amount) => {
        const { coins } = get();
        if (coins >= amount) {
          set((state) => ({ coins: state.coins - amount }));
          return true;
        }
        return false;
      },

      purchaseSkin: (skin) => {
        const { coins, ownedSkins } = get();

        // Ya la tiene
        if (ownedSkins.includes(skin.id)) {
          return false;
        }

        // No tiene suficientes monedas
        if (coins < skin.price) {
          return false;
        }

        // Comprar
        set((state) => ({
          coins: state.coins - skin.price,
          ownedSkins: [...state.ownedSkins, skin.id],
        }));

        return true;
      },

      ownsSkin: (skinId) => {
        return get().ownedSkins.includes(skinId);
      },

      setActiveCarSkin: (skinId) => {
        const { ownedSkins } = get();
        if (ownedSkins.includes(skinId)) {
          set({ activeCarSkin: skinId });
        }
      },

      setActiveThemeSkin: (skinId) => {
        const { ownedSkins } = get();
        if (ownedSkins.includes(skinId)) {
          set({ activeThemeSkin: skinId });
        }
      },

      setActiveAvatarSkin: (skinId) => {
        const { ownedSkins } = get();
        if (ownedSkins.includes(skinId)) {
          set({ activeAvatarSkin: skinId });
        }
      },

      resetStore: () => {
        set(INITIAL_STATE);
      },

      grantFreeSkin: (skinId) => {
        set((state) => ({
          ownedSkins: state.ownedSkins.includes(skinId)
            ? state.ownedSkins
            : [...state.ownedSkins, skinId],
        }));
      },
    }),
    {
      name: "skin-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
