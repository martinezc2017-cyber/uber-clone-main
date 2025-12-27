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
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import GoogleTextInput from "@/components/GoogleTextInput";
import Map from "@/components/Map";
import RideCard from "@/components/RideCard";
import { icons, images } from "@/constants";
import Screen from "@/components/layout/Screen";
import { GlassCard, InnerCard, useGlassStyle, useTextColors } from "@/components/layout/GlassCard";
import { useFetch, fetchAPI } from "@/lib/fetch";
import { useLocationStore, useDriverStore } from "@/store";
import { useThemeStore, themeColors } from "@/store/themeStore";
import { Ride } from "@/types/type";

// No decodificamos rutas en mini-mapa; sin líneas azules

const Home = () => {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const glassStyle = useGlassStyle();
  const textColors = useTextColors();

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
  // Sin ruta en mini-mapa; evitamos cálculos/red innecesarios
  const [cancelling, setCancelling] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<{ text: string; at: string } | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const arrowRotation = rideExpanded ? "180deg" : "0deg";
  const isValidCoord = (lat?: number | null, lng?: number | null) =>
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001);
  const hasDriverLocation =
    driverLocation &&
    isValidCoord(driverLocation.latitude, driverLocation.longitude);
  const miniRegion =
    activeRide?.destination_latitude && activeRide?.destination_longitude
      ? (() => {
          const points = [];
          if (driverLocation) {
            points.push(driverLocation);
          } else if (activeRide.origin_latitude && activeRide.origin_longitude) {
            points.push({
              latitude: Number(activeRide.origin_latitude),
              longitude: Number(activeRide.origin_longitude),
            });
          }
          points.push({
            latitude: Number(activeRide.destination_latitude),
            longitude: Number(activeRide.destination_longitude),
          });

          const lats = points.map((p) => p.latitude);
          const lngs = points.map((p) => p.longitude);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          return {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.02),
            longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.02),
          };
        })()
      : null;

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

  // Sin solicitud de ruta para mini-mapa

  // Poll last driver location for the active ride
  useEffect(() => {
    if (!activeRide?.ride_id || !activeRide?.driver_id) {
      setDriverLocation(null);
      return;
    }

    let timer: ReturnType<typeof setInterval> | null = null;
    const poll = async () => {
      try {
        const res = await fetchAPI(`/api/ride/locations?ride_id=${activeRide.ride_id}`);
        const rows = res?.data as any[];
        if (Array.isArray(rows) && rows.length > 0) {
          const last = rows[0];
          const lat = Number(last?.lat);
          const lng = Number(last?.lng);
          if (isValidCoord(lat, lng)) {
            setDriverLocation({ latitude: lat, longitude: lng });
          }
        }
      } catch (e) {
        console.warn("poll driver location error", e);
      }
    };

    poll();
    timer = setInterval(poll, 5000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeRide?.ride_id, activeRide?.driver_id]);

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
    <Screen>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={recentRides?.slice(0, 5)}
        renderItem={({ item }) => <RideCard ride={item} />}
        keyExtractor={(item, index) => index.toString()}
        style={{ paddingHorizontal: 20, backgroundColor: colors.bg }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 100,
          backgroundColor: colors.bg,
        }}
        ListEmptyComponent={() => (
          <View style={[glassStyle, { alignItems: "center", justifyContent: "center", paddingVertical: 32 }]}>
            {!loading ? (
              <>
                <Image
                  source={images.noResult}
                  className="w-40 h-40"
                  alt="No recent rides found"
                  resizeMode="contain"
                />
                <Text style={{ color: colors.muted, fontSize: 14, marginTop: 12 }}>No recent rides found</Text>
              </>
            ) : (
              <ActivityIndicator size="small" color={colors.accent} />
            )}
          </View>
        )}
        ListHeaderComponent={
          <>
            <View className="flex flex-row items-center justify-between my-5">
              <Text style={{ color: colors.text }} className="text-3xl font-JakartaExtraBold">
                Welcome {user?.firstName}
              </Text>
              <TouchableOpacity
                onPress={handleSignOut}
                style={[glassStyle, { padding: 0, width: 44, height: 44, alignItems: "center", justifyContent: "center" }]}
              >
                <Image source={icons.out} className="w-4 h-4" style={{ tintColor: colors.text }} />
              </TouchableOpacity>
            </View>

            {/* Active Ride Collapsible Panel - below Welcome */}
            {activeRide && (
              <View style={[glassStyle, { padding: 0, marginBottom: 16, overflow: "hidden" }]}>
                {/* Header - always visible */}
                <TouchableOpacity
                  onPress={() => setRideExpanded(!rideExpanded)}
                  style={{ padding: 16 }}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        marginRight: 12,
                        backgroundColor:
                          activeRide.ride_status === "pending" ? colors.warning :
                          activeRide.ride_status === "accepted" ? "#3b82f6" :
                          colors.success
                      }} />
                      <View className="flex-1">
                        <Text style={{ color: colors.muted, fontSize: 12 }} className="font-JakartaMedium">
                          {activeRide.ride_status === "pending"
                            ? "Buscando conductor..."
                            : activeRide.ride_status === "accepted"
                              ? "Conductor en camino"
                              : "Viaje en progreso"}
                        </Text>
                        <Text style={{ color: colors.text, fontSize: 16 }} className="font-JakartaBold" numberOfLines={1}>
                          {activeRide.destination_address}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      {unreadCount > 0 && (
                        <View style={{ backgroundColor: colors.danger }} className="px-2 py-1 rounded-full mr-3">
                          <Text className="text-white text-xs font-JakartaBold">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </Text>
                        </View>
                      )}
                      <View style={{ transform: [{ rotate: arrowRotation }] }}>
                        <Image source={icons.arrowDown} className="w-5 h-5" style={{ tintColor: colors.text }} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Expandable Content */}
                {rideExpanded && (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                    {/* Ride Details */}
                    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <View className="flex-row items-center mb-2">
                        <Image source={icons.point} className="w-4 h-4 mr-2" style={{ tintColor: colors.accent }} />
                        <Text style={{ color: colors.muted, fontSize: 14 }} className="flex-1" numberOfLines={1}>
                          {activeRide.origin_address}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Image source={icons.to} className="w-4 h-4 mr-2" style={{ tintColor: colors.success }} />
                        <Text style={{ color: colors.muted, fontSize: 14 }} className="flex-1" numberOfLines={1}>
                          {activeRide.destination_address}
                        </Text>
                      </View>
                    </View>

                    {/* Driver Info if assigned */}
                    {activeRide.driver && (
                      <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }} className="flex-row items-center">
                        <Image
                          source={{ uri: activeRide.driver.profile_image_url || "https://via.placeholder.com/40" }}
                          className="w-11 h-11 rounded-full mr-3"
                          style={{ borderWidth: 2, borderColor: colors.accent }}
                        />
                        <View className="flex-1">
                          <Text style={{ color: colors.text, fontSize: 16 }} className="font-JakartaSemiBold">
                            {activeRide.driver.first_name} {activeRide.driver.last_name}
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: 12 }}>
                            Rating: {activeRide.driver.rating?.toFixed(1) || "N/A"}
                          </Text>
                        </View>
                        <Text style={{ color: colors.success, fontSize: 18 }} className="font-JakartaBold">
                          ${activeRide.fare_price ? (Number(activeRide.fare_price) / 100).toFixed(2) : "0.00"}
                        </Text>
                      </View>
                    )}

                    {/* Mini mapa de ruta en progreso */}
                    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ color: colors.text, fontSize: 14 }} className="font-JakartaSemiBold mb-2">
                        Tu viaje sigue en proceso
                      </Text>
                      <View style={{ height: 180, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                        {hasDriverLocation ? (
                          <MapView
                            provider={PROVIDER_GOOGLE}
                            style={{ flex: 1 }}
                            initialRegion={miniRegion || {
                              latitude: driverLocation?.latitude || Number(activeRide.origin_latitude) || 0,
                              longitude: driverLocation?.longitude || Number(activeRide.origin_longitude) || 0,
                              latitudeDelta: 0.08,
                              longitudeDelta: 0.08,
                            }}
                            region={miniRegion || undefined}
                            pointerEvents="none"
                            showsTraffic
                          >
                            <Marker
                              coordinate={{
                                latitude: Number(activeRide.destination_latitude),
                                longitude: Number(activeRide.destination_longitude),
                              }}
                              title="Destino"
                              pinColor={colors.success}
                            />
                            <Marker
                              coordinate={driverLocation!}
                              title="Conductor"
                              pinColor={colors.accent}
                            />
                          </MapView>
                        ) : (
                          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
                            <Text style={{ color: colors.muted, fontSize: 14 }}>
                              Esperando ubicación del conductor...
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Último mensaje del conductor */}
                    {lastMessage && (
                      <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <View className="flex-row items-center justify-between mb-1">
                          <Text style={{ color: colors.text, fontSize: 14 }} className="font-JakartaSemiBold">Mensaje del conductor</Text>
                          {unreadCount > 0 && (
                            <View style={{ backgroundColor: colors.danger }} className="px-2 py-0.5 rounded-full">
                              <Text className="text-white text-[11px] font-JakartaBold">
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ color: colors.muted, fontSize: 14 }} numberOfLines={2}>
                          {lastMessage.text}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                          {new Date(lastMessage.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={{ flexDirection: "row", gap: 12, paddingTop: 12 }}>
                      <TouchableOpacity
                        onPress={handleResumeRide}
                        style={{
                          backgroundColor: colors.accent,
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 12,
                          shadowColor: colors.accent,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 6,
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: "#1A1A1A", textAlign: "center" }} className="font-JakartaSemiBold">
                          Ver Viaje
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancelRide}
                        disabled={cancelling}
                        style={{
                          backgroundColor: activeTheme === "dark" ? "rgba(239, 68, 68, 0.15)" : "#fde8e8",
                          borderColor: activeTheme === "dark" ? "rgba(239, 68, 68, 0.3)" : "#fbc8c8",
                          borderWidth: 1,
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 12,
                        }}
                        activeOpacity={0.8}
                      >
                        {cancelling ? (
                          <ActivityIndicator size="small" color={colors.danger} />
                        ) : (
                          <View>
                            <Text style={{ color: colors.danger, textAlign: "center", fontSize: 14 }} className="font-JakartaSemiBold">
                              Cancelar
                            </Text>
                            <Text style={{ color: colors.danger, textAlign: "center", fontSize: 12, opacity: 0.7 }}>
                              Fee: $5.00
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Chat button */}
                    <TouchableOpacity
                      onPress={() => router.push(`/(root)/ride-tracking?rideId=${activeRide.ride_id}`)}
                      style={{
                        marginTop: 12,
                        backgroundColor: activeTheme === "dark" ? "rgba(22, 163, 74, 0.15)" : "#c8f4d4",
                        paddingVertical: 12,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                      activeOpacity={0.8}
                    >
                      <Image source={icons.chat} className="w-5 h-5" style={{ tintColor: colors.success }} />
                      <Text style={{ color: colors.success }} className="font-JakartaSemiBold">Abrir Chat</Text>
                      {unreadCount > 0 && (
                        <View style={{ marginLeft: 8, backgroundColor: colors.danger, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
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
              style={[glassStyle, { padding: 16, marginBottom: 8 }]}
            >
              <View className="flex-row items-center">
                <Image source={icons.search} className="w-5 h-5 mr-3" style={{ tintColor: colors.accent }} />
                <View className="flex-1">
                  <Text style={{ color: colors.text, fontSize: 14 }}>Where do you want to go today?</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>Tap to search destination</Text>
                </View>
                <Image source={icons.arrowUp} className="w-5 h-5 rotate-90" style={{ tintColor: colors.muted }} />
              </View>
            </TouchableOpacity>

            <>
              <Text style={{ color: colors.text, fontSize: 20, marginTop: 20, marginBottom: 12 }} className="font-JakartaBold">
                Your current location
              </Text>
              <View style={[glassStyle, { padding: 0, height: 300, overflow: "hidden" }]}>
                {hasPermission ? (
                  <Map showDestination={false} />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <Text style={{ color: colors.muted, fontSize: 14, textAlign: "center" }} className="font-JakartaRegular">
                      {locationError ??
                        "Location permission is required to show your position. Please enable it in settings and reload the app."}
                    </Text>
                  </View>
                )}
              </View>
            </>

            <Text style={{ color: colors.text, fontSize: 20, marginTop: 20, marginBottom: 12 }} className="font-JakartaBold">
              Recent Rides
            </Text>
          </>
        }
      />
    </SafeAreaView>
    </Screen>
  );
};

export default Home;




