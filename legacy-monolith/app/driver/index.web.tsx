import React from "react";
import { View, Text, ScrollView } from "react-native";

export default function DriverHome() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0f14" }}
      contentContainerStyle={{ paddingTop: 60, padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
          Driver App
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textAlign: "center" }}>
          Please use the mobile app (Expo Go) on your Android device to access the driver interface.
        </Text>
      </View>
    </ScrollView>
  );
}
