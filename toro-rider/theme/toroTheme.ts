/**
 * TORO Theme - Premium Gold & Fire Design System
 * Re-export from main theme store for backwards compatibility
 */

import { themeColors } from "@/store/themeStore";

// Export both light and dark colors
export const ToroColors = {
  // Dark theme colors (primary)
  background: themeColors.dark.bg,
  surface: themeColors.dark.surface,
  surfaceElevated: themeColors.dark.surfaceElevated,
  border: themeColors.dark.border,

  // Brand gold
  gold: themeColors.dark.gold,
  goldLight: themeColors.dark.goldLight,
  goldDark: themeColors.dark.goldDark,
  goldSoft: "rgba(201, 165, 92, 0.15)",

  // Fire accents
  fire: themeColors.dark.fire,
  fireLight: themeColors.dark.fireLight,
  ember: themeColors.dark.ember,

  // Text
  textPrimary: themeColors.dark.text,
  textSecondary: themeColors.dark.muted,

  // Status
  success: themeColors.dark.success,
  danger: themeColors.dark.danger,
  warning: themeColors.dark.warning,
  info: themeColors.dark.info,
};

export const ToroColorsLight = {
  background: themeColors.light.bg,
  surface: themeColors.light.surface,
  surfaceElevated: themeColors.light.surfaceElevated,
  border: themeColors.light.border,

  gold: themeColors.light.gold,
  goldLight: themeColors.light.goldLight,
  goldDark: themeColors.light.goldDark,
  goldSoft: "rgba(166, 124, 61, 0.1)",

  fire: themeColors.light.fire,
  fireLight: themeColors.light.fireLight,
  ember: themeColors.light.ember,

  textPrimary: themeColors.light.text,
  textSecondary: themeColors.light.muted,

  success: themeColors.light.success,
  danger: themeColors.light.danger,
  warning: themeColors.light.warning,
  info: themeColors.light.info,
};

export default ToroColors;
