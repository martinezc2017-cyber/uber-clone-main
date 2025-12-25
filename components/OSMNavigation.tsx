// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

// Dark map style for Google Maps - tuned to a deep navy look with good transparency
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7b869d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#070b13" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#121a2c" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0c1321" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#16233b" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0e1729" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#111a2c" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#0f1726" }] },
  { featureType: "building", elementType: "geometry", stylers: [{ color: "#101826" }] },
  { featureType: "building", elementType: "geometry.stroke", stylers: [{ color: "#0c1422" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0a101b" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#0a101b" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0c1321" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0e1a23" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#5f8ca6" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1b2d" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4f6c8e" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
];

type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

type NavigationStep = {
  instruction: string;
  distance: number;
  maneuver?: string;
};

type OSMNavigationProps = {
  targetLatitude: number;
  targetLongitude: number;
  targetAddress: string;
  userName?: string;
  estimatedEarnings?: string | number;
  onArrive?: () => void;
  onArriveNotify?: () => void;
  onStartTrip?: () => void;
  onWaitUpdate?: (waitSeconds: number, waitFeeCents: number) => void;
  onCancel?: () => void;
  phaseLabel?: string; // "Pickup" or "Dropoff"
  pickupFreeMinutes?: number;
  waitRatePerMinute?: number;
  // Chat props
  rideId?: number;
  driverId?: number;
  onOpenChat?: () => void;
  unreadMessages?: number;
};

// Distance calculations
const getDistanceInMiles = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const R = 3959;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    return getDistanceInMiles(lat1, lon1, lat2, lon2) * 1609.34;
  };

const stripHtml = (text: string) => text.replace(/<[^>]+>/g, "");

const getNextStreetName = (instruction?: string): string => {
  if (!instruction) return "";
  const cleaned = stripHtml(instruction);
  const ontoSplit = cleaned.split(/onto | en /i);
  if (ontoSplit.length > 1) {
    return ontoSplit[1].split(/[,.]/)[0].trim();
  }
  return cleaned;
};

const getTurnArrow = (maneuver?: string): string => {
  const arrows: Record<string, string> = {
    "turn-left": "?",
    "turn-right": "?",
    "slight left": "?",
    "slight right": "?",
    "sharp left": "?",
    "sharp right": "?",
    uturn: "?",
    roundabout: "?",
    arrive: "?",
    depart: "?",
    straight: "?",
    merge: "?",
  };
  return arrows[maneuver ?? ""] || "?";
};

// Calculate bearing for camera rotation
const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const toDeg = (rad: number) => rad * (180 / Math.PI);
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

// Decode polyline from OSRM
const decodePolyline = (encoded: string): RouteCoordinate[] => {
  const points: RouteCoordinate[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

// Memoized marker to prevent re-renders
const TargetMarker = memo(({ latitude, longitude }: { latitude: number; longitude: number }) => (
  <Marker coordinate={{ latitude, longitude }} anchor={{ x: 0.5, y: 1 }}>
    <View style={styles.targetMarker}>
      <Text style={styles.targetMarkerText}>X</Text>
    </View>
  </Marker>
));

export default function OSMNavigation({
  targetLatitude,
  targetLongitude,
  targetAddress,
  userName = "Customer",
  estimatedEarnings,
  onArriveNotify,
  onStartTrip,
  onWaitUpdate,
  onArrive,
  onCancel,
  phaseLabel = "Pickup",
  pickupFreeMinutes = 2,
  waitRatePerMinute = 0.6,
  rideId,
  driverId,
  onOpenChat,
  unreadMessages = 0,
}: OSMNavigationProps) {
  const mapRef = useRef<MapView>(null);
  const [currentLocation, setCurrentLocation] = useState<RouteCoordinate | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState(5);
  const [distance, setDistance] = useState(1);
  const [arrived, setArrived] = useState(false);
  const [currentStep, setCurrentStep] = useState<NavigationStep | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [heading, setHeading] = useState(0);
  const [showNavOptions, setShowNavOptions] = useState(false);
  const [arrivalNotified, setArrivalNotified] = useState(false);
  const [tripStarted, setTripStarted] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const waitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedWaitRef = useRef(0);

  // Location setup
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const setup = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        let coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };

        // Dev: if GPS too far, use nearby position
        if (getDistanceInMiles(coords.latitude, coords.longitude, targetLatitude, targetLongitude) > 100) {
          coords = { latitude: targetLatitude + 0.008, longitude: targetLongitude };
        }

        setCurrentLocation(coords);
        setHeading(calculateBearing(coords.latitude, coords.longitude, targetLatitude, targetLongitude));

        // Watch updates - less frequent for performance
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 10 },
          (l) => {
            const newCoords = { latitude: l.coords.latitude, longitude: l.coords.longitude };
            if (getDistanceInMiles(newCoords.latitude, newCoords.longitude, targetLatitude, targetLongitude) > 100) return;

            setCurrentLocation(newCoords);
            setHeading(calculateBearing(newCoords.latitude, newCoords.longitude, targetLatitude, targetLongitude));

            const distMeters = getDistanceInMeters(newCoords.latitude, newCoords.longitude, targetLatitude, targetLongitude);
            const threshold = phaseLabel === "Pickup" ? 5 : 50;
            setArrived(distMeters < threshold);
          }
        );
      } catch (e) {
        console.warn("Location error:", e);
      } finally {
        setLoading(false);
      }
    };

    setup();
    return () => { subscription?.remove(); };
  }, [targetLatitude, targetLongitude]);

  // Fetch route from OSRM (free)
  useEffect(() => {
    if (!currentLocation) return;

    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${targetLongitude},${targetLatitude}?overview=full&geometries=polyline&steps=true`
        );
        const data = await res.json();

        if (data.code === "Ok" && data.routes?.[0]) {
          const route = data.routes[0];
          setRouteCoordinates(decodePolyline(route.geometry));
          setEta(Math.round(route.duration / 60));
          setDistance(route.distance / 1609.34);

          // Get first meaningful step
          const steps = route.legs?.[0]?.steps;
          if (steps?.length > 0) {
            const step = steps.find((s: any) => s.maneuver?.type !== "depart") || steps[0];
            setCurrentStep({
              instruction: step.maneuver?.instruction || `Head to ${targetAddress.split(",")[0]}`,
              distance: step.distance,
              maneuver: step.maneuver?.type,
            });
          }
        }
      } catch (e) {
        console.warn("Route error:", e);
        // Fallback: direct line
        setRouteCoordinates([currentLocation, { latitude: targetLatitude, longitude: targetLongitude }]);
      }
    };

    fetchRoute();
    const interval = setInterval(fetchRoute, 20000); // Update every 20s
    return () => clearInterval(interval);
  }, [currentLocation?.latitude, currentLocation?.longitude, targetLatitude, targetLongitude]);

  // Camera follow - 3D tilted view, route pointing up
  useEffect(() => {
    if (!mapRef.current || !currentLocation || !isFollowing) return;

    // Animate camera with 3D tilt, heading towards destination
    mapRef.current.animateCamera({
      center: currentLocation,
      pitch: 60, // 3D tilt angle
      heading: heading, // Rotate so route points up
      zoom: 17,
    }, { duration: 600 });
  }, [currentLocation, isFollowing, heading]);

  // Set initial camera position
  useEffect(() => {
    if (!mapRef.current || !currentLocation || heading === 0) return;

    // Initial camera setup with 3D view
    setTimeout(() => {
      mapRef.current?.animateCamera({
        center: currentLocation,
        pitch: 60,
        heading: heading,
        zoom: 17,
      }, { duration: 1000 });
    }, 500);
  }, [currentLocation !== null, heading]);

  const centerOnUser = useCallback(() => {
    if (!mapRef.current || !currentLocation) return;
    setIsFollowing(true);
    mapRef.current.animateCamera({
      center: currentLocation,
      pitch: 60,
      heading: heading,
      zoom: 17,
    }, { duration: 500 });
  }, [currentLocation, heading]);

  const showOverview = useCallback(() => {
    if (!mapRef.current || !currentLocation) return;
    setIsFollowing(false);
    mapRef.current.fitToCoordinates(
      [currentLocation, { latitude: targetLatitude, longitude: targetLongitude }],
      { edgePadding: { top: 150, right: 50, bottom: 250, left: 50 }, animated: true }
    );
  }, [currentLocation, targetLatitude, targetLongitude]);

  // Wait timer once arrival is notified (pickup)
  useEffect(() => {
    if (!arrivalNotified || tripStarted) {
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
      return;
    }
    waitTimerRef.current = setInterval(() => {
      setWaitSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    };
  }, [arrivalNotified, tripStarted]);

  // Report wait time periodically when charging applies
  useEffect(() => {
    if (!arrivalNotified || tripStarted) return;
    if (paidSeconds <= 0) return;
    if (!onWaitUpdate) return;
    if (waitSeconds - lastReportedWaitRef.current < 15) return; // throttle every 15s
    onWaitUpdate(waitSeconds, waitFeeCents);
    lastReportedWaitRef.current = waitSeconds;
  }, [arrivalNotified, tripStarted, waitSeconds, paidSeconds, waitFeeCents, onWaitUpdate]);

  // Final wait report when trip starts
  useEffect(() => {
    if (tripStarted && arrivalNotified && onWaitUpdate) {
      onWaitUpdate(waitSeconds, waitFeeCents);
    }
  }, [tripStarted, arrivalNotified, waitSeconds, waitFeeCents, onWaitUpdate]);

  // External navigation options
  const openGoogleMaps = () => {
    const dest = `${targetLatitude},${targetLongitude}`;
    const url = Platform.select({
      ios: `comgooglemaps://?daddr=${dest}&directionsmode=driving`,
      android: `google.navigation:q=${dest}`,
    });
    if (url) {
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${dest}`);
        }
      });
    }
    setShowNavOptions(false);
  };

  const openAppleMaps = () => {
    const dest = `${targetLatitude},${targetLongitude}`;
    const url = `maps://app?daddr=${dest}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Apple Maps not available", "Apple Maps is only available on iOS devices.");
      }
    });
    setShowNavOptions(false);
  };

  const openWaze = () => {
    const url = `waze://?ll=${targetLatitude},${targetLongitude}&navigate=yes`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://waze.com/ul?ll=${targetLatitude},${targetLongitude}&navigate=yes`);
      }
    });
    setShowNavOptions(false);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      Alert.alert("Cancel", "Are you sure you want to cancel?", [
        { text: "No", style: "cancel" },
        { text: "Yes", style: "destructive", onPress: () => {} },
      ]);
    }
  };

  const getManeuverIcon = (m?: string) => {
    const icons: Record<string, string> = {
      "turn-left": "L",
      "turn-right": "R",
      "slight left": "SL",
      "slight right": "SR",
      "sharp left": "HL",
      "sharp right": "HR",
      "uturn": "UT",
      "roundabout": "RB",
      "arrive": "ARR",
      "depart": "GO",
      "straight": "FWD",
      "merge": "MERGE",
    };
    return icons[m || ""] || "FWD";
  };

  const formatDist = (m: number) => m < 160 ? `${Math.round(m * 3.28084)} ft` : `${(m / 1609.34).toFixed(1)} mi`;
  const earningsDisplay =
    estimatedEarnings === undefined || estimatedEarnings === null
      ? "--"
      : Number(estimatedEarnings) > 50
        ? `$${(Number(estimatedEarnings) / 100).toFixed(2)}`
        : `$${Number(estimatedEarnings).toFixed(2)}`;
  const nextStreet = getNextStreetName(currentStep?.instruction) || "Sigue recto";
  const turnArrow = getTurnArrow(currentStep?.maneuver);
  const distanceToTargetM =
    currentLocation ? getDistanceInMeters(currentLocation.latitude, currentLocation.longitude, targetLatitude, targetLongitude) : null;
  const withinPickupRadius = phaseLabel === "Pickup" && distanceToTargetM !== null && distanceToTargetM <= 20;
  const freeSeconds = Math.max(0, pickupFreeMinutes * 60);
  const paidSeconds = Math.max(0, waitSeconds - freeSeconds);
  const waitCost = (paidSeconds / 60) * waitRatePerMinute;
  const waitFeeCents = Math.max(0, Math.round(waitCost * 100));

  const primaryLabel =
    phaseLabel === "Pickup"
      ? arrivalNotified
        ? "Start trip"
        : withinPickupRadius
          ? "Arrive"
          : `${eta} min away`
      : arrived
        ? "Terminar viaje"
        : `${eta} min away`;

  const handlePrimaryPress = () => {
    if (phaseLabel === "Pickup") {
      if (!arrivalNotified) {
        if (!withinPickupRadius) {
          Alert.alert("Muy lejos", "Acercate al punto de recogida (<= 5 m) para marcar llegada.");
          return;
        }
        onArriveNotify?.();
        setArrivalNotified(true);
        setWaitSeconds(0);
        return;
      }
      setTripStarted(true);
      setArrivalNotified(true);
      onStartTrip ? onStartTrip() : onArrive?.();
      return;
    }
    onArrive?.();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Iniciando navegacion...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={darkMapStyle}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        showsPointsOfInterest={false}
        rotateEnabled
        pitchEnabled
        moveOnMarkerPress={false}
        loadingEnabled={false}
        initialRegion={{
          latitude: currentLocation?.latitude || targetLatitude,
          longitude: currentLocation?.longitude || targetLongitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPanDrag={() => setIsFollowing(false)}
      >

        {/* Route line - bright cyan/light blue like Apple CarPlay */}
        {routeCoordinates.length > 1 && (
          <>
            {/* Outer glow effect */}
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="rgba(14,165,233,0.35)"
              strokeWidth={12}
              lineCap="round"
              lineJoin="round"
            />
            {/* Main route line */}
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#0ea5e9"
              strokeWidth={7}
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {/* Target marker */}
        <TargetMarker latitude={targetLatitude} longitude={targetLongitude} />
      </MapView>

      {/* Top safety / status bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.statusPill} onPress={showOverview}>
          <Text style={styles.statusLabel}>{phaseLabel === "Pickup" ? "Ir a recogida" : "Ir a destino"}</Text>
          <Text style={styles.statusValue}>
            {turnArrow} {nextStreet}
          </Text>
          <Text style={styles.statusSub}>
            {eta} min | {distance.toFixed(1)} mi
          </Text>
        </Pressable>
        <Pressable style={styles.sosBtn}>
          <Text style={styles.sosText}>SOS</Text>
        </Pressable>
      </View>

      {/* Bottom sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName[0]?.toUpperCase() ?? "P"}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.addressText} numberOfLines={2}>{targetAddress}</Text>
          </View>
          {/* Chat button */}
          {onOpenChat && (
            <Pressable style={styles.chatBtn} onPress={onOpenChat}>
              <Text style={styles.chatBtnText}>💬</Text>
              {unreadMessages > 0 && (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
          <Pressable style={styles.navShortcut} onPress={() => setShowNavOptions(true)}>
            <Text style={styles.navShortcutText}>&gt;</Text>
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>ETA / Distancia</Text>
            <Text style={styles.metaValue}>
              {eta} min | {distance.toFixed(1)} mi
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Ganancia estimada</Text>
            <Text style={styles.earningsValue}>
              {earningsDisplay}
            </Text>
          </View>
        </View>

        {arrivalNotified && !tripStarted && (
          <View style={styles.waitRow}>
            <Text style={styles.waitLabel}>Espera</Text>
            <Text style={styles.waitValue}>
              {String(Math.floor(waitSeconds / 60)).padStart(2, "0")}:
              {String(waitSeconds % 60).padStart(2, "0")}{" "}
              {waitCost > 0 ? `? +$${waitCost.toFixed(2)}` : "(libre)"}
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryBtn} onPress={handleCancel}>
            <Text style={styles.secondaryText}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, arrived ? styles.primarySuccess : styles.primaryReady]}
            onPress={handlePrimaryPress}
          >
            <Text style={styles.primaryText}>
              {primaryLabel}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Map controls */}
      <View style={styles.controls}>
        <Pressable style={[styles.controlBtn, !isFollowing && styles.controlActive]} onPress={showOverview}>
          <Text style={styles.controlIcon}>FIT</Text>
        </Pressable>
        <Pressable style={[styles.controlBtn, isFollowing && styles.controlActive]} onPress={centerOnUser}>
          <Text style={styles.controlIcon}>CTR</Text>
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={() => setShowNavOptions(true)}>
          <Text style={styles.controlIcon}>NAV</Text>
        </Pressable>
      </View>


      {/* Navigation Options Modal */}
      <Modal
        visible={showNavOptions}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNavOptions(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowNavOptions(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Open in external app</Text>

            <Pressable style={styles.navOption} onPress={openGoogleMaps}>
              <Text style={styles.navOptionIcon}>G</Text>
              <Text style={styles.navOptionText}>Google Maps</Text>
            </Pressable>

            {Platform.OS === "ios" && (
              <Pressable style={styles.navOption} onPress={openAppleMaps}>
                <Text style={styles.navOptionIcon}>A</Text>
                <Text style={styles.navOptionText}>Apple Maps</Text>
              </Pressable>
            )}

            <Pressable style={styles.navOption} onPress={openWaze}>
              <Text style={styles.navOptionIcon}>W</Text>
              <Text style={styles.navOptionText}>Waze</Text>
            </Pressable>

            <Pressable style={styles.modalCancelBtn} onPress={() => setShowNavOptions(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030814" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#030814" },
  loadingText: { color: "#e2e8f0", marginTop: 16, fontSize: 16 },
  map: { flex: 1 },

  // Target marker
  targetMarker: { backgroundColor: "#00a9ff", borderRadius: 20, padding: 6, borderWidth: 2, borderColor: "rgba(3,8,20,0.8)" },
  targetMarkerText: { fontSize: 18, color: "#0b0f19", fontWeight: "700" },

  // Top bar
  topBar: {
    position: "absolute",
    top: 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusPill: {
    flex: 1,
    backgroundColor: "rgba(12,18,32,0.92)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
  statusLabel: { color: "#cbd5e1", fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 2 },
  statusValue: { color: "#f8fafc", fontSize: 18, fontWeight: "800" },
  statusSub: { color: "rgba(226,232,240,0.8)", fontSize: 13, marginTop: 4 },
  sosBtn: {
    backgroundColor: "rgba(239,68,68,0.92)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  sosText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  // Bottom sheet
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(12,18,32,0.94)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginBottom: 12,
  },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,169,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#0b0f19", fontSize: 18, fontWeight: "800" },
  userInfo: { flex: 1 },
  userName: { color: "#f8fafc", fontSize: 18, fontWeight: "700" },
  addressText: { color: "#94a3b8", fontSize: 13, marginTop: 4 },
  navShortcut: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  navShortcutText: { color: "#e2e8f0", fontSize: 13, fontWeight: "700" },

  metaRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  metaBlock: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  metaLabel: { color: "#9fb1c9", fontSize: 12, letterSpacing: 0.3, textTransform: "uppercase" },
  metaValue: { color: "#e2e8f0", fontSize: 18, fontWeight: "700", marginTop: 4 },
  earningsValue: { color: "#22c55e", fontSize: 20, fontWeight: "800", marginTop: 2 },

  actionRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  secondaryText: { color: "#e2e8f0", fontSize: 16, fontWeight: "700" },
  primaryBtn: {
    flex: 1.2,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#f5c84c",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
  primaryReady: { backgroundColor: "#f5c84c" },
  primarySuccess: { backgroundColor: "#f5c84c" },
  primaryText: { color: "#0b0f19", fontSize: 16, fontWeight: "800" },

  // Controls
  controls: { position: "absolute", top: 160, right: 16, gap: 10 },
  controlBtn: {
    minWidth: 50,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(15,23,42,0.88)",
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  controlActive: { backgroundColor: "rgba(0,169,255,0.9)", borderColor: "rgba(0,169,255,0.9)" },
  controlIcon: { color: "#e2e8f0", fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "rgba(12,18,32,0.96)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: { color: "#e2e8f0", fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 18 },
  navOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  navOptionIcon: { fontSize: 18, color: "#e2e8f0", marginRight: 12 },
  navOptionText: { color: "#e2e8f0", fontSize: 16, fontWeight: "700" },
  modalCancelBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  modalCancelText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  waitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(17,24,39,0.88)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  waitLabel: { color: "#9fb1c9", fontSize: 13, letterSpacing: 0.3, textTransform: "uppercase" },
  waitValue: { color: "#e2e8f0", fontSize: 15, fontWeight: "700" },

  // Chat button styles
  chatBtn: {
    backgroundColor: "#22c55e",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    position: "relative",
  },
  chatBtnText: { fontSize: 18 },
  chatBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  chatBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
