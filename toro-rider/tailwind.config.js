/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
      extend: {
          fontFamily: {
              Jakarta: ["Jakarta", "sans-serif"],
              JakartaBold: ["Jakarta-Bold", "sans-serif"],
              JakartaExtraBold: ["Jakarta-ExtraBold", "sans-serif"],
              JakartaExtraLight: ["Jakarta-ExtraLight", "sans-serif"],
              JakartaLight: ["Jakarta-Light", "sans-serif"],
              JakartaMedium: ["Jakarta-Medium", "sans-serif"],
              JakartaSemiBold: ["Jakarta-SemiBold", "sans-serif"],
          },
          colors: {
              // TORO Premium Colors
              toro: {
                  // Light mode
                  bg: "#FAF9F7",
                  surface: "#FFFFFF",
                  border: "#E8E4DD",
                  text: "#1A1A1A",
                  muted: "#6B7280",
                  // Dark mode
                  bgDark: "#0D0E12",
                  surfaceDark: "#141619",
                  borderDark: "#2A2D35",
                  textDark: "#F5F5F5",
                  mutedDark: "#9CA3AF",
                  // Brand gold
                  gold: "#C9A55C",
                  goldLight: "#D4AF61",
                  goldDark: "#A67C3D",
                  // Fire accents
                  fire: "#F97316",
                  fireLight: "#FB923C",
                  ember: "#FFAB40",
              },
              // Primary gold scale
              primary: {
                  50: "#FDF8F0",
                  100: "#F9EED9",
                  200: "#F0D9A8",
                  300: "#E5C177",
                  400: "#D4AF61",
                  500: "#C9A55C", // TORO Gold
                  600: "#A67C3D",
                  700: "#8B6914",
                  800: "#6B5210",
                  900: "#4A380B",
              },
              // Fire/Orange accent scale
              fire: {
                  50: "#FFF7ED",
                  100: "#FFEDD5",
                  200: "#FED7AA",
                  300: "#FDBA74",
                  400: "#FB923C",
                  500: "#F97316", // Fire accent
                  600: "#EA580C",
                  700: "#C2410C",
                  800: "#9A3412",
                  900: "#7C2D12",
              },
              // Neutral scale for text/backgrounds
              neutral: {
                  50: "#FAF9F7",
                  100: "#F5F5F5",
                  200: "#E5E5E5",
                  300: "#D4D4D4",
                  400: "#A3A3A3",
                  500: "#737373",
                  600: "#525252",
                  700: "#404040",
                  800: "#262626",
                  900: "#171717",
                  950: "#0D0E12",
              },
              // App-specific aliases
              app: {
                  bg: "#FAF9F7",
                  surface: "#FFFFFF",
                  border: "#E8E4DD",
                  text: "#1A1A1A",
                  muted: "#6B7280",
                  accent: "#C9A55C",
              },
              "app-dark": {
                  bg: "#0D0E12",
                  surface: "#141619",
                  border: "#2A2D35",
                  text: "#F5F5F5",
                  muted: "#9CA3AF",
                  accent: "#C9A55C",
              },
              // Status colors
              success: {
                  100: "#DCFCE7",
                  200: "#BBF7D0",
                  300: "#86EFAC",
                  400: "#4ADE80",
                  500: "#22C55E",
                  600: "#16A34A",
                  700: "#15803D",
                  800: "#166534",
                  900: "#14532D",
              },
              danger: {
                  100: "#FEE2E2",
                  200: "#FECACA",
                  300: "#FCA5A5",
                  400: "#F87171",
                  500: "#EF4444",
                  600: "#DC2626",
                  700: "#B91C1C",
                  800: "#991B1B",
                  900: "#7F1D1D",
              },
              warning: {
                  100: "#FEF3C7",
                  200: "#FDE68A",
                  300: "#FCD34D",
                  400: "#FBBF24",
                  500: "#F59E0B",
                  600: "#D97706",
                  700: "#B45309",
                  800: "#92400E",
                  900: "#78350F",
              },
              info: {
                  100: "#DBEAFE",
                  200: "#BFDBFE",
                  300: "#93C5FD",
                  400: "#60A5FA",
                  500: "#3B82F6",
                  600: "#2563EB",
                  700: "#1D4ED8",
                  800: "#1E40AF",
                  900: "#1E3A8A",
              },
              // General utilities (legacy support)
              general: {
                  100: "#CED1DD",
                  200: "#858585",
                  300: "#EEEEEE",
                  400: "#22C55E",
                  500: "#F6F8FA",
                  600: "#E6F3FF",
                  700: "#EBEBEB",
                  800: "#ADADAD",
              },
          },
          // Custom box shadows with gold glow
          boxShadow: {
              'gold': '0 4px 14px rgba(201, 165, 92, 0.25)',
              'gold-lg': '0 8px 24px rgba(201, 165, 92, 0.35)',
              'gold-glow': '0 0 20px rgba(201, 165, 92, 0.4)',
              'fire': '0 4px 14px rgba(249, 115, 22, 0.25)',
              'fire-glow': '0 0 20px rgba(249, 115, 22, 0.4)',
          },
      },
  },
  plugins: [],
};
