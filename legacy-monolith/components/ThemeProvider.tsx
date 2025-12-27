/**
 * ThemeProvider - Applies dynamic theme colors and manages auto-update
 */

import React, { useEffect } from "react";
import { View, useColorScheme } from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { activeTheme, themeSetting, updateAutoTheme } = useThemeStore();
  const colors = themeColors[activeTheme];

  // Auto-update theme every minute when in auto mode
  useEffect(() => {
    if (themeSetting !== "auto") return;

    // Initial check
    updateAutoTheme();

    // Check every minute for time-based theme changes
    const interval = setInterval(() => {
      updateAutoTheme();
    }, 60000);

    return () => clearInterval(interval);
  }, [themeSetting, updateAutoTheme]);

  // Apply theme colors via inline styles only
  // Avoid NativeWind className here to prevent navigation context conflicts
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
      }}
    >
      {children}
    </View>
  );
};

export default ThemeProvider;
