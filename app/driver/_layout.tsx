import React from "react";
import { Stack } from "expo-router";

export default function DriverLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="session-summary" options={{ headerShown: false }} />
      <Stack.Screen name="menu" options={{ headerShown: false }} />
      <Stack.Screen name="menu/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="navigation" options={{ headerShown: false }} />
      <Stack.Screen name="trip" options={{ headerShown: false }} />
    </Stack>
  );
}
