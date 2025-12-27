import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import DriverWaitlistForm from "@/components/DriverWaitlistForm";

const DriverWaitlist = () => {
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0b0f14" }}
      contentContainerStyle={{ padding: 18, paddingTop: 40, paddingBottom: 40, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>
            Lista de espera de drivers
          </Text>
          <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
            Comparte tu info y te activamos en cuanto haya cupo.
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={{ color: "#e2e8f0", fontSize: 13, fontWeight: "700" }}>Cerrar</Text>
        </Pressable>
      </View>

      <View
        style={{
          backgroundColor: "rgba(34,197,94,0.08)",
          borderWidth: 1,
          borderColor: "rgba(34,197,94,0.25)",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <Text style={{ color: "#bbf7d0", fontSize: 13, marginBottom: 4 }}>
          Beneficios
        </Text>
        <Text style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 18 }}>
          Prioridad para rutas largas, verificación rápida y recordatorios cuando la zona se
          quede sin conductores.
        </Text>
      </View>

      <DriverWaitlistForm variant="dark" source="driver-app" />
    </ScrollView>
  );
};

export default DriverWaitlist;
