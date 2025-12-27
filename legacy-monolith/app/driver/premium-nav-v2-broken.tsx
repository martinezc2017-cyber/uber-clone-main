/**
 * PremiumNavScreen v2 - Refactored with clean architecture
 *
 * Uses separated hooks for:
 * - useLocation: GPS tracking
 * - useNavigationCamera: Smooth camera follow
 * - useRoute: Route management
 * - useVehicleState: Heading calculation
 */

import React, { useCallback, useEffect, useRef, useState, useMemo, memo } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Linking,
  AppState,
  InteractionManager,
} from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import MapView, { LatLng, Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { fetchAPI } from "@/lib/fetch";
import DriverCarMarker from "@/components/DriverCarMarker";

// Import navigation hooks
import {
  useLocation,
  useNavigationCamera,
  useRoute,
  useVehicleState,
} from "@/hooks/navigation";

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  bg: "#05070B",
  route: "#C9A55C",
  routeGlow: "rgba(201, 165, 92, 0.25)",
  routePassed: "rgba(100, 100, 100, 0.3)",
  header: "rgba(15, 18, 28, 0.92)",
  accent: "#F1B21A",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.75)",
  danger: "#ef4444",
  amber: "#F1B21A",
  green: "#22c55e",
};

const TURN_ARROWS: Record<string, string> = {
  "turn-left": "←",
  "turn-right": "→",
  "slight left": "↖",
  "slight right": "↗",
  "sharp left": "↰",
  "sharp right": "↱",
  uturn: "⤵",
  roundabout: "⟳",
  arrive: "✓",
  depart: "•",
  straight: "↑",
  merge: "↗",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PremiumNavScreen() {
  // Parse route params
  const params = useLocalSearchParams<{
    destination_lat?: string;
    destination_lon?: string;
    destination_latitude?: string;
    destination_longitude?: string;
    origin_latitude?: string;
    origin_longitude?: string;
    pickup_lat?: string;
    pickup_lon?: string;
    origin_address?: string;
    destination_address?: string;
    user_name?: string;
    user_photo?: string;
    distance_to_pickup?: string;
    estimated_pickup_time?: string;
    fare_price?: string;
    user_phone?: string;
    driver_id?: string;
    ride_id?: string;
  }>();

  const phoneNumber = params.user_phone || "";
  const driverId = params.driver_id ? Number(params.driver_id) : null;
  const rideId = params.ride_id ? Number(params.ride_id) : null;

  // ============================================================================
  // HOOKS - Clean separation of concerns
  // ============================================================================

  const location = useLocation();
  const camera = useNavigationCamera();
  const route = useRoute();
  const vehicle = useVehicleState();

  // ============================================================================
  // LOCAL STATE - Only UI-related state
  // ============================================================================

  const [arrived, setArrived] = useState(false);
  const [tripStarted, setTripStarted] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);

  const mapRef = useRef<MapView>(null);
  const lastUploadRef = useRef<{ lat: number; lon: number; ts: number } | null>(null);
  const speedLimitFetchRef = useRef(0);
  const isAppActiveRef = useRef(true);

  // ============================================================================
  // APP OPTIMIZATION - Keep screen on, pause when backgrounded
  // ============================================================================

  // Keep screen awake during navigation (like Google Maps)
  useEffect(() => {
    activateKeepAwakeAsync("navigation").catch(() => {});
    return () => {
      deactivateKeepAwake("navigation");
    };
  }, []);

  // Pause expensive operations when app is backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      isAppActiveRef.current = nextState === "active";

      if (nextState === "active") {
        // App came to foreground - resume operations
        activateKeepAwakeAsync("navigation").catch(() => {});
      } else {
        // App went to background - reduce work
        deactivateKeepAwake("navigation");
      }
    });

    return () => subscription.remove();
  }, []);

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  // Parse navigation targets from params
  const targets = useMemo(() => {
    const pickupLat = Number(params.origin_latitude) || Number(params.pickup_lat);
    const pickupLon = Number(params.origin_longitude) || Number(params.pickup_lon);
    const dropLat = Number(params.destination_latitude) || Number(params.destination_lat);
    const dropLon = Number(params.destination_longitude) || Number(params.destination_lon);

    return {
      pickup: pickupLat && pickupLon ? { latitude: pickupLat, longitude: pickupLon } : null,
      dropoff: dropLat && dropLon ? { latitude: dropLat, longitude: dropLon } : null,
    };
  }, [params]);

  // Current navigation target
  const navTarget = tripStarted ? targets.dropoff : targets.pickup;

  // Route segments for rendering
  const { passed: routePassed, upcoming: routeUpcoming } = useMemo(() => {
    return route.getRouteSegments(location.position);
  }, [route, location.position]);

  // Current step info
  const currentStep = route.currentStep;
  const turnArrow = TURN_ARROWS[currentStep?.maneuver ?? ""] || "↑";

  // Distance to target (miles)
  const distanceToTarget = useMemo(() => {
    if (!location.position || !navTarget) return null;
    const R = 3959;
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const dLat = toRad(navTarget.latitude - location.position.latitude);
    const dLon = toRad(navTarget.longitude - location.position.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(location.position.latitude)) *
        Math.cos(toRad(navTarget.latitude)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [location.position, navTarget]);

  // UI display values
  const canArrive = (distanceToTarget !== null && distanceToTarget <= 1) || arrived || tripStarted;
  const overSpeed = speedLimit !== null && location.speed !== null && location.speed > speedLimit + 6;

  // ============================================================================
  // EFFECTS - Orchestration layer
  // ============================================================================

  // Initialize vehicle heading when position is ready
  useEffect(() => {
    if (location.position && navTarget && !vehicle.heading) {
      const bearing = calculateBearing(
        location.position.latitude,
        location.position.longitude,
        navTarget.latitude,
        navTarget.longitude
      );
      vehicle.setInitialHeading(bearing);
      vehicle.setInitialPosition(location.position);
    }
  }, [location.position, navTarget, vehicle]);

  // Update vehicle heading on position change
  useEffect(() => {
    if (location.position) {
      vehicle.updateHeading(location.position, location.gpsHeading);
    }
  }, [location.position, location.gpsHeading, vehicle]);

  // Fetch route when needed (defer when app backgrounded)
  useEffect(() => {
    if (!location.position || !navTarget) return;
    if (!isAppActiveRef.current) return; // Skip when backgrounded

    const needsRoute = !route.coordinates.length || route.isOffRoute;
    if (!needsRoute) return;

    // Use InteractionManager to avoid blocking UI
    const timer = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        if (isAppActiveRef.current && location.position) {
          route.fetchRoute(location.position, navTarget);
        }
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [location.position, navTarget, route]);

  // Check off-route and advance steps (skip when backgrounded)
  useEffect(() => {
    if (!isAppActiveRef.current) return;
    if (location.position && route.coordinates.length) {
      route.checkOffRoute(location.position);
      route.advanceStep(location.position, vehicle.heading);
    }
  }, [location.position, route, vehicle.heading]);

  // Animate camera (skip when backgrounded - saves GPU)
  useEffect(() => {
    if (!isAppActiveRef.current) return;
    if (location.position && mapRef.current) {
      camera.animateCamera(mapRef.current, location.position, vehicle.heading);
    }
  }, [location.position, vehicle.heading, camera]);

  // Upload driver location to server
  useEffect(() => {
    if (!location.position || !rideId || !driverId) return;

    const now = Date.now();
    const last = lastUploadRef.current;

    if (last) {
      const dt = now - last.ts;
      if (dt < 5000) return; // Throttle to 5s
    }

    lastUploadRef.current = {
      lat: location.position.latitude,
      lon: location.position.longitude,
      ts: now,
    };

    fetchAPI("/api/ride/update-location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ride_id: rideId,
        driver_id: driverId,
        latitude: location.position.latitude,
        longitude: location.position.longitude,
        speed_mph: location.speed ?? null,
      }),
    }).catch((e) => console.warn("GPS upload error:", e));
  }, [location.position, rideId, driverId, location.speed]);

  // Fetch speed limit periodically
  useEffect(() => {
    if (!location.position) return;

    const now = Date.now();
    if (now - speedLimitFetchRef.current < 45000) return;

    speedLimitFetchRef.current = now;
    fetchSpeedLimit(location.position).then(setSpeedLimit);
  }, [location.position]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleArrivePress = async () => {
    if (!arrived && !tripStarted) {
      if (!distanceToTarget || distanceToTarget > 1) {
        Alert.alert("Muy lejos", "Acércate a 1 mi del cliente para marcar Arrived.");
        return;
      }
      setArrived(true);
      return;
    }

    if (!tripStarted) {
      setTripStarted(true);
      route.clearRoute(); // Clear route to fetch new one to dropoff

      if (rideId) {
        try {
          await fetchAPI("/api/ride/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ride_id: rideId }),
          });
        } catch (e) {
          console.warn("No se pudo marcar inicio de viaje", e);
        }
      }
    }
  };

  const handleCancelSave = () => {
    if (!cancelReason.trim()) {
      Alert.alert("Motivo requerido", "Escribe el motivo de cancelación.");
      return;
    }
    setCancelReason("");
    setShowCancelModal(false);
  };

  const handleSendMessage = async () => {
    if (!messageBody.trim()) {
      Alert.alert("Mensaje vacío", "Escribe tu mensaje para el cliente.");
      return;
    }
    if (!rideId || !driverId) {
      Alert.alert("No se pudo enviar", "Falta información del viaje.");
      return;
    }

    const text = messageBody.trim();
    setMessageBody("");
    setShowMessageModal(false);

    try {
      await fetchAPI("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ride_id: rideId,
          sender_type: "driver",
          sender_id: driverId,
          message: text,
        }),
      });
    } catch (e) {
      console.warn("Error enviando mensaje", e);
      Alert.alert("No se pudo enviar", "Intenta de nuevo.");
      setMessageBody(text);
    }
  };

  const handleCall = () => {
    if (!phoneNumber) {
      Alert.alert("Sin número", "No hay número de cliente disponible.");
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  // ============================================================================
  // RENDER VALUES
  // ============================================================================

  // Use pickup or dropoff coordinates as fallback instead of default SF
  const fallbackCoords = targets.pickup || targets.dropoff || { latitude: 33.4152, longitude: -111.8315 };
  const vehicleForRender = location.position || fallbackCoords;
  const destForRender = navTarget || fallbackCoords;

  const bannerHeading = tripStarted
    ? "Ir a destino"
    : currentStep?.name || "Continúe en esta calle";
  const bannerAddress = (tripStarted ? params.destination_address : params.origin_address)
    ?.split(",")
    .slice(0, 2)
    .join(", ")
    .trim() || "";

  const etaStat = route.eta !== "0 min" ? route.eta : params.estimated_pickup_time ? `${params.estimated_pickup_time} min` : "--";
  const distanceStat = route.distance !== "0.0 mi" ? route.distance : params.distance_to_pickup ? `${Number(params.distance_to_pickup).toFixed(1)} mi` : "--";

  const nextStepDistance = currentStep?.distance
    ? currentStep.distance < 160
      ? `${Math.round(currentStep.distance * 3.28084)} ft`
      : `${(currentStep.distance / 1609.34).toFixed(1)} mi`
    : etaStat;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        // No provider = default OSM tiles (free, no API key)
        initialRegion={{
          latitude: vehicleForRender.latitude,
          longitude: vehicleForRender.longitude,
          latitudeDelta: 0.015, // Smaller = less tiles to load
          longitudeDelta: 0.015,
        }}
        // customMapStyle removed - not supported by OSM
        rotateEnabled
        pitchEnabled
        toolbarEnabled={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        showsIndoorLevelPicker={false}
        showsPointsOfInterest={false}
        showsMyLocationButton={false}
        showsUserLocation={false}
        loadingEnabled={true}
        moveOnMarkerPress={false}
        // Aggressive padding - crops map edges, less tiles rendered
        mapPadding={{ top: 120, right: 0, bottom: 200, left: 0 }}
        // Limit zoom levels - less detail = faster rendering
        minZoomLevel={15}
        maxZoomLevel={18}
        // Performance: cache tiles, reduce overdraw
        cacheEnabled={Platform.OS === "android"}
        liteMode={false}
      >
        {/* Passed route */}
        {routePassed.length > 1 && (
          <Polyline
            coordinates={routePassed}
            strokeColor={COLORS.routePassed}
            strokeWidth={4}
            lineCap="butt"
            lineJoin="miter"
          />
        )}

        {/* Upcoming route - glow */}
        {routeUpcoming.length > 1 && (
          <Polyline
            coordinates={routeUpcoming}
            strokeColor={COLORS.routeGlow}
            strokeWidth={12}
            lineCap="butt"
            lineJoin="miter"
          />
        )}

        {/* Upcoming route - main */}
        {routeUpcoming.length > 1 && (
          <Polyline
            coordinates={routeUpcoming}
            strokeColor={COLORS.route}
            strokeWidth={6}
            lineCap="butt"
            lineJoin="miter"
          />
        )}

        {/* Driver marker */}
        <Marker
          coordinate={vehicleForRender}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
          tracksViewChanges={false}
        >
          <DriverCarMarker size={58} rotation={vehicle.heading} variant="arrow" />
        </Marker>

        {/* Destination marker */}
        <Marker coordinate={destForRender} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.destPinWrap}>
            <View style={styles.destPin} />
            <View style={styles.destPinStem} />
          </View>
        </Marker>
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topPadding}>
          <TopBanner
            heading={bannerHeading}
            address={bannerAddress}
            etaText={etaStat}
            turnArrow={turnArrow}
            nextStepDistance={nextStepDistance}
          />
        </View>

        <View style={styles.bottomWrap} pointerEvents="box-none">
          <BottomHUD
            distance={distanceStat}
            eta={etaStat}
            etaDetail={`ETA ${etaStat}`}
            speedLimit={speedLimit ? `${speedLimit} mph` : "--"}
            driverSpeed={`${location.speed ?? 0} mph`}
            overSpeed={overSpeed}
            arrived={arrived}
            tripStarted={tripStarted}
            canArrive={canArrive}
            userName={params.user_name || "Cliente"}
            userPhoto={params.user_photo}
            onArrivePress={handleArrivePress}
            onCancel={() => setShowCancelModal(true)}
            onCall={handleCall}
            onMessage={() => setShowMessageModal(true)}
          />
        </View>
      </SafeAreaView>

      {/* Cancel modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModal}>
            <Text style={styles.modalTitle}>Motivo de cancelación</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Escribe el motivo..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnSecondary} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalBtnText}>Cerrar</Text>
              </Pressable>
              <Pressable style={styles.modalBtnPrimary} onPress={handleCancelSave}>
                <Text style={styles.modalBtnText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Message modal */}
      <Modal
        visible={showMessageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModal}>
            <Text style={styles.modalTitle}>Mensaje al cliente</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={messageBody}
              onChangeText={setMessageBody}
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnSecondary} onPress={() => setShowMessageModal(false)}>
                <Text style={styles.modalBtnText}>Cerrar</Text>
              </Pressable>
              <Pressable style={styles.modalBtnPrimary} onPress={handleSendMessage}>
                <Text style={styles.modalBtnText}>Enviar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const toDeg = (rad: number) => rad * (180 / Math.PI);
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

async function fetchSpeedLimit(pos: LatLng): Promise<number | null> {
  try {
    const query = `[out:json];way(around:100,${pos.latitude},${pos.longitude})["highway"];out tags;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) return null;

    const data = await res.json();
    const match = data?.elements?.find((el: any) => el?.tags?.maxspeed);
    if (match) {
      const parsed = parseInt(match.tags.maxspeed, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }

    // Default speeds by road type
    const roadway = data?.elements?.[0];
    if (roadway?.tags?.highway) {
      const defaults: Record<string, number> = {
        motorway: 65,
        trunk: 55,
        primary: 45,
        secondary: 35,
        tertiary: 30,
        residential: 25,
        service: 15,
      };
      return defaults[roadway.tags.highway] || 35;
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// MEMOIZED UI COMPONENTS
// ============================================================================

const TopBanner = memo(function TopBanner({
  heading,
  address,
  etaText,
  turnArrow,
  nextStepDistance,
}: {
  heading: string;
  address: string;
  etaText: string;
  turnArrow: string;
  nextStepDistance: string;
}) {
  return (
    <View style={styles.topBanner}>
      <View style={styles.topBannerInner}>
        <View style={styles.bannerTextWrap}>
          <Text style={styles.bannerTitle}>{heading}</Text>
          {!!address && <Text style={styles.bannerSubtitle}>{address}</Text>}
        </View>
        <View style={styles.bannerRight}>
          <View style={styles.arrowPill}>
            <Text style={styles.curveArrow}>{turnArrow}</Text>
          </View>
          <View style={styles.distanceWrap}>
            <Text style={styles.distanceText}>{etaText}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const BottomHUD = memo(function BottomHUD({
  distance,
  eta,
  etaDetail,
  speedLimit,
  driverSpeed,
  overSpeed,
  arrived,
  tripStarted,
  canArrive,
  userName,
  userPhoto,
  onArrivePress,
  onCancel,
  onCall,
  onMessage,
}: {
  distance: string;
  eta: string;
  etaDetail: string;
  speedLimit: string;
  driverSpeed: string;
  overSpeed: boolean;
  arrived: boolean;
  tripStarted: boolean;
  canArrive: boolean;
  userName: string;
  userPhoto?: string;
  onArrivePress: () => void;
  onCancel: () => void;
  onCall: () => void;
  onMessage: () => void;
}) {
  const arriveLabel = tripStarted ? "En viaje" : arrived ? "Iniciar viaje" : "Arrived";
  const helper = tripStarted
    ? "Mostrando dropoff"
    : arrived
      ? "Listo para iniciar viaje"
      : "Disponible a 1 mi";

  return (
    <View style={styles.hudWrap}>
      <View style={styles.hudRow}>
        <HudTile primary={distance} />
        <HudTile primary={eta} secondary={etaDetail} />
      </View>

      <View style={styles.arriveWrap}>
        <Pressable
          style={[
            styles.arriveBtn,
            !canArrive && styles.arriveBtnDisabled,
            arrived && !tripStarted && styles.arriveBtnReady,
            tripStarted && styles.arriveBtnActive,
            overSpeed && styles.arriveBtnWarning,
          ]}
          onPress={onArrivePress}
          disabled={!canArrive && !arrived && !tripStarted}
        >
          <Text style={styles.arriveBtnText}>{arriveLabel}</Text>
          <Text style={styles.arriveBtnSub}>{helper}</Text>
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        <View style={styles.clientInfo}>
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.clientAvatar} />
          ) : (
            <View style={styles.clientAvatarPlaceholder}>
              <Text style={styles.clientAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.clientName} numberOfLines={1}>
            {userName}
          </Text>
        </View>
        <View style={styles.tabActions}>
          <TabItem icon="📞" onPress={onCall} />
          <TabItem icon="💬" onPress={onMessage} />
          <TabItem icon="✕" onPress={onCancel} />
        </View>
      </View>
    </View>
  );
});

const HudTile = memo(function HudTile({
  primary,
  secondary,
  highlight,
}: {
  primary: string;
  secondary?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.tile, highlight && styles.tileWarning]}>
      <Text style={[styles.tilePrimary, highlight && styles.tilePrimaryWarning]}>{primary}</Text>
      {secondary ? <Text style={styles.tileSecondary}>{secondary}</Text> : <View style={{ height: 14 }} />}
    </View>
  );
});

const TabItem = memo(function TabItem({ icon, onPress }: { icon: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Text style={styles.tabIcon}>{icon}</Text>
    </Pressable>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  overlay: { flex: 1 },
  topPadding: { paddingHorizontal: 12, paddingTop: 8 },

  topBanner: {
    borderRadius: 16,
    backgroundColor: COLORS.header,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  topBannerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  bannerTextWrap: { flex: 1, paddingHorizontal: 12 },
  bannerTitle: { color: COLORS.text, fontWeight: "900", fontSize: 22 },
  bannerSubtitle: { color: COLORS.textMuted, fontWeight: "700", fontSize: 16, marginTop: 2 },
  bannerRight: { alignItems: "flex-end", justifyContent: "center", gap: 6 },
  arrowPill: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  curveArrow: { color: COLORS.bg, fontSize: 20, fontWeight: "900" },
  distanceWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  distanceText: { color: COLORS.accent, fontWeight: "900", fontSize: 18 },

  bottomWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },
  hudWrap: { gap: 10 },
  hudRow: {
    flexDirection: "row",
    backgroundColor: "rgba(10,12,18,0.75)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingVertical: 12,
  },
  tile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 8,
  },
  tileWarning: { backgroundColor: "rgba(239,68,68,0.08)" },
  tilePrimary: { color: COLORS.text, fontWeight: "900", fontSize: 22 },
  tilePrimaryWarning: { color: COLORS.danger, fontSize: 24 },
  tileSecondary: { color: "rgba(255,255,255,0.70)", fontWeight: "800", fontSize: 12, marginTop: 4 },

  arriveWrap: { paddingHorizontal: 2 },
  arriveBtn: {
    borderRadius: 14,
    backgroundColor: "rgba(241,178,26,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  arriveBtnReady: { backgroundColor: "rgba(34,197,94,0.9)" },
  arriveBtnActive: { backgroundColor: "rgba(59,130,246,0.9)" },
  arriveBtnWarning: { borderColor: COLORS.danger },
  arriveBtnDisabled: { opacity: 0.55 },
  arriveBtnText: { color: "#0B0B0B", fontWeight: "900", fontSize: 18 },
  arriveBtnSub: { color: "#0B0B0B", fontWeight: "800", fontSize: 12, marginTop: 4, opacity: 0.85 },

  tabBar: {
    borderRadius: 14,
    backgroundColor: "rgba(10,12,18,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  clientAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(17,167,255,0.3)",
    borderWidth: 2,
    borderColor: "rgba(17,167,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  clientAvatarText: { color: COLORS.text, fontWeight: "900", fontSize: 18 },
  clientName: { color: COLORS.text, fontWeight: "800", fontSize: 15, maxWidth: 120 },
  tabActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  tabItem: { paddingHorizontal: 12, paddingVertical: 8 },
  tabIcon: { color: "rgba(255,255,255,0.9)", fontWeight: "900", fontSize: 18 },

  destPinWrap: { alignItems: "center" },
  destPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.amber,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  destPinStem: {
    width: 3,
    height: 18,
    backgroundColor: "rgba(241,178,26,0.85)",
    marginTop: -2,
    borderRadius: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  actionModal: {
    backgroundColor: "rgba(10,12,18,0.95)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: { color: COLORS.text, fontWeight: "900", fontSize: 18, marginBottom: 12 },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    color: COLORS.text,
    minHeight: 90,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 },
  modalBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modalBtnPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.green,
  },
  modalBtnText: { color: COLORS.text, fontWeight: "800", fontSize: 14 },
});

// ============================================================================
// MAP STYLE
// ============================================================================

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0c1018" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9cb4d6" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0c1018" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#151e2d" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: "#101927" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1f2f44" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#26354d" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a131e" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0f1a22" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
];
