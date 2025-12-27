/**
 * ToroInput - Premium themed text input
 * TORO Design System
 */

import React from "react";
import { View, TextInput, TextInputProps, ViewStyle } from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

interface ToroInputProps extends TextInputProps {
  containerStyle?: ViewStyle;
}

export default function ToroInput({ containerStyle, style, ...props }: ToroInputProps) {
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const isDark = activeTheme === "dark";

  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: isDark ? "rgba(201, 165, 92, 0.2)" : "rgba(166, 124, 61, 0.15)",
          borderRadius: 14,
          marginVertical: 8,
          backgroundColor: isDark ? colors.surface : "#F9F9F9",
        },
        containerStyle,
      ]}
    >
      <TextInput
        {...props}
        placeholderTextColor={colors.muted}
        style={[
          {
            padding: 14,
            color: colors.text,
            fontSize: 15,
            fontFamily: "Jakarta-Medium",
          },
          style,
        ]}
      />
    </View>
  );
}
