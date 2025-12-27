/**
 * GlassCard - Simple glass-morphism card for UI
 * TORO Design System
 */

import React from "react";
import { View, ViewStyle } from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export default function GlassCard({ children, style, padding = 20 }: GlassCardProps) {
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const isDark = activeTheme === "dark";

  return (
    <View
      style={[
        {
          backgroundColor: isDark ? "rgba(20, 22, 25, 0.85)" : "rgba(255, 255, 255, 0.95)",
          borderRadius: 20,
          padding,
          borderWidth: 1,
          borderColor: isDark ? "rgba(201, 165, 92, 0.12)" : "rgba(166, 124, 61, 0.12)",
          shadowColor: isDark ? "#000" : colors.gold,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.4 : 0.08,
          shadowRadius: 16,
          elevation: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
