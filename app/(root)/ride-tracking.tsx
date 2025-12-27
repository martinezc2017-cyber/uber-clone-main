import { useUser } from "@clerk/clerk-expo";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import Screen from "@/components/layout/Screen";
import { fetchAPI } from "@/lib/fetch";
import { fetchRoutePolyline, simplifyPolyline } from "@/lib/map";
import DriverCarMarker from "@/components/DriverCarMarker";
import { useLocationStore } from "@/store";
import { Ride } from "@/types/type";

// Sin decodificar polylines; no dibujamos líneas de ruta

const isValidCoord = (lat?: number | null, lng?: number | null) =>
  lat != null &&
  lng != null &&
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

const RideTracking = () => {
  const { user } = useUser();
  const params = useLocalSearchParams();
  const rideIdParam = useMemo(() => {
    if (typeof params.rideId === "string") return params.rideId;
    if (Array.isArray(params.rideId)) return params.rideId[0];
    return undefined;
  }, [params.rideId]);

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const lastRouteRef = useRef<{ driver?: { latitude: number; longitude: number }; target?: { latitude: number; longitude: number } } | null>(null);
  const mapRef = useRef<MapView>(null);
  const { userLatitude, userLongitude } = useLocationStore();

  const riderPosition = useMemo(() => {
    if (!isValidCoord(userLatitude, userLongitude)) return null;
    return { latitude: Number(userLatitude), longitude: Number(userLongitude) };
  }, [userLatitude, userLongitude]);

  const pickup = useMemo(() => {
    if (!ride?.origin_latitude || !ride?.origin_longitude) return null;
    const lat = Number(ride.origin_latitude);
    const lng = Number(ride.origin_longitude);
    return isValidCoord(lat, lng) ? { latitude: lat, longitude: lng } : null;
  }, [ride?.origin_latitude, ride?.origin_longitude]);

  const destination = useMemo(() => {
    if (!ride?.destination_latitude || !ride?.destination_longitude) return null;
    const lat = Number(ride.destination_latitude);
    const lng = Number(ride.destination_longitude);
    return isValidCoord(lat, lng) ? { latitude: lat, longitude: lng } : null;
  }, [ride?.destination_latitude, ride?.destination_longitude]);

  const rideState = (ride?.ride_status ?? "").toLowerCase();
  const goingToDestination = ["in_progress", "arrived"].includes(rideState);
  const target = goingToDestination ? destination : pickup;

  const driverHeading = useMemo(() => {
    const bearingFromPoints = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const toDeg = (rad: number) => (rad * 180) / Math.PI;
      const dLon = toRad(to.longitude - from.longitude);
      const lat1 = toRad(from.latitude);
      const lat2 = toRad(to.latitude);
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      const brng = Math.atan2(y, x);
      return (toDeg(brng) + 360) % 360;
    };

    if (driverLocation && target) {
      return bearingFromPoints(driverLocation, target);
    }

    return 0;
  }, [driverLocation, target]);

  useEffect(() => {
    const fetchRide = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetchAPI(`/api/ride/active?clerk_id=${user.id}`);
        setRide(res?.data ?? null);
      } catch (err) {
        console.warn("ride tracking ride error", err);
        setError("No pudimos cargar tu viaje activo");
      } finally {
        setLoading(false);
      }
    };

    fetchRide();
  }, [user?.id, rideIdParam]);

  useEffect(() => {
    if (!ride?.ride_id) return;

    const rideKey = rideIdParam ?? ride.ride_id;
    let timer: ReturnType<typeof setInterval> | null = null;

    const pollLocation = async () => {
      try {
        const res = await fetchAPI(`/api/ride/locations?ride_id=${rideKey}`);
        const rows = res?.data as any[];
        if (Array.isArray(rows) && rows.length > 0) {
          const lat = Number(rows[0]?.lat ?? rows[0]?.latitude);
          const lng = Number(rows[0]?.lng ?? rows[0]?.longitude);
          if (isValidCoord(lat, lng)) {
            const loc = { latitude: lat, longitude: lng };
            setDriverLocation(loc);
            const targetPoint = goingToDestination ? destination : pickup;
            if (targetPoint) {
              try {
                // Throttle route recompute: only when driver moved ~80m or target changed
                const movedEnough = (() => {
                  const prev = lastRouteRef.current;
                  if (!prev?.driver || !prev?.target) return true;
                  const toRad = (d: number) => (d * Math.PI) / 180;
                  const R = 6371; // km
                  const dLat = toRad(loc.latitude - prev.driver.latitude);
                  const dLon = toRad(loc.longitude - prev.driver.longitude);
                  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(prev.driver.latitude)) * Math.cos(toRad(loc.latitude)) * Math.sin(dLon / 2) ** 2;
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  const distKm = R * c;
                  const targetChanged = prev.target.latitude !== targetPoint.latitude || prev.target.longitude !== targetPoint.longitude;
                  return distKm > 0.08 || targetChanged; // ~80m
                })();

                if (movedEnough || !routeCoords?.length) {
                  const poly = await fetchRoutePolyline(loc, targetPoint);
                  setRouteCoords(poly ? simplifyPolyline(poly, 120) : null);
                  lastRouteRef.current = { driver: loc, target: targetPoint };
                  console.log("route->", {
                    driver: loc,
                    target: targetPoint,
                    points: poly?.length ?? 0,
                  });
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn("ride tracking location error", err);
      }
    };

    pollLocation();
    timer = setInterval(pollLocation, 10000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [ride?.ride_id, rideIdParam]);

  useEffect(() => {
    const coordsToFit = [driverLocation, riderPosition, target, destination].filter(Boolean) as { latitude: number; longitude: number }[];
    if (mapRef.current && coordsToFit.length > 1) {
      mapRef.current.fitToCoordinates(coordsToFit, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
  }, [driverLocation?.latitude, driverLocation?.longitude, riderPosition?.latitude, riderPosition?.longitude, target?.latitude, target?.longitude, destination?.latitude, destination?.longitude]);

  const initialRegion = useMemo(() => {
    if (riderPosition) {
      return {
        latitude: riderPosition.latitude,
        longitude: riderPosition.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (target) {
      return {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [riderPosition?.latitude, riderPosition?.longitude, target?.latitude, target?.longitude]);

  const statusLabel = useMemo(() => {
    if (!rideState) return "Cargando";
    if (rideState === "pending") return "Buscando conductor";
    if (rideState === "accepted") return "Conductor en camino";
    if (rideState === "arrived") return "Conductor llegó";
    if (rideState === "in_progress") return "En viaje";
    return rideState;
  }, [rideState]);

  if (loading) {
    return (
      <Screen>
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0286ff" />
          <Text className="mt-3 text-app-muted">Cargando tu viaje...</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  if (error || !ride) {
    return (
      <Screen>
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <Text className="text-xl font-JakartaBold text-app-text mb-2">No hay viaje activo</Text>
          <Text className="text-app-muted text-center">{error ?? "Regresa a la pantalla principal y solicita un viaje."}</Text>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView className="flex-1 px-4 pb-6">
        <View className="flex-1 rounded-2xl overflow-hidden border border-app-border bg-app-surface shadow-sm">
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE}
            showsTraffic={goingToDestination}
            mapType="standard"
            rotateEnabled={false}
            initialRegion={initialRegion}
          >
            {/* Ruta por carretera entre conductor y objetivo */}
            {driverLocation && (routeCoords?.length ? (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#00E0FF"
                strokeWidth={8}
                geodesic
              />
            ) : (target ? (
              <Polyline
                coordinates={[
                  { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                  { latitude: target.latitude,
                    longitude: target.longitude },
                ]}
                strokeColor="#00E0FF"
                strokeWidth={8}
                geodesic
              />
            ) : null))}

            {riderPosition && (
              <Marker
                coordinate={riderPosition}
                title="Tú"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: "#F7F0E6",
                    borderWidth: 2,
                    borderColor: "#8B6A3F",
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 4,
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: "#8B6A3F",
                    }}
                  />
                </View>
              </Marker>
            )}

            {driverLocation && (
              <Marker
                coordinate={driverLocation}
                title="Conductor"
                flat
                rotation={driverHeading}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={9999}
                tracksViewChanges={false}
              >
                <DriverCarMarker size={64} />
              </Marker>
            )}

            {/* Sin pines de origen/destino: solo rider y conductor en tiempo real */}
          </MapView>

          {/* Sin banner de ubicación */}
        </View>

        <View className="mt-4 bg-app-surface border border-app-border rounded-2xl p-4 shadow-sm">
          <Text className="text-sm text-app-muted mb-1">Estado</Text>
          <Text className="text-xl font-JakartaBold text-app-text mb-3">{statusLabel}</Text>

          <View className="flex-row justify-between mb-2">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-app-muted">Origen</Text>
              <Text className="text-sm text-app-text" numberOfLines={2}>{ride.origin_address}</Text>
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs text-app-muted">Destino</Text>
              <Text className="text-sm text-app-text" numberOfLines={2}>{ride.destination_address}</Text>
            </View>
          </View>

            <View className="flex-row items-center justify-between">
            <Text className="text-app-muted text-sm">Conductor: {ride.driver?.first_name ?? "Pendiente"}</Text>
            <TouchableOpacity
              className="px-3 py-2 rounded-lg bg-app-accent/90"
              onPress={() => router.push("/(root)/(tabs)/chat")}
            >
              <Text className="text-white text-sm font-JakartaSemiBold">Abrir chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Screen>
  );
};

export default RideTracking;
