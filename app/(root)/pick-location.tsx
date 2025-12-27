import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";

import { icons } from "@/constants";
import { useLocationStore } from "@/store";
import Screen from "@/components/layout/Screen";

const PickLocationScreen = () => {
  const params = useLocalSearchParams<{ type: "pickup" | "destination" }>();
  const locationType = params.type || "destination";

  const {
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
    setUserLocation,
    setDestinationLocation,
  } = useLocationStore();

  const mapRef = useRef<MapView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Initial region based on location type
  const getInitialRegion = (): Region => {
    if (locationType === "pickup" && userLatitude && userLongitude) {
      return {
        latitude: userLatitude,
        longitude: userLongitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    if (locationType === "destination" && destinationLatitude && destinationLongitude) {
      return {
        latitude: destinationLatitude,
        longitude: destinationLongitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    if (userLatitude && userLongitude) {
      return {
        latitude: userLatitude,
        longitude: userLongitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    // Default to Phoenix, AZ
    return {
      latitude: 33.4484,
      longitude: -112.074,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  };

  const [region, setRegion] = useState<Region>(getInitialRegion());

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (latitude: number, longitude: number) => {
    setIsLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "rideshare-app/1.0",
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const displayName = data.display_name || "";
        setAddress(displayName);
        setSelectedLocation({ latitude, longitude });
      } else {
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setSelectedLocation({ latitude, longitude });
      }
    } catch (error) {
      console.warn("Reverse geocode error:", error);
      setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      setSelectedLocation({ latitude, longitude });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle region change (when user stops dragging the map)
  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    reverseGeocode(newRegion.latitude, newRegion.longitude);
  };

  // Center map on current location
  const centerOnCurrentLocation = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission denied");
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      mapRef.current?.animateToRegion(newRegion, 500);
      setRegion(newRegion);
      reverseGeocode(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.warn("Error getting current location:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm location selection
  const handleConfirm = () => {
    if (!selectedLocation || !address) return;

    if (locationType === "pickup") {
      setUserLocation({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: address,
      });
    } else {
      setDestinationLocation({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: address,
      });
    }

    router.back();
  };

  // Initial geocode on mount
  useEffect(() => {
    const initialRegion = getInitialRegion();
    reverseGeocode(initialRegion.latitude, initialRegion.longitude);
  }, []);

  return (
    <Screen>
      <SafeAreaView className="flex-1">
    {/* Header */}
    <View className="flex-row items-center justify-between px-4 py-3 border-b border-app-border bg-app-surface z-10">
      <TouchableOpacity
        onPress={() => router.back()}
        className="w-10 h-10 items-center justify-center"
      >
        <Image source={icons.backArrow} className="w-6 h-6" resizeMode="contain" />
      </TouchableOpacity>
      <Text className="text-lg font-JakartaBold text-app-text">
        {locationType === "pickup" ? "Set Pickup Location" : "Set Destination"}
      </Text>
      <View className="w-10" />
    </View>

      {/* Map */}
      <View className="flex-1 relative">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        />

        {/* Center Pin (fixed in the middle) */}
        <View
          className="absolute items-center justify-center"
          style={{
            top: "50%",
            left: "50%",
            marginLeft: -20,
            marginTop: -40,
          }}
          pointerEvents="none"
        >
          <Image
            source={icons.pin}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </View>

        {/* Current Location Button */}
        <TouchableOpacity
          onPress={centerOnCurrentLocation}
          className="absolute bottom-32 right-4 w-12 h-12 bg-app-surface border border-app-border rounded-full items-center justify-center shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Image source={icons.target} className="w-6 h-6" resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* Bottom Card */}
      <View className="bg-app-surface px-4 py-4 border-t border-app-border">
        {/* Address Display */}
        <View className="flex-row items-start mb-4">
          <View className="w-10 h-10 rounded-full bg-app-bg items-center justify-center mr-3">
            <Image
              source={locationType === "pickup" ? icons.point : icons.pin}
              className="w-5 h-5"
              resizeMode="contain"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-app-muted mb-1">
              {locationType === "pickup" ? "Pickup Location" : "Destination"}
            </Text>
            {isLoading ? (
              <ActivityIndicator size="small" color="#8B6A3F" />
            ) : (
              <Text className="text-sm font-JakartaMedium text-app-text" numberOfLines={2}>
                {address || "Move the map to select location"}
              </Text>
            )}
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!selectedLocation || isLoading}
          className={`py-4 rounded-xl items-center ${
            selectedLocation && !isLoading ? "bg-app-accent" : "bg-app-bg border border-app-border"
          }`}
        >
          <Text
            className={`text-base font-JakartaBold ${
              selectedLocation && !isLoading ? "text-white" : "text-app-muted"
            }`}
          >
            Confirm Location
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    </Screen>
  );
};

export default PickLocationScreen;
