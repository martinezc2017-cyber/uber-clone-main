import { Stack } from "expo-router";

export default function ShopLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="cars" />
      <Stack.Screen name="themes" />
      <Stack.Screen name="avatars" />
      <Stack.Screen name="inventory" />
    </Stack>
  );
}
