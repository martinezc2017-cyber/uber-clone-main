import React from "react";
import { Text, View } from "react-native";

const AdminShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-lg font-JakartaBold text-black text-center">
        Admin disponible solo en web
      </Text>
      {children}
    </View>
  );
};

export default AdminShell;

