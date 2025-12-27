/**
 * Screen - Base screen wrapper with theme-aware background
 * TORO Design System
 */

import React from "react";
import { View } from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function Screen({ children, className = "" }: Props) {
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg }}
      className={className}
    >
      {children}
    </View>
  );
}
