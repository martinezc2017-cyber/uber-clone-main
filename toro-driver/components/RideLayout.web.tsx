import { icons } from "@/constants";
import { router } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

import Map from "@/components/Map";

const RideLayout = ({
  title,
  children,
  showMap = true,
  mapContent,
}: {
  title: string;
  children: React.ReactNode;
  snapPoints?: string[];
  showMap?: boolean;
  mapContent?: React.ReactNode;
}) => {
  return (
    <View className="flex-1 bg-white">
      <View className="relative bg-blue-500" style={{ height: 420 }}>
        <View className="flex flex-row absolute z-10 top-6 items-center justify-start px-5">
          <TouchableOpacity onPress={() => router.back()}>
            <View className="w-10 h-10 bg-white rounded-full items-center justify-center">
              <Image
                source={icons.backArrow}
                resizeMode="contain"
                className="w-6 h-6"
              />
            </View>
          </TouchableOpacity>
          <Text className="text-xl font-JakartaSemiBold ml-5">
            {title || "Go Back"}
          </Text>
        </View>

        {showMap && (mapContent ?? <Map />)}
      </View>

      <ScrollView
        style={{ flex: 1, padding: 20 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
};

export default RideLayout;
