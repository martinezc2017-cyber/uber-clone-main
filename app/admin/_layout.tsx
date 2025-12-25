import { Slot } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export default function AdminLayoutNative() {
  return (
    <View className="flex-1 items-center justify-center bg-white p-6">
      <Text className="text-lg font-JakartaBold text-black text-center">
        Admin disponible solo en web
      </Text>
      <Text className="text-sm font-JakartaRegular text-general-200 text-center mt-2">
        Abrí el panel en un navegador para administrar drivers y tarifas.
      </Text>
      <Slot />
    </View>
  );
}

