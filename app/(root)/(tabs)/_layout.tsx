import { icons } from "@/constants";
import { Tabs } from "expo-router";
import { Image, ImageSourcePropType, View } from "react-native";
import { useThemeStore, themeColors } from "@/store/themeStore";

const TabIcon = ({
  source,
  focused,
  colors,
}: {
  source: ImageSourcePropType;
  focused: boolean;
  colors: typeof themeColors.light;
}) => (
  <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? colors.accent : colors.surface,
        borderWidth: 1,
        borderColor: focused ? colors.accent : colors.border,
        shadowColor: focused ? colors.accent : "#000",
        shadowOffset: { width: 0, height: focused ? 4 : 2 },
        shadowOpacity: focused ? 0.3 : 0.1,
        shadowRadius: focused ? 8 : 4,
        elevation: focused ? 8 : 4,
      }}
    >
      <Image
        source={source}
        tintColor={focused ? "#1A1A1A" : colors.muted}
        resizeMode="contain"
        style={{ width: 28, height: 28 }}
      />
    </View>
  </View>
);

const Layout = () => {
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];

  return (
    <Tabs
      initialRouteName="home"
      sceneContainerStyle={{ backgroundColor: colors.bg }}
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: activeTheme === "dark"
            ? "rgba(20, 22, 25, 0.98)"
            : "rgba(255, 255, 255, 0.98)",
          borderRadius: 50,
          paddingBottom: 0,
          overflow: "hidden",
          marginHorizontal: 20,
          marginBottom: 20,
          height: 78,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexDirection: "row",
          position: "absolute",
          borderWidth: 1,
          borderColor: activeTheme === "dark" ? "rgba(201, 165, 92, 0.15)" : colors.border,
          shadowColor: activeTheme === "dark" ? colors.gold : "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: activeTheme === "dark" ? 0.2 : 0.15,
          shadowRadius: 16,
          elevation: 12,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} colors={colors} source={icons.home} />
          ),
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: "Rides",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} colors={colors} source={icons.list} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} colors={colors} source={icons.chat} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} colors={colors} source={icons.profile} />
          ),
        }}
      />
    </Tabs>
  );
};

export default Layout;
