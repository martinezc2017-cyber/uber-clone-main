/**
 * ThemeToggle - Button to toggle between auto/light/dark themes
 */

import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { useThemeStore, useThemeColors, useThemeSettingLabel } from "@/store/themeStore";

interface ThemeToggleProps {
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { themeSetting, activeTheme, toggleTheme, setThemeSetting } = useThemeStore();
  const colors = useThemeColors();
  const label = useThemeSettingLabel();

  if (compact) {
    // Compact version - just an icon/button
    return (
      <TouchableOpacity
        onPress={toggleTheme}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 10,
        }}
      >
        <Text style={{ fontSize: 18 }}>
          {themeSetting === "auto" ? "🔄" : activeTheme === "dark" ? "🌙" : "☀️"}
        </Text>
      </TouchableOpacity>
    );
  }

  // Full version with options
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 12,
        }}
      >
        Tema de la App
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {/* Auto */}
        <TouchableOpacity
          onPress={() => setThemeSetting("auto")}
          style={{
            flex: 1,
            backgroundColor: themeSetting === "auto" ? colors.accent : colors.bg,
            borderColor: themeSetting === "auto" ? colors.accent : colors.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20, marginBottom: 4 }}>🔄</Text>
          <Text
            style={{
              color: themeSetting === "auto" ? "#FFFFFF" : colors.text,
              fontSize: 12,
              fontWeight: "500",
            }}
          >
            Auto
          </Text>
        </TouchableOpacity>

        {/* Light */}
        <TouchableOpacity
          onPress={() => setThemeSetting("light")}
          style={{
            flex: 1,
            backgroundColor: themeSetting === "light" ? colors.accent : colors.bg,
            borderColor: themeSetting === "light" ? colors.accent : colors.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20, marginBottom: 4 }}>☀️</Text>
          <Text
            style={{
              color: themeSetting === "light" ? "#FFFFFF" : colors.text,
              fontSize: 12,
              fontWeight: "500",
            }}
          >
            Claro
          </Text>
        </TouchableOpacity>

        {/* Dark */}
        <TouchableOpacity
          onPress={() => setThemeSetting("dark")}
          style={{
            flex: 1,
            backgroundColor: themeSetting === "dark" ? colors.accent : colors.bg,
            borderColor: themeSetting === "dark" ? colors.accent : colors.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20, marginBottom: 4 }}>🌙</Text>
          <Text
            style={{
              color: themeSetting === "dark" ? "#FFFFFF" : colors.text,
              fontSize: 12,
              fontWeight: "500",
            }}
          >
            Oscuro
          </Text>
        </TouchableOpacity>
      </View>

      {/* Current status */}
      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        {themeSetting === "auto"
          ? `Automático (${activeTheme === "dark" ? "noche" : "día"})`
          : `Modo ${label} activo`}
      </Text>
    </View>
  );
};

export default ThemeToggle;
