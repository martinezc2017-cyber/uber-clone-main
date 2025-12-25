import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLocationStore } from "@/store";

const PinLocation = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const isOrigin = params?.type === "origin";
  const {
    userLatitude,
    userLongitude,
    userAddress,
    setUserLocation,
    setDestinationLocation,
  } = useLocationStore();

  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const defaultCoords = {
    latitude: userLatitude ?? 33.4152,
    longitude: userLongitude ?? -111.8315,
  };

  useEffect(() => {
    const getCurrent = async () => {
      if (userLatitude && userLongitude) {
        setMarker({ latitude: userLatitude, longitude: userLongitude });
        return;
      }
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const loc = await Location.getCurrentPositionAsync({});
        setMarker({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } finally {
        setLoading(false);
      }
    };
    getCurrent();
  }, [userLatitude, userLongitude]);

  const handleConfirm = () => {
    if (!marker) return;
    if (isOrigin) {
      setUserLocation({
        latitude: marker.latitude,
        longitude: marker.longitude,
        address: userAddress || "Pinned origin",
      });
    } else {
      setDestinationLocation({
        latitude: marker.latitude,
        longitude: marker.longitude,
        address: "Pinned destination",
      });
    }
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-lg font-JakartaSemiBold">✕</Text>
        </TouchableOpacity>
        <Text className="text-lg font-JakartaSemiBold">
          Pin {isOrigin ? "origin" : "destination"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View className="flex-1">
        {loading && (
          <View className="absolute inset-0 z-10 items-center justify-center bg-white/60">
            <ActivityIndicator size="large" />
          </View>
        )}
        <MapView
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: marker?.latitude ?? defaultCoords.latitude,
            longitude: marker?.longitude ?? defaultCoords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={(e) => setMarker(e.nativeEvent.coordinate)}
          showsUserLocation
        >
          {marker && <Marker coordinate={marker} draggable onDragEnd={(e) => setMarker(e.nativeEvent.coordinate)} />}
        </MapView>
      </View>

      <View className="px-4 py-3 bg-white border-t border-gray-200">
        <TouchableOpacity
          className={`rounded-full py-3 ${marker ? "bg-black" : "bg-gray-300"}`}
          disabled={!marker}
          onPress={handleConfirm}
        >
          <Text className="text-white text-center font-JakartaSemiBold text-base">
            Confirm {isOrigin ? "origin" : "destination"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PinLocation;
