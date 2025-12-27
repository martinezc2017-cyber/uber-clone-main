// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, ActivityIndicator, Image, StyleSheet, Linking, Alert } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";

import { useFetch, fetchAPI } from "@/lib/fetch";
import { Driver } from "@/types/type";
import { icons, images } from "@/constants";
import DriverCarMarker from "@/components/DriverCarMarker";

const driverColors = {
  bg: "#F4F2EE",
  surface: "#FFFFFF",
  border: "#E4E0D9",
  text: "#141414",
  muted: "#5F6672",
  accent: "#8B6A3F",
  success: "#22C55E",
  info: "#6366f1",
};

// Dark glass card style
const glassCard = {
  backgroundColor: driverColors.surface,
  borderColor: driverColors.border,
  borderWidth: 1,
  borderRadius: 18,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 14,
  elevation: 8,
};

type DriverStatus = {
  driver_id: number;
  status: string;
  latitude: number | null;
  longitude: number | null;
};

type PendingRide = {
  ride_id: number;
  origin_address: string;
  destination_address: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  fare_price: number | string | null;
  ride_time: number;
  user_name: string;
  user_id?: number;
  user_phone?: string | null;
  phone_shared?: boolean; // true if user opted to share phone
  distance_to_pickup: number;
  ride_distance: number;
  estimated_pickup_time: number;
  created_at: string;
  ride_status?: string | null;
  miles_traveled?: number | null;
};

// Driver earnings based on distance (75% city, 85% >100mi)
const calculateDriverEarnings = (farePrice: number | string | null, rideDistanceMiles: number): number => {
  const totalFare = Number(farePrice ?? 0) / 100;
  const pct = rideDistanceMiles > 100 ? 0.85 : 0.75;
  return totalFare * pct;
};

const haversineMiles = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const defaultCoords = { latitude: 33.4152, longitude: -111.8315 };

export default function DriverHome() {
  const router = useRouter();
  const { data: drivers } = useFetch<Driver[]>("/api/driver");
  const { data: statuses, loading, refetch: refetchStatuses } = useFetch<DriverStatus[]>("/api/driver/status");

  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationWatcher, setLocationWatcher] = useState<Location.LocationSubscription | null>(null);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [acceptedRide, setAcceptedRide] = useState<PendingRide | null>(null);
  const [selectedRide, setSelectedRide] = useState<PendingRide | null>(null);
  const [selectedRideRoute, setSelectedRideRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [selectedRideRoadDistance, setSelectedRideRoadDistance] = useState<number | null>(null);
  const [selectedRideRoadDuration, setSelectedRideRoadDuration] = useState<number | null>(null);
  // Ruta OSRM del conductor al pickup cuando hay viaje aceptado
  const [acceptedRideRoute, setAcceptedRideRoute] = useState<{ latitude: number; longitude: number }[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const [lastSentLoc, setLastSentLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const distanceOptions = [20, 50, 100, 200, 500];
  const tripOptions = [20, 40, 60, 100, 200, 400, 600, 800, 1000];
  const [maxDistanceIndex, setMaxDistanceIndex] = useState<number>(distanceOptions.indexOf(500));
  const [maxTripIndex, setMaxTripIndex] = useState<number>(tripOptions.indexOf(400));
  const maxDistanceMiles = distanceOptions[maxDistanceIndex];
  const maxTripMiles = tripOptions[maxTripIndex];

  // Set default driver
  useEffect(() => {
    if (!selectedDriverId && drivers && drivers.length > 0) {
      setSelectedDriverId(drivers[0].id);
    }
  }, [drivers, selectedDriverId]);

  // Check for active ride on mount and redirect to navigation
  useEffect(() => {
    const checkActiveRide = async () => {
      if (!selectedDriverId) return;

      try {
        const res = await fetchAPI(`/api/driver/active-ride?driver_id=${selectedDriverId}`);
        if (res?.data) {
          const ride = res.data;
          console.log("=== Found active ride for driver ===", ride);

          // Keep local accepted ride so we keep sending locations
          setAcceptedRide({
            ...(ride as any),
            driver_id: ride.driver_id ?? selectedDriverId,
            distance_to_pickup: ride.distance_to_pickup ?? 0,
            estimated_pickup_time: ride.estimated_pickup_time ?? 0,
          });

          // Redirect to premium-nav with ride data
          router.push({
            pathname: "/(tabs)/premium-nav",
            params: {
              ride_id: ride.ride_id,
              driver_id: String(ride.driver_id ?? selectedDriverId ?? ""),
              origin_address: ride.origin_address,
              destination_address: ride.destination_address,
              origin_latitude: ride.origin_latitude,
              origin_longitude: ride.origin_longitude,
              destination_latitude: ride.destination_latitude,
              destination_longitude: ride.destination_longitude,
              fare_price: String(ride.fare_price ?? ""),
              user_name: ride.user_name || "Customer",
              distance_to_pickup: ride.distance_to_pickup || 0,
              estimated_pickup_time: ride.estimated_pickup_time || 0,
            },
          });
        }
      } catch (e) {
        console.warn("Error checking driver active ride:", e);
      }
    };

    checkActiveRide();
  }, [selectedDriverId]);

  const activeStatus = useMemo(() => {
    if (!selectedDriverId || !statuses) return null;
    return statuses.find((s) => s.driver_id === selectedDriverId) ?? null;
  }, [selectedDriverId, statuses]);

  const onlineDrivers = useMemo(
    () => statuses?.filter((s) => s.status === "online" && s.latitude && s.longitude) ?? [],
    [statuses],
  );

  const mapRegion = useMemo(() => {
    if (acceptedRide && currentLocation) {
      return undefined; // we'll override with region prop when accepted
    }
    // When a ride is selected, show region that fits the entire route
    if (selectedRide && selectedRideRoute.length > 0) {
      // Use all route points to calculate bounds
      const lats = selectedRideRoute.map(p => p.latitude);
      const lngs = selectedRideRoute.map(p => p.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const latDelta = Math.abs(maxLat - minLat);
      const lngDelta = Math.abs(maxLng - minLng);
      // Add padding (20% on each side)
      const padding = 0.2;
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: latDelta * (1 + padding * 2) + 0.01,
        longitudeDelta: lngDelta * (1 + padding * 2) + 0.01,
      };
    }
    // Fallback while route is loading
    if (selectedRide) {
      const minLat = Math.min(Number(selectedRide.origin_latitude), Number(selectedRide.destination_latitude));
      const maxLat = Math.max(Number(selectedRide.origin_latitude), Number(selectedRide.destination_latitude));
      const minLng = Math.min(Number(selectedRide.origin_longitude), Number(selectedRide.destination_longitude));
      const maxLng = Math.max(Number(selectedRide.origin_longitude), Number(selectedRide.destination_longitude));
      return {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: Math.abs(maxLat - minLat) * 1.4 + 0.05,
        longitudeDelta: Math.abs(maxLng - minLng) * 1.4 + 0.05,
      };
    }
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    if (onlineDrivers.length > 0) {
      return {
        latitude: Number(onlineDrivers[0].latitude),
        longitude: Number(onlineDrivers[0].longitude),
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    return {
      latitude: defaultCoords.latitude,
      longitude: defaultCoords.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [acceptedRide, selectedRide, selectedRideRoute, currentLocation, onlineDrivers]);

  // Get current location
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCurrentLocation(defaultCoords);
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const isDefaultEmulator = loc.coords.latitude === 37.4219983 && loc.coords.longitude === -122.084;
      setCurrentLocation(
        isDefaultEmulator
          ? defaultCoords
          : { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
      );
    } catch (e) {
      setCurrentLocation(defaultCoords);
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Live location while online (and during accepted ride)
  useEffect(() => {
    const shouldTrack = activeStatus?.status === "online";
    if (shouldTrack && !locationWatcher) {
      Location.watchPositionAsync(
        {
          accuracy: Location.LocationAccuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (pos) => {
          const speedMps = pos.coords.speed ?? 0;
          const speedMph = speedMps * 2.23694;
          setCurrentLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed_mph: speedMph,
          });
        },
      )
        .then(setLocationWatcher)
        .catch((e) => console.warn("Location watch error", e));
    }

    if (!shouldTrack && locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }

    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
  }, [activeStatus?.status, locationWatcher]);

  // Send periodic location updates to backend when a ride is accepted/in progress
  useEffect(() => {
    if (!acceptedRide || !currentLocation) return;
    const status = acceptedRide.ride_status ?? "accepted";
    const isActiveRide = status === "accepted" || status === "active" || status === "in_progress";
    if (!isActiveRide) return;

    const now = Date.now();
    const dt = now - lastSentAt;
    const dist = lastSentLoc
      ? haversineMiles(lastSentLoc.latitude, lastSentLoc.longitude, currentLocation.latitude, currentLocation.longitude)
      : Infinity;

    // Throttle: 5s o 0.01 mi (~16 m)
    if (dt < 5000 && dist < 0.01) return;

    (async () => {
      try {
        const res = await fetchAPI("/api/ride/update-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ride_id: acceptedRide.ride_id,
            driver_id: acceptedRide.driver_id ?? selectedDriverId,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            speed_mph: (currentLocation as any).speed_mph ?? null,
          }),
        });
        const total = res?.data?.miles_traveled;
        if (typeof total === "number") {
          setAcceptedRide((prev) => (prev ? { ...prev, miles_traveled: total } : prev));
        }
        setLastSentAt(now);
        setLastSentLoc(currentLocation);
      } catch (e) {
        console.warn("Error sending location update:", e);
      }
    })();
  }, [acceptedRide, currentLocation, lastSentAt, lastSentLoc, selectedDriverId]);

  // Poll pending rides
  useEffect(() => {
    const fetchPending = async () => {
      const loc = currentLocation ?? defaultCoords;
      try {
        const res = await fetchAPI(
          `/api/ride/pending?driver_lat=${loc.latitude}&driver_lng=${loc.longitude}&max_distance=${maxDistanceMiles}`,
        );
        const list = (res?.data ?? []).filter((ride: PendingRide) =>
          Number(ride.ride_distance ?? 0) <= maxTripMiles,
        );
        // Remove duplicates by ride_id just in case API returns duplicates
        const unique: Record<string, PendingRide> = {};
        list.forEach((r) => {
          unique[String(r.ride_id)] = r;
        });
        setPendingRides(Object.values(unique));
      } catch (e) {
        // Use warn instead of error to avoid triggering LogBox red screen for transient network issues
        console.warn("Error fetching pending rides:", e);
        setPendingRides([]);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, [currentLocation, activeStatus?.status, maxDistanceMiles, maxTripMiles]);

  // Fetch route from OSRM when a ride is selected
  useEffect(() => {
    if (!selectedRide) {
      setSelectedRideRoute([]);
      setSelectedRideRoadDistance(null);
      setSelectedRideRoadDuration(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const originLng = Number(selectedRide.origin_longitude);
        const originLat = Number(selectedRide.origin_latitude);
        const destLng = Number(selectedRide.destination_longitude);
        const destLat = Number(selectedRide.destination_latitude);

        const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((coord: [number, number]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
          setSelectedRideRoute(coords);
          // Extract road distance (meters -> miles) and duration (seconds -> minutes)
          const roadMiles = (route.distance ?? 0) / 1609.34;
          const roadMinutes = Math.round((route.duration ?? 0) / 60);
          setSelectedRideRoadDistance(roadMiles);
          setSelectedRideRoadDuration(roadMinutes);
        }
      } catch (e) {
        console.warn("Error fetching route:", e);
        // Fallback to straight line
        setSelectedRideRoute([
          { latitude: Number(selectedRide.origin_latitude), longitude: Number(selectedRide.origin_longitude) },
          { latitude: Number(selectedRide.destination_latitude), longitude: Number(selectedRide.destination_longitude) },
        ]);
        setSelectedRideRoadDistance(null);
        setSelectedRideRoadDuration(null);
      }
    };

    fetchRoute();
  }, [selectedRide]);

  // Fetch route from driver to pickup when ride is accepted (OSRM real road route)
  useEffect(() => {
    if (!acceptedRide || !currentLocation) {
      setAcceptedRideRoute([]);
      return;
    }

    const fetchAcceptedRoute = async () => {
      try {
        const driverLng = currentLocation.longitude;
        const driverLat = currentLocation.latitude;
        const pickupLng = Number(acceptedRide.origin_longitude);
        const pickupLat = Number(acceptedRide.origin_latitude);

        const url = `https://router.project-osrm.org/route/v1/driving/${driverLng},${driverLat};${pickupLng},${pickupLat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates.map((coord: [number, number]) => ({
            latitude: coord[1],
            longitude: coord[0],
          }));
          setAcceptedRideRoute(coords);
        }
      } catch (e) {
        console.warn("Error fetching accepted ride route:", e);
        // Fallback to straight line
        setAcceptedRideRoute([
          currentLocation,
          { latitude: Number(acceptedRide.origin_latitude), longitude: Number(acceptedRide.origin_longitude) },
        ]);
      }
    };

    fetchAcceptedRoute();
  }, [acceptedRide, currentLocation?.latitude, currentLocation?.longitude]);

  const handleNavigation = (path: string) => {
    if (navigating) return;
    setNavigating(true);
    router.push(path as any);
    setTimeout(() => setNavigating(false), 400);
  };

  const toggleStatus = async () => {
    if (!selectedDriverId) return;
    const online = activeStatus?.status === "online";

    if (!online && !currentLocation) {
      await getCurrentLocation();
    }

    setUpdating(true);
    try {
      const lat = currentLocation?.latitude ?? defaultCoords.latitude;
      const lng = currentLocation?.longitude ?? defaultCoords.longitude;
      await fetchAPI("/api/driver/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: selectedDriverId,
          status: online ? "offline" : "online",
          latitude: online ? activeStatus?.latitude : lat,
          longitude: online ? activeStatus?.longitude : lng,
        }),
      });
      await refetchStatuses();
    } catch (e) {
      console.error("Error toggling status:", e);
    } finally {
      setUpdating(false);
    }
  };

  const driver = useMemo(
    () => drivers?.find((d) => d.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId],
  );

  const vehicleLabel = useMemo(() => {
    const d = driver as any;
    const make = (d?.vehicle_make ?? "").trim();
    const model = (d?.vehicle_model ?? "").trim();
    const plate = (d?.plate ?? "").trim();
    const name = `${make} ${model}`.trim();
    if (name && plate) return `${name} - ${plate}`;
    if (name) return name;
    if (plate) return plate;
    return "Vehicle not set";
  }, [driver]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: driverColors.bg }}
      contentContainerStyle={{ paddingTop: 60, paddingHorizontal: 16, gap: 14, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: driverColors.text, fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>
          Driver App
        </Text>
        <Pressable
          onPress={() => handleNavigation("/(tabs)/menu")}
          disabled={navigating}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: driverColors.surface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: driverColors.border,
            opacity: navigating ? 0.6 : 1,
          }}
        >
          <View style={{ gap: 4 }}>
            <View style={{ width: 18, height: 2, backgroundColor: driverColors.text, borderRadius: 1 }} />
            <View style={{ width: 18, height: 2, backgroundColor: driverColors.text, borderRadius: 1 }} />
            <View style={{ width: 18, height: 2, backgroundColor: driverColors.text, borderRadius: 1 }} />
          </View>
        </Pressable>
      </View>

      <View
        style={{
          ...glassCard,
          padding: 14,
          gap: 10,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: driverColors.surface,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderWidth: 1,
            borderColor: driverColors.border,
          }}
        >
          <Pressable
            onPress={() => handleNavigation("/(tabs)/profile")}
            disabled={navigating}
            style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
          >
            {driver?.profile_image_url ? (
              <Image source={{ uri: driver.profile_image_url }} style={{ width: 48, height: 48, borderRadius: 24 }} resizeMode="cover" />
            ) : (
              <Text style={{ color: driverColors.text, fontSize: 18, fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>
                {driver ? driver.first_name?.[0] ?? "D" : "D"}
              </Text>
            )}
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: driverColors.text, fontSize: 16, fontWeight: "700", fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>
            {driver ? `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim() : "Select a driver"}
          </Text>
          <Text style={{ color: activeStatus?.status === "online" ? driverColors.success : driverColors.muted, fontSize: 12, fontFamily: "Jakarta-Regular, system-ui, sans-serif" }}>
            {activeStatus?.status === "online" ? "Online" : "Offline"}
          </Text>
          <Text style={{ color: driverColors.muted, fontSize: 11, fontFamily: "Jakarta-Medium, system-ui, sans-serif" }}>
            {vehicleLabel}
          </Text>
        </View>
        <Pressable
          onPress={() => handleNavigation("/(tabs)/profile")}
          disabled={navigating}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: driverColors.accent,
            opacity: navigating ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>Profile</Text>
        </Pressable>
      </View>

      <View
        style={{
          ...glassCard,
          padding: 14,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: driverColors.text, fontSize: 16, fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>
            Live map
          </Text>
          <Pressable
            onPress={toggleStatus}
            disabled={updating || !selectedDriverId}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: activeStatus?.status === "online" ? "#ef4444" : driverColors.accent,
              opacity: updating ? 0.7 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>
              {activeStatus?.status === "online" ? "Go Offline" : "Go Online"}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View
            style={{
              height: 100,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.05)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="small" color="#ffffff" />
          </View>
        ) : activeStatus?.status !== "online" ? (
          <View
            style={{
              height: 100,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.05)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "Jakarta-Medium, system-ui, sans-serif" }}>
              You are offline. Go online to see the map.
            </Text>
          </View>
        ) : (
          <MapView
            style={{ width: "100%", height: acceptedRide || selectedRide ? 420 : 340, borderRadius: 12 }}
            initialRegion={mapRegion || undefined}
            showsUserLocation={!selectedRide}
            region={
              acceptedRide && currentLocation
                ? {
                    latitude: (currentLocation.latitude + Number(acceptedRide.origin_latitude)) / 2,
                    longitude: (currentLocation.longitude + Number(acceptedRide.origin_longitude)) / 2,
                    latitudeDelta: Math.abs(currentLocation.latitude - Number(acceptedRide.origin_latitude)) + 0.05,
                    longitudeDelta: Math.abs(currentLocation.longitude - Number(acceptedRide.origin_longitude)) + 0.05,
                  }
                : selectedRide && selectedRideRoute.length > 0
                  ? mapRegion
                  : undefined
            }
          >
            {acceptedRide ? (
              <>
                {currentLocation && (
                  <Marker coordinate={currentLocation} title="Tu ubicación">
                    <DriverCarMarker size={44} selected />
                  </Marker>
                )}
                <Marker
                  coordinate={{
                    latitude: Number(acceptedRide.origin_latitude),
                    longitude: Number(acceptedRide.origin_longitude),
                  }}
                  title={`Cliente: ${acceptedRide.user_name || "Customer"}`}
                  description={acceptedRide.origin_address}
                  image={icons.person}
                  pinColor="#f59e0b"
                />
                {/* Ruta OSRM del conductor al pickup - sigue las calles */}
                {acceptedRideRoute.length > 0 ? (
                  <Polyline
                    coordinates={acceptedRideRoute}
                    strokeColor="#0284c7"
                    strokeWidth={5}
                  />
                ) : currentLocation && (
                  <Polyline
                    coordinates={[
                      currentLocation,
                      {
                        latitude: Number(acceptedRide.origin_latitude),
                        longitude: Number(acceptedRide.origin_longitude),
                      },
                    ]}
                    strokeColor="#0284c7"
                    strokeWidth={5}
                  />
                )}
              </>
            ) : selectedRide ? (
              <>
                {/* Selected ride preview - show pickup, destination and route */}
                <Marker
                  coordinate={{
                    latitude: Number(selectedRide.origin_latitude),
                    longitude: Number(selectedRide.origin_longitude),
                  }}
                  title={`Pickup: ${selectedRide.user_name || "Customer"}`}
                  description={selectedRide.origin_address}
                  pinColor="#22c55e"
                  image={icons.person}
                />
                <Marker
                  coordinate={{
                    latitude: Number(selectedRide.destination_latitude),
                    longitude: Number(selectedRide.destination_longitude),
                  }}
                  title="Destination"
                  description={selectedRide.destination_address}
                  pinColor="#ef4444"
                  image={icons.pin}
                />
                {/* Route line from pickup to destination - real road route */}
                {selectedRideRoute.length > 0 && (
                  <Polyline
                    coordinates={selectedRideRoute}
                    strokeColor="#6366f1"
                    strokeWidth={4}
                  />
                )}
                {/* Current location marker */}
                {currentLocation && (
                  <Marker
                    coordinate={currentLocation}
                    title="Tu ubicación"
                  >
                    <DriverCarMarker size={44} selected />
                  </Marker>
                )}
              </>
            ) : (
              <>
                {onlineDrivers.map((driver) => (
                  <Marker
                    key={driver.driver_id}
                    coordinate={{
                      latitude: Number(driver.latitude),
                      longitude: Number(driver.longitude),
                    }}
                    title={`Driver ${driver.driver_id}`}
                    description={driver.status}
                  >
                    <DriverCarMarker size={44} selected={driver.driver_id === selectedDriverId} />
                  </Marker>
                ))}

                {pendingRides.map((ride) => (
                  <Marker
                    key={`ride-${ride.ride_id}`}
                    coordinate={{
                      latitude: Number(ride.origin_latitude),
                      longitude: Number(ride.origin_longitude),
                    }}
                    title={`Pickup: ${ride.user_name || "Customer"}`}
                    description={`${ride.origin_address} • ${Number(ride.distance_to_pickup ?? 0).toFixed(1)} mi away`}
                    pinColor="#f59e0b"
                    image={icons.person}
                  />
                ))}
              </>
            )}
          </MapView>
        )}
      </View>

      <View
        style={{
          ...glassCard,
          padding: 14,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#ffffff", fontSize: 16, fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>
            Active ride requests
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {/* Pickup radius dial */}
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ color: "#334155", fontSize: 11, fontFamily: "Jakarta-Medium, system-ui, sans-serif" }}>
                Offers within
              </Text>
              <View
                style={{
                  width: 90,
                  backgroundColor: "#f8fafc",
                  borderWidth: 1,
                  borderColor: "#cbd5e1",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  alignItems: "center",
                }}
              >
                <Pressable
                  onPress={() => setMaxDistanceIndex((i) => (i > 0 ? i - 1 : i))}
                  style={{ paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 14, color: "#0f172a" }}>▲</Text>
                </Pressable>
                <View style={{ alignItems: "center", paddingVertical: 2, width: "100%" }}>
                  <Text style={{ color: "#475569", fontSize: 11, height: 14 }}>
                    {distanceOptions[maxDistanceIndex - 1] ? `${distanceOptions[maxDistanceIndex - 1]} mi` : " "}
                  </Text>
                  <View
                    style={{
                      backgroundColor: "#e2e8f0",
                      borderWidth: 1,
                      borderColor: "#cbd5e1",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      minWidth: 68,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#0f172a",
                        fontSize: 16,
                        fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                        height: 20,
                      }}
                    >
                      {maxDistanceMiles} mi
                    </Text>
                  </View>
                  <Text style={{ color: "#475569", fontSize: 11, height: 14 }}>
                    {distanceOptions[maxDistanceIndex + 1] ? `${distanceOptions[maxDistanceIndex + 1]} mi` : " "}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setMaxDistanceIndex((i) => (i < distanceOptions.length - 1 ? i + 1 : i))}
                  style={{ paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 14, color: "#0f172a" }}>▼</Text>
                </Pressable>
              </View>
            </View>

            {/* Trip length dial */}
            <View style={{ alignItems: "center", gap: 4 }}>
              <Text style={{ color: "#334155", fontSize: 11, fontFamily: "Jakarta-Medium, system-ui, sans-serif" }}>
                Trip up to
              </Text>
              <View
                style={{
                  width: 90,
                  backgroundColor: "#f8fafc",
                  borderWidth: 1,
                  borderColor: "#cbd5e1",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  alignItems: "center",
                }}
              >
                <Pressable
                  onPress={() => setMaxTripIndex((i) => (i > 0 ? i - 1 : i))}
                  style={{ paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 14, color: "#0f172a" }}>▲</Text>
                </Pressable>
                <View style={{ alignItems: "center", paddingVertical: 2, width: "100%" }}>
                  <Text style={{ color: "#475569", fontSize: 11, height: 14 }}>
                    {tripOptions[maxTripIndex - 1] ? `${tripOptions[maxTripIndex - 1]} mi` : " "}
                  </Text>
                  <View
                    style={{
                      backgroundColor: "#e2e8f0",
                      borderWidth: 1,
                      borderColor: "#cbd5e1",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      minWidth: 68,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#0f172a",
                        fontSize: 16,
                        fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                        height: 20,
                      }}
                    >
                      {maxTripMiles} mi
                    </Text>
                  </View>
                  <Text style={{ color: "#475569", fontSize: 11, height: 14 }}>
                    {tripOptions[maxTripIndex + 1] ? `${tripOptions[maxTripIndex + 1]} mi` : " "}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setMaxTripIndex((i) => (i < tripOptions.length - 1 ? i + 1 : i))}
                  style={{ paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 14, color: "#0f172a" }}>▼</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={{ gap: 10 }}>
          {acceptedRide ? (
            <View
              style={{
                backgroundColor: "#ecfeff",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: "#bae6fd",
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Text style={{ color: "#0ea5e9", fontSize: 15, fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>
                  En ruta al cliente
                </Text>
                <Text style={{ color: "#10b981", fontSize: 16, fontFamily: "Jakarta-Bold, system-ui, sans-serif" }}>
                  ${calculateDriverEarnings(acceptedRide.fare_price, Number(acceptedRide.ride_distance ?? 0)).toFixed(2)}
                </Text>
              </View>
              <Text style={{ color: "#0f172a", fontSize: 13, fontFamily: "Jakarta-SemiBold, system-ui, sans-serif" }} numberOfLines={1}>
                Pickup: {acceptedRide.origin_address}
              </Text>
              <Text style={{ color: "#6b7280", fontSize: 12, fontFamily: "Jakarta-Regular, system-ui, sans-serif" }} numberOfLines={1}>
                Destino: {acceptedRide.destination_address}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#f59e0b", fontSize: 13, fontFamily: "Jakarta-SemiBold, system-ui, sans-serif" }}>
                  Viaje total: {Number(acceptedRide.ride_distance ?? 0).toFixed(1)} mi
                </Text>
                <Text style={{ color: "#475569", fontSize: 12, fontFamily: "Jakarta-Regular, system-ui, sans-serif" }}>
                  {acceptedRide.user_name || "Customer"}
                </Text>
              </View>
              {/* Botones de contacto */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <Pressable
                  onPress={() => {
                    const phone = acceptedRide.user_phone;
                    if (!acceptedRide.phone_shared || !phone) {
                      Alert.alert(
                        "Telefono no disponible",
                        "El cliente no ha compartido su numero de telefono. Usa el chat interno para comunicarte."
                      );
                      return;
                    }
                    Linking.openURL(`tel:${phone}`).catch(() => {
                      Alert.alert("Error", "No se pudo iniciar la llamada.");
                    });
                  }}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: acceptedRide.phone_shared && acceptedRide.user_phone ? "#22c55e" : "#9ca3af",
                    paddingVertical: 10,
                    borderRadius: 8,
                    opacity: acceptedRide.phone_shared && acceptedRide.user_phone ? 1 : 0.7,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{acceptedRide.phone_shared && acceptedRide.user_phone ? "📞" : "🔒"}</Text>
                  <Text style={{ color: "#fff", fontFamily: "Jakarta-Bold, system-ui, sans-serif", fontSize: 13 }}>
                    {acceptedRide.phone_shared && acceptedRide.user_phone ? "Llamar" : "Privado"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    router.push(`/(tabs)/chat?ride_id=${acceptedRide.ride_id}&user_name=${encodeURIComponent(acceptedRide.user_name || "Cliente")}&driver_id=${selectedDriverId || 1}`);
                  }}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: "#3b82f6",
                    paddingVertical: 10,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 16 }}>💬</Text>
                  <Text style={{ color: "#fff", fontFamily: "Jakarta-Bold, system-ui, sans-serif", fontSize: 13 }}>
                    Mensaje
                  </Text>
                </Pressable>
              </View>
              {/* Privacy note */}
              {!acceptedRide.phone_shared && (
                <Text style={{ color: "#6b7280", fontSize: 11, textAlign: "center", marginTop: 4 }}>
                  🔒 El cliente no comparte telefono. Usa mensajes internos.
                </Text>
              )}
              <Pressable
                onPress={async () => {
                  try {
                    await fetchAPI("/api/ride/start", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ ride_id: acceptedRide.ride_id }),
                    });
                    setAcceptedRide((prev) => (prev ? { ...prev, ride_status: "in_progress" as any } : prev));
                  } catch (e) {
                    console.error("Error starting ride:", e);
                  }
                }}
                style={{
                  alignSelf: "flex-start",
                  marginTop: 6,
                  backgroundColor: "#0ea5e9",
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff", fontFamily: "Jakarta-Bold, system-ui, sans-serif", fontSize: 13 }}>
                  Start trip
                </Text>
              </Pressable>
            </View>
          ) : pendingRides.length === 0 ? (
            <View
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#9ca3af",
                  fontSize: 12,
                  fontFamily: "Jakarta-Medium, system-ui, sans-serif",
                }}
              >
                {activeStatus?.status === "online"
                  ? "No ride requests within 20 miles right now."
                  : "No ride requests to show. Go online to accept trips."}
              </Text>
            </View>
          ) : (
            pendingRides.map((ride) => (
              <Pressable
                key={ride.ride_id}
                onPress={() => setSelectedRide(selectedRide?.ride_id === ride.ride_id ? null : ride)}
                style={{
                  backgroundColor: selectedRide?.ride_id === ride.ride_id ? "#eef2ff" : "#f8fafc",
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: selectedRide?.ride_id === ride.ride_id ? 2 : 1,
                  borderColor: selectedRide?.ride_id === ride.ride_id ? "#6366f1" : "#e2e8f0",
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: "#0f172a",
                        fontSize: 14,
                        fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                      }}
                    >
                      Pickup: {ride.origin_address}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={{
                        color: "#6b7280",
                        fontSize: 12,
                        fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                        marginTop: 2,
                      }}
                    >
                      Destination: {ride.destination_address}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        color: "#10b981",
                        fontSize: 13,
                        fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                      }}
                    >
                      ${calculateDriverEarnings(
                        ride.fare_price,
                        selectedRide?.ride_id === ride.ride_id && selectedRideRoadDistance !== null
                          ? selectedRideRoadDistance
                          : Number(ride.ride_distance ?? 0)
                      ).toFixed(2)}
                    </Text>
                    {(selectedRide?.ride_id === ride.ride_id && selectedRideRoadDistance !== null
                      ? selectedRideRoadDistance > 100
                      : Number(ride.ride_distance ?? 0) > 100) && (
                      <View
                        style={{
                          backgroundColor: "#fbbf24",
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginTop: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: "#78350f",
                            fontSize: 10,
                            fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                          }}
                        >
                          +10% Bonus
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                  <Text style={{ color: "#6366f1", fontSize: 13, fontFamily: "Jakarta-SemiBold, system-ui, sans-serif" }}>
                    {Number(ride.distance_to_pickup ?? 0).toFixed(1)} mi away
                  </Text>
                  <Text style={{ color: "#0ea5e9", fontSize: 13, fontFamily: "Jakarta-SemiBold, system-ui, sans-serif" }}>
                    {ride.estimated_pickup_time ?? "--"} min to pickup
                  </Text>
                  <Text style={{ color: "#f59e0b", fontSize: 13, fontFamily: "Jakarta-SemiBold, system-ui, sans-serif" }}>
                    Trip: {selectedRide?.ride_id === ride.ride_id && selectedRideRoadDistance !== null
                      ? selectedRideRoadDistance.toFixed(1)
                      : Number(ride.ride_distance ?? 0).toFixed(1)} mi
                    {selectedRide?.ride_id === ride.ride_id && selectedRideRoadDuration !== null
                      ? ` • ${selectedRideRoadDuration} min`
                      : ride.ride_duration ? ` • ${Math.round(Number(ride.ride_duration))} min` : ""}
                    {selectedRide?.ride_id === ride.ride_id && selectedRideRoadDistance !== null ? " (road)" : ""}
                  </Text>
                </View>

                {(selectedRide?.ride_id === ride.ride_id && selectedRideRoadDistance !== null
                  ? selectedRideRoadDistance > 100
                  : Number(ride.ride_distance ?? 0) > 100) && (
                  <View
                    style={{
                      backgroundColor: "#fef3c7",
                      borderLeftWidth: 3,
                      borderLeftColor: "#f59e0b",
                      padding: 10,
                      borderRadius: 6,
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#92400e",
                        fontSize: 12,
                        fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
                        marginBottom: 2,
                      }}
                    >
                      Long Distance Bonus!
                    </Text>
                    <Text
                      style={{
                        color: "#78350f",
                        fontSize: 11,
                        fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                        lineHeight: 16,
                      }}
                    >
                      This is a long trip over 100 miles! You'll earn 85% of the fare instead of the standard 75%. Great opportunity for higher earnings!
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={async () => {
                    if (!selectedDriverId) return;
                    try {
                      const lat = currentLocation?.latitude ?? defaultCoords.latitude;
                      const lng = currentLocation?.longitude ?? defaultCoords.longitude;

                      // Force driver online before accepting
                      await fetchAPI("/api/driver/status", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          driver_id: selectedDriverId,
                          status: "online",
                          latitude: lat,
                          longitude: lng,
                        }),
                      });
                      await refetchStatuses();

                      // Accept ride
                      await fetchAPI("/api/ride/accept", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          ride_id: ride.ride_id,
                          driver_id: selectedDriverId,
                        }),
                      });

                      // Keep accepted ride locally so we continue sending GPS to backend
                      setAcceptedRide({
                        ...(ride as any),
                        driver_id: selectedDriverId,
                        ride_status: "accepted",
                        distance_to_pickup: ride.distance_to_pickup,
                        estimated_pickup_time: ride.estimated_pickup_time,
                      });

                      // Navigate to premium navigation screen (driver -> pickup)
                      router.push({
                        pathname: "/(tabs)/premium-nav",
                        params: {
                          ride_id: String(ride.ride_id ?? ""),
                          origin_address: ride.origin_address,
                          destination_address: ride.destination_address,
                          origin_latitude: ride.origin_latitude,
                          origin_longitude: ride.origin_longitude,
                          destination_latitude: ride.destination_latitude,
                          destination_longitude: ride.destination_longitude,
                          fare_price: String(ride.fare_price ?? ""),
                          user_name: ride.user_name || "Customer",
                          distance_to_pickup: ride.distance_to_pickup,
                          estimated_pickup_time: ride.estimated_pickup_time,
                          driver_id: String(selectedDriverId ?? ""),
                        },
                      });
                    } catch (e) {
                      console.warn("Error accepting ride:", e);
                    }
                  }}
                  style={{
                    alignSelf: "flex-end",
                    backgroundColor: "#22c55e",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 13,
                      fontFamily: "Jakarta-Bold, system-ui, sans-serif",
                    }}
                  >
                    Accept
                  </Text>
                </Pressable>
              </Pressable>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
