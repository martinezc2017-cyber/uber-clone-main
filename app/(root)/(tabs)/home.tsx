import { useUser } from "@clerk/clerk-expo";
import { useAuth } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import RideCard from "@/components/RideCard";
import { icons, images } from "@/constants";
import { useFetch, fetchAPI } from "@/lib/fetch";
import { useLocationStore, useDriverStore } from "@/store";
import { Ride } from "@/types/type";

const decodePolyline = (encoded: string, precision = 5) => {
  const factor = Math.pow(10, precision);
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ latitude: lat / factor, longitude: lng / factor });
  }

  return points;
};

const Home = () => {
  const { user } = useUser();
  const { signOut } = useAuth();

  const { setUserLocation, setDestinationLocation, clearDestinationLocation } = useLocationStore();
  const { setDrivers } = useDriverStore();

  const handleSignOut = () => {
    signOut();
    router.replace("/(auth)/sign-in");
  };

  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [checkingActiveRide, setCheckingActiveRide] = useState(true);
  const [rideExpanded, setRideExpanded] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<{ text: string; at: string } | null>(null);
  const arrowRotation = rideExpanded ? "180deg" : "0deg";

  const {
    data: recentRides,
    loading,
    error,
  } = useFetch<Ride[]>(`/api/ride/${user?.id}`);

  // Check for active ride on mount
  useEffect(() => {
    const checkActiveRide = async () => {
      if (!user?.id) {
        setCheckingActiveRide(false);
        return;
      }

      try {
        const res = await fetchAPI(`/api/ride/active?clerk_id=${user.id}`);
        if (res?.data) {
          setActiveRide(res.data);
        } else {
          // No active ride - clear any persisted destination from previous session
          clearDestinationLocation();
        }
      } catch (e) {
        console.warn("Error checking active ride:", e);
        // On error, also clear destination to be safe
        clearDestinationLocation();
      } finally {
        setCheckingActiveRide(false);
      }
    };

    checkActiveRide();
  }, [user?.id]);

  // Fetch mini-map route for the active ride
  useEffect(() => {
    const fetchRoute = async () => {
      if (!activeRide?.origin_latitude || !activeRide?.destination_latitude) {
        setRouteCoords([]);
        return;
      }

      try {
        const origin = `${activeRide.origin_longitude},${activeRide.origin_latitude}`;
        const destination = `${activeRide.destination_longitude},${activeRide.destination_latitude}`;
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=polyline`
        );
        if (!res.ok) {
          setRouteCoords([
            { latitude: Number(activeRide.origin_latitude), longitude: Number(activeRide.origin_longitude) },
            { latitude: Number(activeRide.destination_latitude), longitude: Number(activeRide.destination_longitude) },
          ]);
          return;
        }
        const data = await res.json();
        const poly = data?.routes?.[0]?.geometry;
        if (poly) {
          const decoded = decodePolyline(poly, 5);
          setRouteCoords(decoded);
        }
      } catch (err) {
        console.warn("mini route error", err);
        setRouteCoords([
          { latitude: Number(activeRide.origin_latitude), longitude: Number(activeRide.origin_longitude) },
          { latitude: Number(activeRide.destination_latitude), longitude: Number(activeRide.destination_longitude) },
        ]);
      }
    };

    fetchRoute();
  }, [activeRide?.origin_latitude, activeRide?.origin_longitude, activeRide?.destination_latitude, activeRide?.destination_longitude]);

  // Handle resuming active ride
  const handleResumeRide = useCallback(() => {
    if (!activeRide) return;

    // Set location stores with ride data
    setUserLocation({
      latitude: Number(activeRide.origin_latitude),
      longitude: Number(activeRide.origin_longitude),
      address: activeRide.origin_address || "",
    });

    setDestinationLocation({
      latitude: Number(activeRide.destination_latitude),
      longitude: Number(activeRide.destination_longitude),
      address: activeRide.destination_address || "",
    });

    // Set driver info if available
    if (activeRide.driver) {
      setDrivers([{
        id: activeRide.driver.id ?? activeRide.driver.driver_id ?? 0,
        first_name: activeRide.driver.first_name ?? "",
        last_name: activeRide.driver.last_name ?? "",
        profile_image_url: activeRide.driver.profile_image_url ?? "",
        car_image_url: activeRide.driver.car_image_url ?? "",
        car_seats: activeRide.driver.car_seats ?? 0,
        rating: activeRide.driver.rating ?? 0,
        price: activeRide.fare_price ? (Number(activeRide.fare_price) / 100).toFixed(2) : "0",
        time: activeRide.ride_time || 0,
        distance: "0",
        latitude: Number(activeRide.origin_latitude),
        longitude: Number(activeRide.origin_longitude),
        title: `${activeRide.driver.first_name ?? ""} ${activeRide.driver.last_name ?? ""}`.trim(),
      }]);
    }

    // Navigate to book-ride which will resume the ride
    router.push("/(root)/book-ride");
  }, [activeRide, setUserLocation, setDestinationLocation, setDrivers]);

  // Handle cancellation with fee preview
  const handleCancelRide = useCallback(async () => {
    if (!activeRide) return;

    setCancelling(true);
    try {
      const feeRes = await fetchAPI(`/api/ride/cancel?ride_id=${activeRide.ride_id}`);
      const feeData = feeRes?.data;
      const feeCents = feeData?.cancellation_fee_cents ?? 0;
      const feeDisplay = feeData?.cancellation_fee_display ?? "$5.00";
      const hasFee = feeCents > 0;

      const message = hasFee
        ? `Se aplicará un cargo de ${feeDisplay} por cancelar este viaje.\n\n¿Deseas continuar?`
        : "¿Estás seguro que deseas cancelar este viaje? No se aplicará cargo.";

      Alert.alert("Cancelar viaje", message, [
        { text: "No", style: "cancel", onPress: () => setCancelling(false) },
        {
          text: hasFee ? `Cancelar (${feeDisplay})` : "Sí, cancelar",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetchAPI("/api/ride/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ride_id: activeRide.ride_id,
                  confirm_fee: hasFee,
                }),
              });

              if (response?.data) {
                setActiveRide(null);
                setRideExpanded(false);
                Alert.alert(
                  "Viaje cancelado",
                  hasFee
                    ? `Tu viaje ha sido cancelado. Se ha aplicado un cargo de ${feeDisplay}.`
                    : "Tu viaje ha sido cancelado exitosamente."
                );
              } else if (response?.error) {
                Alert.alert("Error", response.error || "No se pudo cancelar el viaje.");
              } else if (response?.requires_confirmation) {
                await fetchAPI("/api/ride/cancel", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ride_id: activeRide.ride_id,
                    confirm_fee: true,
                  }),
                });
                setActiveRide(null);
                setRideExpanded(false);
                Alert.alert(
                  "Viaje cancelado",
                  `Tu viaje ha sido cancelado. Se ha aplicado un cargo de ${feeDisplay}.`
                );
              } else {
                Alert.alert("Error", "No se pudo cancelar el viaje. Intenta de nuevo.");
              }
            } catch (e: any) {
              console.error("Cancel error:", e);
              Alert.alert("Error", "No se pudo cancelar el viaje. Intenta de nuevo.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]);
    } catch (e: any) {
      console.error("Cancel preview error:", e);
      setCancelling(false);
      Alert.alert("Error", "No se pudo obtener el cargo de cancelación. Intenta de nuevo.");
    }
  }, [activeRide]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          setHasPermission(false);
          setLocationError("Location permission is required to load your position.");
          return;
        }

        setHasPermission(true);
        setLocationError(null);

        const location = await Location.getCurrentPositionAsync({});

        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords?.latitude!,
          longitude: location.coords?.longitude!,
        });

        setUserLocation({
          latitude: location.coords?.latitude,
          longitude: location.coords?.longitude,
          address: `${address[0].name}, ${address[0].region}`,
        });
        // Reset any previous destination to avoid showing old routes on home map
        clearDestinationLocation();
      } catch (err) {
        console.error("Location error:", err);
        setHasPermission(false);
        setLocationError("Unable to fetch current location. Please enable location and try again.");
      }
    })();
  }, []);

  // Poll unread messages and latest message while there's an active ride
  useEffect(() => {
    if (!activeRide?.ride_id) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const unreadRes = await fetchAPI(
          `/api/messages/unread?ride_id=${activeRide.ride_id}&reader_type=user`
        );
        const count = unreadRes?.data?.unread_count ?? 0;
        setUnreadCount(count);

        const msgsRes = await fetchAPI(`/api/messages?ride_id=${activeRide.ride_id}`);
        const msgs = msgsRes?.data as any[] | undefined;
        if (Array.isArray(msgs) && msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          setLastMessage({ text: last.message, at: last.created_at });
        }

        if (count > 0 && !rideExpanded) {
          setRideExpanded(true);
        }
      } catch (e) {
        console.warn("poll messages error", e);
      }
    };

    poll();
    timer = setInterval(poll, 5000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeRide?.ride_id, rideExpanded]);

  const handleDestinationPress = (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => {
    setDestinationLocation(location);
    router.push("/(root)/find-ride");
  };

  return (
    <SafeAreaView className="bg-[#f5faf5]">
      <FlatList
        data={recentRides?.slice(0, 5)}
        renderItem={({ item }) => <RideCard ride={item} />}
        keyExtractor={(item, index) => index.toString()}
        className="px-5"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 100,
        }}
        ListEmptyComponent={() => (
          <View className="flex flex-col items-center justify-center">
            {!loading ? (
              <>
                <Image
                  source={images.noResult}
                  className="w-40 h-40"
                  alt="No recent rides found"
                  resizeMode="contain"
                />
                <Text className="text-sm">No recent rides found</Text>
              </>
            ) : (
              <ActivityIndicator size="small" color="#000" />
            )}
          </View>
        )}
        ListHeaderComponent={
          <>
            <View className="flex flex-row gap-2 mb-3">
              <TouchableOpacity
                onPress={() => router.push("/driver")}
                className="bg-[#1db954] px-4 py-3 rounded-xl flex-1"
              >
                <Text className="text-white text-sm font-JakartaBold text-center">Driver App</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/admin")}
                className="bg-[#a64ff3] px-4 py-3 rounded-xl flex-1"
              >
                <Text className="text-white text-sm font-JakartaBold text-center">Admin Panel</Text>
              </TouchableOpacity>
            </View>
            <View className="flex flex-row items-center justify-between my-5">
              <Text className="text-3xl font-JakartaExtraBold">
                Welcome {user?.firstName}👋
              </Text>
              <TouchableOpacity
                onPress={handleSignOut}
                className="justify-center items-center w-11 h-11 rounded-full bg-white shadow-sm"
              >
                <Image source={icons.out} className="w-4 h-4" />
              </TouchableOpacity>
            </View>

            {/* Active Ride Collapsible Panel - below Welcome */}
            {activeRide && (
              <View className="bg-white rounded-2xl mb-4 shadow-lg overflow-hidden border border-gray-200">
                {/* Header - always visible */}
                <TouchableOpacity
                  onPress={() => setRideExpanded(!rideExpanded)}
                  className="p-4"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className={`w-3 h-3 rounded-full mr-3 ${
                        activeRide.ride_status === "pending" ? "bg-yellow-500" :
                        activeRide.ride_status === "accepted" ? "bg-blue-500" :
                        "bg-green-500"
                      }`} />
                      <View className="flex-1">
                        <Text className="text-xs text-gray-500 font-JakartaMedium">
                          {activeRide.ride_status === "pending"
                            ? "Buscando conductor..."
                            : activeRide.ride_status === "accepted"
                              ? "Conductor en camino"
                              : "Viaje en progreso"}
                        </Text>
                        <Text className="text-base font-JakartaBold text-gray-900" numberOfLines={1}>
                          {activeRide.destination_address}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      {unreadCount > 0 && (
                        <View className="bg-red-500 px-2 py-1 rounded-full mr-3">
                          <Text className="text-white text-xs font-JakartaBold">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </Text>
                        </View>
                      )}
                      <View style={{ transform: [{ rotate: arrowRotation }] }}>
                        <Image source={icons.arrowDown} className="w-5 h-5" />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Expandable Content */}
                {rideExpanded && (
                  <View className="px-4 pb-4 border-t border-gray-100">
                    {/* Ride Details */}
                    <View className="py-3 border-b border-gray-100">
                      <View className="flex-row items-center mb-2">
                        <Image source={icons.point} className="w-4 h-4 mr-2" />
                        <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>
                          {activeRide.origin_address}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Image source={icons.to} className="w-4 h-4 mr-2" />
                        <Text className="text-sm text-gray-600 flex-1" numberOfLines={1}>
                          {activeRide.destination_address}
                        </Text>
                      </View>
                    </View>

                    {/* Driver Info if assigned */}
                    {activeRide.driver && (
                      <View className="py-3 border-b border-gray-100 flex-row items-center">
                        <Image
                          source={{ uri: activeRide.driver.profile_image_url || "https://via.placeholder.com/40" }}
                          className="w-11 h-11 rounded-full mr-3"
                        />
                        <View className="flex-1">
                          <Text className="text-base font-JakartaSemiBold">
                            {activeRide.driver.first_name} {activeRide.driver.last_name}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            Rating: {activeRide.driver.rating?.toFixed(1) || "N/A"}
                          </Text>
                        </View>
                        <Text className="text-lg font-JakartaBold text-green-600">
                          ${activeRide.fare_price ? (Number(activeRide.fare_price) / 100).toFixed(2) : "0.00"}
                        </Text>
                      </View>
                    )}

                    {/* Mini mapa de ruta en progreso */}
                    <View className="py-3 border-b border-gray-100">
                      <Text className="text-sm font-JakartaSemiBold text-gray-800 mb-2">
                        Tu viaje sigue en proceso
                      </Text>
                      <View style={{ height: 160 }} className="rounded-xl overflow-hidden">
                        <MapView
                          provider={PROVIDER_GOOGLE}
                          style={{ flex: 1 }}
                          initialRegion={{
                            latitude: Number(activeRide.origin_latitude) || 0,
                            longitude: Number(activeRide.origin_longitude) || 0,
                            latitudeDelta: 0.04,
                            longitudeDelta: 0.04,
                          }}
                          pointerEvents="none"
                          showsTraffic
                        >
                          <Marker
                            coordinate={{
                              latitude: Number(activeRide.origin_latitude),
                              longitude: Number(activeRide.origin_longitude),
                            }}
                            title="Origen"
                          />
                          <Marker
                            coordinate={{
                              latitude: Number(activeRide.destination_latitude),
                              longitude: Number(activeRide.destination_longitude),
                            }}
                            title="Destino"
                            pinColor="#1db954"
                          />
                          {routeCoords.length > 1 && (
                            <Polyline
                              coordinates={routeCoords}
                              strokeColor="#0286ff"
                              strokeWidth={4}
                            />
                          )}
                        </MapView>
                      </View>
                    </View>

                    {/* Último mensaje del conductor */}
                    {lastMessage && (
                      <View className="py-3 border-b border-gray-100">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-sm font-JakartaSemiBold text-gray-800">Mensaje del conductor</Text>
                          {unreadCount > 0 && (
                            <View className="bg-red-500 px-2 py-0.5 rounded-full">
                              <Text className="text-white text-[11px] font-JakartaBold">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-sm text-gray-700" numberOfLines={2}>
                          {lastMessage.text}
                        </Text>
                        <Text className="text-xs text-gray-400 mt-1">
                          {new Date(lastMessage.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row gap-3 pt-3">
                      <TouchableOpacity
                        onPress={handleResumeRide}
                        style={{ backgroundColor: "#f3c94a" }}
                        className="flex-1 py-3 rounded-lg"
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: "#1A1A1A" }} className="text-center font-JakartaSemiBold">
                          Ver Viaje
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancelRide}
                        disabled={cancelling}
                        style={{
                          backgroundColor: "#fde8e8",
                          borderColor: "#fbc8c8",
                          borderWidth: 1,
                        }}
                        className="flex-1 py-3 rounded-lg"
                        activeOpacity={0.8}
                      >
                        {cancelling ? (
                          <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                          <View>
                            <Text className="text-red-500 text-center font-JakartaSemiBold text-sm">
                              Cancelar
                            </Text>
                            <Text className="text-red-400 text-center text-xs">
                              Fee: $5.00
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Chat button */}
                    <TouchableOpacity
                      onPress={() => router.push(`/(root)/ride-tracking?rideId=${activeRide.ride_id}`)}
                      className="mt-3 bg-[#c8f4d4] py-3 rounded-lg flex-row items-center justify-center gap-2"
                      activeOpacity={0.8}
                    >
                      <Image source={icons.chat} className="w-5 h-5" />
                      <Text className="text-[#119c4a] font-JakartaSemiBold">Abrir Chat</Text>
                      {unreadCount > 0 && (
                        <View className="ml-2 bg-red-500 px-2 py-0.5 rounded-full">
                          <Text className="text-white text-[11px] font-JakartaBold">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/(root)/search")}
              className="bg-white shadow-md shadow-neutral-300 rounded-2xl px-4 py-4 mb-2"
            >
              <View className="flex-row items-center">
                <Image source={icons.search} className="w-5 h-5 mr-3" />
                <View className="flex-1">
                  <Text className="text-sm text-gray-400">Where do you want to go today?</Text>
                  <Text className="text-xs text-gray-500 mt-1">Tap to search destination</Text>
                </View>
                <Image source={icons.arrowUp} className="w-5 h-5 rotate-90" />
              </View>
            </TouchableOpacity>

            <>
              <Text className="text-xl font-JakartaBold mt-5 mb-3">
                Your current location
              </Text>
              <View className="flex flex-row items-center bg-transparent h-[300px]">
                {hasPermission ? (
                  <Map />
                ) : (
                  <View className="flex-1 items-center justify-center bg-white rounded-2xl p-4">
                    <Text className="text-center text-sm font-JakartaRegular">
                      {locationError ??
                        "Location permission is required to show your position. Please enable it in settings and reload the app."}
                    </Text>
                  </View>
                )}
              </View>
            </>

            <Text className="text-xl font-JakartaBold mt-5 mb-3">
              Recent Rides
            </Text>
          </>
        }
      />
    </SafeAreaView>
  );
};

export default Home;
