import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";

const RideTracking = () => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-xl font-JakartaBold mb-2">Ride Tracking</Text>
        <Text className="text-gray-500 text-center">
          Tracking view coming soon. Please use the home screen to manage your active ride.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default RideTracking;
