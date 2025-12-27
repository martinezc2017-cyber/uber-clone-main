import { Stack } from "expo-router";
import { View } from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

const Layout = () => {
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
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="search" />
        <Stack.Screen name="find-ride" />
        <Stack.Screen name="confirm-ride" />
        <Stack.Screen name="book-ride" />
        <Stack.Screen name="pick-location" />
      </Stack>
    </View>
  );
};

export default Layout;