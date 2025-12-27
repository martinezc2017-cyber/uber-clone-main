/**
 * TORO Theme
 * Low-contrast premium palette with day/night variants.
 */
export const ToroColorsDay = {
  bg: "#F4F2EE",
  surface: "#FFFFFF",
  border: "#E4E0D9",
  text: "#141414",
  muted: "#5F6672",
  accent: "#8B6A3F",
  danger: "#E11D48",
  success: "#16A34A",
  warning: "#D97706",
};

export const ToroColorsNight = {
  bg: "#0B0D10",
  surface: "#12161C",
  border: "#232A33",
  text: "#E7E9EE",
  muted: "#A6ADBB",
  accent: "#9B7A4A",
  danger: "#FB7185",
  success: "#22C55E",
  warning: "#F59E0B",
};

/**
 * Backwards-compatible alias:
 * The project previously imported `SwissColors`.
 * Keep the name exported so existing screens keep working.
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
  info: "#3B82F6",
  accent: ToroColorsDay.accent,
  muted: ToroColorsDay.muted,
  card: ToroColorsDay.surface,
  cardBorder: ToroColorsDay.border,
  // Optional extras referenced in admin web screens
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
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
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
  },
};

export default ToroTheme;
