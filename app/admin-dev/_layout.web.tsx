// @ts-nocheck
import AdminShell from "@/components/admin/AdminShell";
import { Slot } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export default function AdminDevLayout() {
  return (
    <AdminShell basePath="/admin-dev">
      <View className="bg-warning-100 border border-warning-300 rounded-xl p-3 mb-4">
        <Text className="text-sm font-JakartaSemiBold text-warning-800">
          Dev mode: admin without login
        </Text>
        <Text className="text-xs font-JakartaRegular text-warning-800 mt-1">
          Route: /admin-dev
        </Text>
      </View>
      <Slot />
    </AdminShell>
  );
}
