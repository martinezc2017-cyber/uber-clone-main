import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

// Dark glass card style (same as index.tsx)
const glassCard = {
  backgroundColor: "rgba(12, 15, 20, 0.85)",
  borderColor: "rgba(255, 255, 255, 0.08)",
  borderWidth: 1,
  borderRadius: 22,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 18,
  elevation: 12,
};

const slugToTitle = (slug: string) => {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export default function DriverMenuDetail() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const router = useRouter();
  const title = slug ? slugToTitle(slug) : "Menu";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0f14" }}
      contentContainerStyle={{ paddingTop: 50, padding: 16, gap: 12, paddingBottom: 36 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={() => router.replace("/(tabs)/menu")}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.1)",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 16 }}>{"<"}</Text>
        </Pressable>
        <Text
          style={{
            color: "#ffffff",
            fontSize: 20,
            fontFamily: "Jakarta-ExtraBold, system-ui, sans-serif",
          }}
        >
          {title}
        </Text>
      </View>

      <View
        style={{
          ...glassCard,
          padding: 16,
          gap: 8,
        }}
      >
        <Text
          style={{
            color: "#ffffff",
            fontSize: 16,
            fontFamily: "Jakarta-Bold, system-ui, sans-serif",
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            fontFamily: "Jakarta-Regular, system-ui, sans-serif",
          }}
        >
          Esta seccion esta lista para integrarse con tu backend. Usa este flujo para
          mostrar formularios, listas o enlaces segun el modulo seleccionado ({slug}).
        </Text>
      </View>
    </ScrollView>
  );
}
