import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Linking,
} from "react-native";
import MapView, { LatLng, Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { fetchAPI } from "@/lib/fetch";

type TopBannerProps = {
  exitLabel: string;
  routeName: string;
  city: string;
  distanceText: string;
};

type HudProps = {
  distance: string;
  eta: string;
  etaDetail: string;
  speedLimit: string;
  driverSpeed: string;
  overSpeed: boolean;
  arrived: boolean;
  tripStarted: boolean;
  canArrive: boolean;
  onArrivePress: () => void;
  onCancel: () => void;
  onCall: () => void;
  onMessage: () => void;
};

type EventLogEntry = {
  type: "cancel" | "message" | "call" | "status";
  text: string;
  at: number;
};

const COLORS = {
  bg: "#05070B",
  route: "#11A7FF",
  routeGlow: "rgba(17,167,255,0.25)",
  green: "#0F6B46",
  amber: "#F1B21A",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.75)",
  danger: "#ef4444",
};

// Fallback route to avoid render errors if no coords are available yet
const MOCK_ROUTE: LatLng[] = [
  { latitude: 37.7749, longitude: -122.4194 },
  { latitude: 37.7757, longitude: -122.4155 },
  { latitude: 37.7772, longitude: -122.4119 },
  { latitude: 37.7801, longitude: -122.4088 },
  { latitude: 37.784, longitude: -122.4064 },
];

const milesBetween = (a: LatLng, b: LatLng) => {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const R = 3959;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const mphFromMetersPerSecond = (speed?: number | null) => {
  if (speed === null || speed === undefined || Number.isNaN(speed)) return null;
  return Math.max(0, speed * 2.23694);
};

// Decode polyline precision 5
const decodePolyline = (encoded: string) => {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

export default function PremiumNavScreen() {
  const params = useLocalSearchParams<{
    destination_lat?: string;
    destination_lon?: string;
    origin_latitude?: string;
    origin_longitude?: string;
    pickup_lat?: string;
    pickup_lon?: string;
    origin_address?: string;
    destination_address?: string;
    user_name?: string;
    distance_to_pickup?: string;
    estimated_pickup_time?: string;
    user_phone?: string;
    driver_id?: string;
    ride_id?: string;
  }>();
  const phoneNumber = (params.user_phone as string) || "";
  const driverId = params.driver_id ? Number(params.driver_id) : null;
  const rideId = params.ride_id ? Number(params.ride_id) : null;

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [vehiclePos, setVehiclePos] = useState<LatLng | null>(null);
  const [navTarget, setNavTarget] = useState<LatLng | null>(null);
  const [dropoffTarget, setDropoffTarget] = useState<LatLng | null>(null);
  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [etaText, setEtaText] = useState("--");
  const [etaDetail, setEtaDetail] = useState("ETA --");
  const [distanceText, setDistanceText] = useState("--");
  const [driverSpeed, setDriverSpeed] = useState<number | null>(null);
  const [speedLimit, setSpeedLimit] = useState<number | null>(null);
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [arrived, setArrived] = useState(false);
  const [tripStarted, setTripStarted] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const speedLimitFetchRef = useRef(0);
  const lastLocationRef = useRef<{ pos: LatLng; ts: number } | null>(null);

  // Setup initial pickup and dropoff targets
  useEffect(() => {
    const pickupLat = Number(params.origin_latitude) || Number(params.destination_lat) || Number(params.pickup_lat);
    const pickupLon = Number(params.origin_longitude) || Number(params.destination_lon) || Number(params.pickup_lon);
    if (pickupLat && pickupLon) {
      setNavTarget({ latitude: pickupLat, longitude: pickupLon });
    }
    const dropLat = Number(params.destination_lat);
    const dropLon = Number(params.destination_lon);
    if (dropLat && dropLon) {
      setDropoffTarget({ latitude: dropLat, longitude: dropLon });
    }
  }, [
    params.origin_latitude,
    params.origin_longitude,
    params.destination_lat,
    params.destination_lon,
    params.pickup_lat,
    params.pickup_lon,
  ]);

  const fetchSpeedLimit = useCallback(async (pos: LatLng) => {
    try {
      const query = `[out:json];way(around:80,${pos.latitude},${pos.longitude})["highway"]["maxspeed"];out tags;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) return;
      const data = await res.json();
      const match = data?.elements?.find((el: any) => el?.tags?.maxspeed);
      const maxspeed = match?.tags?.maxspeed as string | undefined;
      if (maxspeed) {
        const parsed = parseInt(maxspeed, 10);
        if (!Number.isNaN(parsed)) {
          setSpeedLimit(parsed);
        }
      }
    } catch {
      // ignore failures
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const setup = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!mounted) return;
        const start = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setVehiclePos(start);
        setRegion((r) => ({ ...r, latitude: start.latitude, longitude: start.longitude }));
        lastLocationRef.current = { pos: start, ts: Date.now() };
        if (navTarget) {
          setDistanceToTarget(milesBetween(start, navTarget));
        }
        if (Date.now() - speedLimitFetchRef.current > 1000) {
          speedLimitFetchRef.current = Date.now();
          fetchSpeedLimit(start);
        }

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 2500, distanceInterval: 5 },
          (l) => {
            if (!mounted) return;
            const next = { latitude: l.coords.latitude, longitude: l.coords.longitude };
            const now = Date.now();
            const prev = lastLocationRef.current;

            lastLocationRef.current = { pos: next, ts: now };
            setVehiclePos(next);
            setRegion((r) => ({ ...r, latitude: next.latitude, longitude: next.longitude }));

            let mph = mphFromMetersPerSecond(typeof l.coords.speed === "number" ? l.coords.speed : null);
            if ((!mph || Number.isNaN(mph)) && prev) {
              const miles = milesBetween(prev.pos, next);
              const hours = (now - prev.ts) / 3600000;
              mph = hours > 0 ? miles / hours : null;
            }
            setDriverSpeed(mph ? Math.max(0, Math.round(mph)) : null);

            if (navTarget) {
              setDistanceToTarget(milesBetween(next, navTarget));
            }

            if (now - speedLimitFetchRef.current > 45000) {
              speedLimitFetchRef.current = now;
              fetchSpeedLimit(next);
            }
          }
        );
      } catch (e) {
        console.warn("Route fetch error", e);
      }
    };

    setup();
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [navTarget, fetchSpeedLimit]);

  const fetchRoute = useCallback(async (start: LatLng, dest: LatLng) => {
    try {
      const origin = `${start.longitude},${start.latitude}`;
      const destination = `${dest.longitude},${dest.latitude}`;
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=polyline`
      );
      if (!res.ok) return;
      const data = await res.json();
      const poly = data?.routes?.[0]?.geometry;
      const route = data?.routes?.[0];
      if (poly && route) {
        const decoded = decodePolyline(poly);
        setRouteCoords(decoded);
        const minutes = Math.max(1, Math.round(route.duration / 60));
        const miles = (route.distance / 1609.34).toFixed(1);
        setEtaText(`${minutes} min`);
        setEtaDetail(`ETA ${minutes} min`);
        setDistanceText(`${miles} mi`);
      }
    } catch (e) {
      console.warn("Route fetch error", e);
    }
  }, []);

  useEffect(() => {
    if (!vehiclePos || !navTarget) return;
    const handle = setTimeout(() => fetchRoute(vehiclePos, navTarget), 600);
    return () => clearTimeout(handle);
  }, [vehiclePos, navTarget, fetchRoute]);

  useEffect(() => {
    if (vehiclePos && navTarget) {
      setDistanceToTarget(milesBetween(vehiclePos, navTarget));
    }
  }, [vehiclePos, navTarget]);

  const routeForRender = routeCoords.length ? routeCoords : MOCK_ROUTE;
  const vehicleForRender = vehiclePos || routeForRender[0];
  const destForRender = navTarget || routeForRender[routeForRender.length - 1];

  const headingToDropoff = tripStarted && dropoffTarget;
  const primaryAddress = headingToDropoff
    ? params.destination_address
    : params.origin_address || params.destination_address;
  const bannerTitle = primaryAddress?.split(",")[0] || (headingToDropoff ? "Destino" : "Recogida");
  const bannerCity =
    primaryAddress?.split(",").slice(1).join(", ").trim() || (headingToDropoff ? "Destino" : "Recogida");
  const exitLabel = headingToDropoff ? "Ir a destino" : "Ir a recogida";
  const distanceStat =
    distanceText !== "--"
      ? distanceText
      : params.distance_to_pickup
        ? `${Number(params.distance_to_pickup).toFixed(1)} mi`
        : "--";
  const etaStat =
    etaText !== "--"
      ? etaText
      : params.estimated_pickup_time
        ? `${params.estimated_pickup_time} min`
        : "--";

  const speedLimitDisplay = speedLimit ? `${speedLimit} mph` : "--";
  const driverSpeedDisplay = driverSpeed !== null ? `${driverSpeed} mph` : "--";
  const overSpeed = speedLimit !== null && driverSpeed !== null && driverSpeed > speedLimit + 6;
  const canArrive = (distanceToTarget !== null && distanceToTarget <= 1) || arrived || tripStarted;

  const handleArrivePress = async () => {
    if (!arrived && !tripStarted) {
      if (!distanceToTarget || distanceToTarget > 1) {
        Alert.alert("Muy lejos", "Acércate a 1 mi del cliente para marcar Arrived.");
        return;
      }
      setArrived(true);
      setEventLog((prev) => [...prev, { type: "status", text: "Arrived marcado", at: Date.now() }]);
      return;
    }

    if (!tripStarted) {
      setTripStarted(true);
      if (dropoffTarget) {
        setNavTarget(dropoffTarget);
      }
      setEventLog((prev) => [...prev, { type: "status", text: "Viaje iniciado hacia dropoff", at: Date.now() }]);

      // Notifica al backend que el viaje inició (afecta tarifa de cancelación)
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
    setEventLog((prev) => [...prev, { type: "cancel", text: cancelReason.trim(), at: Date.now() }]);
    setCancelReason("");
    setShowCancelModal(false);
  };

  const handleSendMessage = async () => {
    if (!messageBody.trim()) {
      Alert.alert("Mensaje vacío", "Escribe tu mensaje para el cliente.");
      return;
    }
    if (!rideId || !driverId) {
      console.warn("Missing ids for message", { rideId, driverId, params });
      Alert.alert(
        "No se pudo enviar",
        `Falta ride_id o driver_id para enviar el mensaje. ride_id=${rideId ?? ""} driver_id=${driverId ?? ""}`
      );
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
      setEventLog((prev) => [...prev, { type: "message", text, at: Date.now() }]);
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
    setEventLog((prev) => [...prev, { type: "call", text: `Llamada a ${phoneNumber}`, at: Date.now() }]);
  };

  return (
    <View style={styles.root}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        region={region}
        customMapStyle={darkMapStyle}
        rotateEnabled
        pitchEnabled
        toolbarEnabled={false}
      >
        <Polyline
          coordinates={routeForRender}
          strokeColor={COLORS.routeGlow}
          strokeWidth={18}
          lineCap="round"
          lineJoin="round"
        />
        <Polyline
          coordinates={routeForRender}
          strokeColor={COLORS.route}
          strokeWidth={8}
          lineCap="round"
          lineJoin="round"
        />

        <Marker coordinate={vehicleForRender} anchor={{ x: 0.5, y: 0.5 }}>
          <Chevron3D />
        </Marker>

        <Marker coordinate={destForRender} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.destPinWrap}>
            <View style={styles.destPin} />
            <View style={styles.destPinStem} />
          </View>
        </Marker>
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topPadding}>
          <TopInstructionBanner
            exitLabel={exitLabel}
            routeName={bannerTitle}
            city={bannerCity}
            distanceText={etaStat}
          />
        </View>

        <View style={styles.bottomWrap} pointerEvents="box-none">
          <BottomHUD
            distance={distanceStat}
            eta={etaStat}
            etaDetail={etaDetail}
            speedLimit={speedLimitDisplay}
            driverSpeed={driverSpeedDisplay}
            overSpeed={overSpeed}
            arrived={arrived}
            tripStarted={tripStarted}
            canArrive={canArrive}
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

function TopInstructionBanner(props: TopBannerProps) {
  return (
    <View style={styles.topBanner}>
      <View style={styles.topBannerInner}>
        <View style={styles.shield}>
          <Text style={styles.shieldText}>101</Text>
        </View>
        <View style={styles.bannerTextWrap}>
          <Text style={styles.bannerTitle}>{props.exitLabel}</Text>
          <Text style={styles.bannerSubtitle}>{props.routeName}</Text>
          <Text style={styles.bannerCity}>{props.city}</Text>
        </View>
        <View style={styles.bannerRight}>
          <View style={styles.arrowPill}>
            <Text style={styles.curveArrow}>{">"}</Text>
          </View>
          <View style={styles.distanceWrap}>
            <Text style={styles.distanceText}>{props.distanceText}</Text>
            <Text style={styles.distanceTri}>v</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function BottomHUD(props: HudProps) {
  const arriveLabel = props.tripStarted ? "En viaje" : props.arrived ? "Iniciar viaje" : "Arrived";
  const helper = props.tripStarted
    ? "Mostrando dropoff"
    : props.arrived
      ? "Listo para iniciar viaje"
      : "Disponible a 1 mi";

  return (
    <View style={styles.hudWrap}>
      <View style={styles.hudRow}>
        <HudTile primary={props.distance} />
        <HudTile primary={props.eta} secondary={props.etaDetail} />
        <HudTile primary={props.speedLimit} secondary="Speed limit" />
        <HudTile primary={props.driverSpeed} secondary="Velocidad" highlight={props.overSpeed} />
      </View>

      <View style={styles.arriveWrap}>
        <Pressable
          style={[
            styles.arriveBtn,
            !props.canArrive && styles.arriveBtnDisabled,
            props.arrived && !props.tripStarted && styles.arriveBtnReady,
            props.tripStarted && styles.arriveBtnActive,
            props.overSpeed && styles.arriveBtnWarning,
          ]}
          onPress={props.onArrivePress}
          disabled={!props.canArrive && !props.arrived && !props.tripStarted}
        >
          <Text style={styles.arriveBtnText}>{arriveLabel}</Text>
          <Text style={styles.arriveBtnSub}>{helper}</Text>
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        <TabItem icon="X" label="Cancelar viaje" onPress={props.onCancel} />
        <TabItem icon="L" label="Llamadas" onPress={props.onCall} />
        <TabItem icon="M" label="Mensajes" onPress={props.onMessage} />
      </View>
    </View>
  );
}

function HudTile({ primary, secondary, highlight }: { primary: string; secondary?: string; highlight?: boolean }) {
  return (
    <View style={[styles.tile, highlight && styles.tileWarning]}>
      <Text style={[styles.tilePrimary, highlight && styles.tilePrimaryWarning]}>{primary}</Text>
      {secondary ? <Text style={styles.tileSecondary}>{secondary}</Text> : <View style={{ height: 14 }} />}
    </View>
  );
}

function TabItem({ icon, label, onPress }: { icon: string; label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={styles.tabLabel}>{label}</Text>
    </Pressable>
  );
}

function Chevron3D() {
  return (
    <View style={styles.chevronWrap}>
      <View style={styles.chevron} />
      <View style={styles.chevronReflection} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  overlay: { flex: 1 },
  topPadding: { paddingHorizontal: 12, paddingTop: 8 },

  topBanner: {
    borderRadius: 16,
    backgroundColor: "rgba(15,107,70,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
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
  shield: {
    width: 58,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  shieldText: { fontSize: 18, fontWeight: "900", color: "#0B0B0B" },
  bannerTextWrap: { flex: 1, paddingHorizontal: 12 },
  bannerTitle: { color: COLORS.text, fontWeight: "900", fontSize: 24 },
  bannerSubtitle: { color: COLORS.text, fontWeight: "800", fontSize: 18, marginTop: 1 },
  bannerCity: { color: COLORS.textMuted, fontWeight: "700", fontSize: 14, marginTop: 2 },
  bannerRight: { alignItems: "flex-end", justifyContent: "center", gap: 6 },
  arrowPill: {
    backgroundColor: COLORS.amber,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  curveArrow: { color: "#0B0B0B", fontSize: 20, fontWeight: "900" },
  distanceWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  distanceText: { color: COLORS.amber, fontWeight: "900", fontSize: 20 },
  distanceTri: { color: COLORS.amber, fontWeight: "900", fontSize: 14, marginTop: 2 },

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
  tileWarning: {
    backgroundColor: "rgba(239,68,68,0.08)",
  },
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
  arriveBtnReady: {
    backgroundColor: "rgba(34,197,94,0.9)",
  },
  arriveBtnActive: {
    backgroundColor: "rgba(59,130,246,0.9)",
  },
  arriveBtnWarning: {
    borderColor: COLORS.danger,
  },
  arriveBtnDisabled: { opacity: 0.55 },
  arriveBtnText: { color: "#0B0B0B", fontWeight: "900", fontSize: 18 },
  arriveBtnSub: { color: "#0B0B0B", fontWeight: "800", fontSize: 12, marginTop: 4, opacity: 0.85 },

  tabBar: {
    borderRadius: 14,
    backgroundColor: "rgba(10,12,18,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  tabItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  tabIcon: { color: "rgba(255,255,255,0.9)", fontWeight: "900", fontSize: 14 },
  tabLabel: { color: "rgba(255,255,255,0.85)", fontWeight: "800", fontSize: 14 },

  logPill: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(10,12,18,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  logText: { color: COLORS.textMuted, fontWeight: "700", fontSize: 12 },

  chevronWrap: { alignItems: "center", justifyContent: "center" },
  chevron: {
    width: 64,
    height: 64,
    borderRadius: 18,
    transform: [{ rotate: "45deg" }],
    backgroundColor: COLORS.route,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  chevronReflection: {
    width: 64,
    height: 22,
    borderRadius: 14,
    transform: [{ rotate: "45deg" }, { translateY: -14 }],
    backgroundColor: "rgba(17,167,255,0.18)",
  },
  destPinWrap: { alignItems: "center" },
  destPin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.amber,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  destPinStem: { width: 3, height: 18, backgroundColor: "rgba(241,178,26,0.85)", marginTop: -2, borderRadius: 2 },

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

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8ca2c5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1220" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2436" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#121a28" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#22324b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#071018" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];
