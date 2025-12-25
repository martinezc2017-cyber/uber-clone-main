import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import GoogleTextInput from "@/components/GoogleTextInput";
import { useLocationStore } from "@/store";

type LocationResult = {
  latitude: number;
  longitude: number;
  address: string;
};

const SearchScreen = () => {
  const {
    userLatitude,
    userLongitude,
    userAddress,
    setUserLocation,
    setDestinationLocation,
    destinationHistory,
    removeFromHistory,
    addToHistory,
  } = useLocationStore();

  const [origin, setOrigin] = useState<LocationResult | null>(null);
  const [destination, setDestination] = useState<LocationResult | null>(null);

  const quickShortcuts = useMemo(
    () =>
      destinationHistory.slice(0, 3).map((item) => ({
        label: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        address: item.address,
      })),
    [destinationHistory],
  );

  useEffect(() => {
    if (userLatitude && userLongitude && userAddress) {
      setOrigin({
        latitude: userLatitude,
        longitude: userLongitude,
        address: userAddress,
      });
    }
  }, [userLatitude, userLongitude, userAddress]);

  const handleConfirm = () => {
    if (origin) {
      setUserLocation({
        latitude: origin.latitude,
        longitude: origin.longitude,
        address: origin.address,
      });
    }
    if (destination) {
      setDestinationLocation({
        latitude: destination.latitude,
        longitude: destination.longitude,
        address: destination.address,
      });
      addToHistory(destination.address, destination.latitude, destination.longitude);
      router.push("/(root)/find-ride");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-lg font-JakartaSemiBold">✕</Text>
        </TouchableOpacity>
        <Text className="text-lg font-JakartaSemiBold">Destination</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Pills */}
      <View className="flex-row px-4 py-3 gap-2">
        {["Business", "Schedule ahead", "Change rider"].map((label, idx) => (
          <View
            key={label}
            className={`px-3 py-2 rounded-full border ${
              idx === 0 ? "bg-black border-black" : "bg-white border-gray-300"
            }`}
          >
            <Text
              className={`text-xs font-JakartaMedium ${idx === 0 ? "text-white" : "text-gray-700"}`}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView className="px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <View className="flex-row items-center px-4 pt-4 pb-3">
            <View className="w-3 h-3 rounded-full bg-blue-600 mr-3" />
            <View className="flex-1">
              <Text className="text-xs text-gray-500">Start</Text>
              <Text className="text-sm font-JakartaMedium">
                {origin?.address || "Current location"}
              </Text>
            </View>
          </View>
          <View className="px-4 pb-3">
            <GoogleTextInput
              icon={undefined}
              initialLocation="Set different origin"
              containerStyle="bg-gray-50"
              handlePress={(loc) => setOrigin(loc)}
            />
            <TouchableOpacity
              onPress={() => router.push("/(root)/pin-location?type=origin")}
              className="mt-2 flex-row items-center justify-between"
            >
              <Text className="text-xs text-purple-600 font-JakartaSemiBold">Pin on map</Text>
              <Text className="text-xs text-gray-400">Tap to drop pin</Text>
            </TouchableOpacity>
          </View>

          <View className="px-4 pb-4">
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-pink-500 mr-3" />
              <View className="flex-1">
                <Text className="text-xs text-gray-500">Destination</Text>
              </View>
            </View>
            <View className="mt-2">
              <GoogleTextInput
                icon={undefined}
                initialLocation="Destination"
                containerStyle="bg-gray-50"
                handlePress={(loc) => setDestination(loc)}
              />
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(root)/pin-location?type=destination")}
              className="mt-2 flex-row items-center justify-between"
            >
              <Text className="text-xs text-purple-600 font-JakartaSemiBold">Pin on map</Text>
              <Text className="text-xs text-gray-400">Tap to drop pin</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick shortcuts */}
        {quickShortcuts.length > 0 && (
          <View className="mt-4">
            {quickShortcuts.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                className="flex-row items-center justify-between py-3 border-b border-gray-100"
                onPress={() => {
                  setDestination({
                    latitude: item.latitude,
                    longitude: item.longitude,
                    address: item.address,
                  });
                  handleConfirm();
                }}
              >
                <View>
                  <Text className="text-sm font-JakartaSemiBold">{item.label}</Text>
                  <Text className="text-xs text-gray-500">Recent search</Text>
                </View>
                <Text className="text-xs text-gray-400">Tap to select</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {destinationHistory.length > 0 && (
          <View className="mt-4">
            <Text className="text-xs text-gray-500 mb-2">Recent searches</Text>
            {destinationHistory.map((item) => (
              <View
                key={item.id}
                className="py-3 border-b border-gray-100 flex-row items-center justify-between"
              >
                <TouchableOpacity
                  className="flex-1 mr-2"
                  onPress={() => {
                    const dest = {
                      latitude: item.latitude,
                      longitude: item.longitude,
                      address: item.address,
                    };
                    setDestination(dest);
                    handleConfirm();
                  }}
                >
                  <Text className="text-sm font-JakartaMedium">{item.address}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeFromHistory(item.id)}>
                  <Text className="text-xs text-red-500">Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View className="mt-4">
          <TouchableOpacity className="py-3 border-b border-gray-100">
            <Text className="text-sm text-purple-600 font-JakartaSemiBold">Add work</Text>
          </TouchableOpacity>
          <TouchableOpacity className="py-3 border-b border-gray-100">
            <Text className="text-sm text-purple-600 font-JakartaSemiBold">Add custom shortcut</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View className="px-4 py-3 bg-white border-t border-gray-200">
        <TouchableOpacity
          className={`rounded-full py-3 ${destination ? "bg-black" : "bg-gray-300"}`}
          disabled={!destination}
          onPress={handleConfirm}
        >
          <Text className="text-white text-center font-JakartaSemiBold text-base">
            Buscar
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default SearchScreen;
