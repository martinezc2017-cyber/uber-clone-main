/**
 * TORO Premium Theme
 * Gold & Fire Design System with day/night variants
 */

export const ToroColorsDay = {
  // Backgrounds
  bg: "#FAF9F7",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  border: "#E8E4DD",
  borderSubtle: "#F0EDE8",

  // Text
  text: "#1A1A1A",
  textSecondary: "#3D3D3D",
  muted: "#6B7280",

  // TORO Gold
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

  // Status
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  success: "#16A34A",
  successLight: "#DCFCE7",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  info: "#2563EB",
  infoLight: "#DBEAFE",
};

export const ToroColorsNight = {
  // Backgrounds - Premium dark
  bg: "#0D0E12",
  surface: "#141619",
  surfaceElevated: "#1A1D21",
  border: "#2A2D35",
  borderSubtle: "#1F2228",

  // Text
  text: "#F5F5F5",
  textSecondary: "#E0E0E0",
  muted: "#9CA3AF",

  // TORO Gold (vibrant for dark)
  accent: "#C9A55C",
  accentLight: "#D4AF61",
  accentDark: "#A67C3D",
  gold: "#C9A55C",
  goldLight: "#D4AF61",
  goldDark: "#A67C3D",

  // Fire accents (vibrant on dark)
  fire: "#F97316",
  fireLight: "#FB923C",
  fireDark: "#EA580C",
  ember: "#FFAB40",

  // Status (brighter for dark)
  danger: "#EF4444",
  dangerLight: "rgba(239, 68, 68, 0.15)",
  success: "#22C55E",
  successLight: "rgba(34, 197, 94, 0.15)",
  warning: "#F59E0B",
  warningLight: "rgba(245, 158, 11, 0.15)",
  info: "#3B82F6",
  infoLight: "rgba(59, 130, 246, 0.15)",
};

/**
 * Backwards-compatible alias:
 * The project previously imported `SwissColors`.
 */
export const SwissColors = {
  primary: ToroColorsDay.accent,
  secondary: ToroColorsDay.muted,
  background: ToroColorsDay.bg,
  surface: ToroColorsDay.surface,
  textPrimary: ToroColorsDay.text,
  textSecondary: ToroColorsDay.muted,
  textMuted: "#9CA3AF",
  border: ToroColorsDay.border,
  error: ToroColorsDay.danger,
  success: ToroColorsDay.success,
  warning: ToroColorsDay.warning,
  info: ToroColorsDay.info,
  accent: ToroColorsDay.accent,
  gold: ToroColorsDay.gold,
  fire: ToroColorsDay.fire,
  muted: ToroColorsDay.muted,
  card: ToroColorsDay.surface,
  cardBorder: ToroColorsDay.border,
  // Extras for dark mode references
  surfaceDark: ToroColorsNight.surface,
  textLight: ToroColorsNight.text,
};

export const ToroTheme = {
  colors: {
    day: ToroColorsDay,
    night: ToroColorsNight,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 24,
    full: 9999,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  // Premium button styles
  buttons: {
    primary: {
      backgroundColor: "#C9A55C",
      pressedBackgroundColor: "#A67C3D",
      textColor: "#1A1A1A",
      borderRadius: 16,
      shadowColor: "#C9A55C",
      shadowOpacity: 0.3,
      shadowRadius: 12,
    },
    secondary: {
      backgroundColor: "rgba(201, 165, 92, 0.12)",
      pressedBackgroundColor: "rgba(201, 165, 92, 0.2)",
      textColor: "#C9A55C",
      borderRadius: 16,
      borderColor: "rgba(201, 165, 92, 0.25)",
      borderWidth: 1,
    },
    danger: {
      backgroundColor: "rgba(239, 68, 68, 0.12)",
      pressedBackgroundColor: "rgba(239, 68, 68, 0.2)",
      textColor: "#EF4444",
      borderRadius: 16,
      borderColor: "rgba(239, 68, 68, 0.25)",
      borderWidth: 1,
    },
    success: {
      backgroundColor: "rgba(34, 197, 94, 0.12)",
      pressedBackgroundColor: "rgba(34, 197, 94, 0.2)",
      textColor: "#22C55E",
      borderRadius: 16,
      borderColor: "rgba(34, 197, 94, 0.25)",
      borderWidth: 1,
    },
  },
};

export default ToroTheme;
