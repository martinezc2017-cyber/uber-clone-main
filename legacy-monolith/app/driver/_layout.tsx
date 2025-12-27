import React from "react";
import { Stack } from "expo-router";
import { View } from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

export default function DriverLayout() {
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="session-summary" />
        <Stack.Screen name="menu" />
        <Stack.Screen name="menu/[slug]" />
        <Stack.Screen name="navigation" />
        <Stack.Screen name="trip" />
        <Stack.Screen name="premium-nav" />
        <Stack.Screen name="fare-breakdown" />
      </Stack>
    </View>
  );
}
