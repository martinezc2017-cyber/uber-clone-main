/**
 * GlassCard - Premium glass-morphism card component
 * TORO Design System - Gold accented glass effects
 */

import React from "react";
import { View, ViewStyle } from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "elevated" | "subtle" | "gold";
  padding?: number;
}

export const glassStyles = {
  dark: {
    default: {
      backgroundColor: "rgba(20, 22, 25, 0.85)",
      borderColor: "rgba(201, 165, 92, 0.12)", // Gold tint
      borderWidth: 1,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    elevated: {
      backgroundColor: "rgba(26, 29, 33, 0.95)",
      borderColor: "rgba(201, 165, 92, 0.18)", // Gold tint
      borderWidth: 1,
      borderRadius: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.5,
      shadowRadius: 24,
      elevation: 16,
    },
    subtle: {
      backgroundColor: "rgba(255, 255, 255, 0.04)",
      borderColor: "rgba(255, 255, 255, 0.06)",
      borderWidth: 1,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    gold: {
      backgroundColor: "rgba(201, 165, 92, 0.08)",
      borderColor: "rgba(201, 165, 92, 0.25)",
      borderWidth: 1,
      borderRadius: 20,
      shadowColor: "#C9A55C",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
  },
  light: {
    default: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "rgba(166, 124, 61, 0.12)", // Gold tint
      borderWidth: 1,
      borderRadius: 20,
      shadowColor: "#A67C3D",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 8,
    },
    elevated: {
      backgroundColor: "#FFFFFF",
      borderColor: "rgba(166, 124, 61, 0.15)", // Gold tint
      borderWidth: 1,
      borderRadius: 24,
      shadowColor: "#A67C3D",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 12,
    },
    subtle: {
      backgroundColor: "rgba(0, 0, 0, 0.02)",
      borderColor: "rgba(0, 0, 0, 0.05)",
      borderWidth: 1,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    gold: {
      backgroundColor: "rgba(201, 165, 92, 0.06)",
      borderColor: "rgba(166, 124, 61, 0.2)",
      borderWidth: 1,
      borderRadius: 20,
      shadowColor: "#A67C3D",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = "default",
  padding = 16,
}) => {
  const { activeTheme } = useThemeStore();
  const cardStyle = glassStyles[activeTheme][variant];

  return (
    <View style={[cardStyle, { padding }, style]}>
      {children}
    </View>
  );
};

// Inner card for nested content with gold accent
export const InnerCard: React.FC<GlassCardProps> = ({
  children,
  style,
  padding = 12,
}) => {
  const { activeTheme } = useThemeStore();

  const innerStyle = {
    backgroundColor: activeTheme === "dark"
      ? "rgba(201, 165, 92, 0.05)" // Subtle gold tint
      : "rgba(166, 124, 61, 0.04)",
    borderColor: activeTheme === "dark"
      ? "rgba(201, 165, 92, 0.12)"
      : "rgba(166, 124, 61, 0.1)",
    borderWidth: 1,
    borderRadius: 14,
  };

  return (
    <View style={[innerStyle, { padding }, style]}>
      {children}
    </View>
  );
};

// Hook to get current glass card styles
export const useGlassStyle = (variant: "default" | "elevated" | "subtle" | "gold" = "default") => {
  const { activeTheme } = useThemeStore();
  return glassStyles[activeTheme][variant];
};

// Hook to get theme-aware text colors
export const useTextColors = () => {
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];

  return {
    primary: colors.text,
    secondary: colors.muted,
    accent: colors.accent,
    gold: colors.gold,
    fire: colors.fire,
    danger: colors.danger,
    success: colors.success,
    warning: colors.warning,
  };
};

export default GlassCard;
