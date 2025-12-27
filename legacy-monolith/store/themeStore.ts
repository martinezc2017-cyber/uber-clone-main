/**
 * Theme Store - Manages day/night theme with auto and manual modes
 * TORO Premium Design System - Gold & Fire palette
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark";
type ThemeSetting = "auto" | "light" | "dark";

interface ThemeStore {
  // Current active theme (computed from setting + time)
  activeTheme: ThemeMode;

  // User preference: auto, light, or dark
  themeSetting: ThemeSetting;

  // Actions
  setThemeSetting: (setting: ThemeSetting) => void;
  toggleTheme: () => void;
  updateAutoTheme: () => void;
}

// Determine if it's night time (7pm - 6am)
const isNightTime = (): boolean => {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 6;
};

// Get theme based on setting
const getActiveTheme = (setting: ThemeSetting): ThemeMode => {
  if (setting === "auto") {
    return isNightTime() ? "dark" : "light";
  }
  return setting;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      activeTheme: "dark", // Default to dark for premium feel
      themeSetting: "auto",

      setThemeSetting: (setting) => {
        set({
          themeSetting: setting,
          activeTheme: getActiveTheme(setting),
        });
      },

      toggleTheme: () => {
        const { themeSetting } = get();
        // Cycle through: auto -> light -> dark -> auto
        const nextSetting: ThemeSetting =
          themeSetting === "auto" ? "light" :
          themeSetting === "light" ? "dark" : "auto";

        set({
          themeSetting: nextSetting,
          activeTheme: getActiveTheme(nextSetting),
        });
      },

      updateAutoTheme: () => {
        const { themeSetting } = get();
        if (themeSetting === "auto") {
          set({ activeTheme: getActiveTheme("auto") });
        }
      },
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrate: () => (state) => {
        // Update auto theme on app start
        if (state?.themeSetting === "auto") {
          state.activeTheme = getActiveTheme("auto");
        }
      },
    }
  )
);

// TORO Premium Theme Colors - Gold & Fire
export const themeColors = {
  light: {
    // Background colors
    bg: "#FAF9F7",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    border: "#E8E4DD",
    borderSubtle: "#F0EDE8",

    // Text colors
    text: "#1A1A1A",
    textSecondary: "#3D3D3D",
    muted: "#6B7280",

    // Brand colors - TORO Gold
    accent: "#A67C3D",
    accentLight: "#C9A55C",
    accentDark: "#8B6914",
    gold: "#C9A55C",
    goldLight: "#D4AF61",
    goldDark: "#A67C3D",

    // Fire accents
    fire: "#E8712C",
    fireLight: "#F59E0B",
    fireDark: "#C2410C",
    ember: "#FFA726",

    // Status colors
    danger: "#DC2626",
    dangerLight: "#FEE2E2",
    success: "#16A34A",
    successLight: "#DCFCE7",
    warning: "#D97706",
    warningLight: "#FEF3C7",
    info: "#2563EB",
    infoLight: "#DBEAFE",

    // Special
    overlay: "rgba(0, 0, 0, 0.5)",
    glass: "rgba(255, 255, 255, 0.95)",
    shimmer: "#F5F5F5",
  },
  dark: {
    // Background colors - Premium dark
    bg: "#0D0E12",
    surface: "#141619",
    surfaceElevated: "#1A1D21",
    border: "#2A2D35",
    borderSubtle: "#1F2228",

    // Text colors
    text: "#F5F5F5",
    textSecondary: "#E0E0E0",
    muted: "#9CA3AF",

    // Brand colors - TORO Gold (vibrant for dark mode)
    accent: "#C9A55C",
    accentLight: "#D4AF61",
    accentDark: "#A67C3D",
    gold: "#C9A55C",
    goldLight: "#D4AF61",
    goldDark: "#A67C3D",

    // Fire accents (more vibrant on dark)
    fire: "#F97316",
    fireLight: "#FB923C",
    fireDark: "#EA580C",
    ember: "#FFAB40",

    // Status colors (brighter for dark mode)
    danger: "#EF4444",
    dangerLight: "rgba(239, 68, 68, 0.15)",
    success: "#22C55E",
    successLight: "rgba(34, 197, 94, 0.15)",
    warning: "#F59E0B",
    warningLight: "rgba(245, 158, 11, 0.15)",
    info: "#3B82F6",
    infoLight: "rgba(59, 130, 246, 0.15)",

    // Special
    overlay: "rgba(0, 0, 0, 0.7)",
    glass: "rgba(20, 22, 25, 0.92)",
    shimmer: "#1F2228",
  },
};

// Hook to get current theme colors
export const useThemeColors = () => {
  const { activeTheme } = useThemeStore();
  return themeColors[activeTheme];
};

// Hook to get theme setting label
export const useThemeSettingLabel = () => {
  const { themeSetting } = useThemeStore();
  switch (themeSetting) {
    case "auto": return "Auto";
    case "light": return "Claro";
    case "dark": return "Oscuro";
  }
};
