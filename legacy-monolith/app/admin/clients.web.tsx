import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SwissColors } from '@/constants/theme';

const ClientsPage = () => {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32, paddingRight: 4 }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: "SwissColors.surfaceDark",
          fontFamily: "Jakarta-Bold, system-ui, sans-serif",
          marginBottom: 12,
        }}
      >
        Clients
      </Text>
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "SwissColors.textPrimary",
          padding: 16,
        }}
      >
        <Text
          style={{
            color: "#475569",
            fontSize: 14,
            fontFamily: "Jakarta-Regular, system-ui, sans-serif",
          }}
        >
          No clients yet. Connect the clients backend to show them here.
        </Text>
      </View>
    </ScrollView>
  );
};

export default ClientsPage;

