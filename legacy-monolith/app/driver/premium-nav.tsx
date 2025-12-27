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
import { useNavigationCamera } from "@/hooks/navigation/useNavigationCamera";
import NavigationTopBanner from "@/components/NavigationTopBanner";
import DriverCarMarker from "@/components/DriverCarMarker";

// TopBannerProps removed - using NavigationTopBanner component

type HudProps = {
  distance: string;
  eta: string;
  etaDetail: string;
  nextTurn: string;
  nextTurnDetail: string;
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

type NavStep = {
  name: string;
  distance: number;
  maneuverType?: string;
  modifier?: string;
  location: LatLng;
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Snap a point to the nearest segment on a route (lightweight map-matching)
const snapToRoute = (route: LatLng[], point: LatLng): { point: LatLng; distanceMeters: number } => {
  let closest = point;
  let minDistSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const midLatRad = ((a.latitude + b.latitude) / 2) * (Math.PI / 180);
    const metersPerDegLat = 110540; // approx
    const metersPerDegLon = 111320 * Math.cos(midLatRad);

    const toXY = (c: LatLng) => ({
      x: c.longitude * metersPerDegLon,
      y: c.latitude * metersPerDegLat,
    });

    const aXY = toXY(a);
    const bXY = toXY(b);
    const pXY = toXY(point);

    const ab = { x: bXY.x - aXY.x, y: bXY.y - aXY.y };
    const ap = { x: pXY.x - aXY.x, y: pXY.y - aXY.y };
    const abLenSq = ab.x * ab.x + ab.y * ab.y || 1;
    const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / abLenSq));
    const proj = { x: aXY.x + ab.x * t, y: aXY.y + ab.y * t };
    const dx = pXY.x - proj.x;
    const dy = pXY.y - proj.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      closest = {
        latitude: proj.y / metersPerDegLat,
        longitude: proj.x / metersPerDegLon,
      };
    }
  }

  return { point: closest, distanceMeters: Math.sqrt(minDistSq) };
};

const calculateBearing = (from: LatLng, to: LatLng) => {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const toDeg = (rad: number) => rad * (180 / Math.PI);
  const dLon = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(toRad(to.latitude));
  const x =
    Math.cos(toRad(from.latitude)) * Math.sin(toRad(to.latitude)) -
    Math.sin(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
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

const formatStepDistance = (meters?: number | null) => {
  if (meters === null || meters === undefined || Number.isNaN(meters)) return "--";
  const miles = meters / 1609.34;
  if (miles >= 0.2) return `${miles.toFixed(1)} mi`;
  const feet = meters * 3.28084;
  return `${Math.max(1, Math.round(feet))} ft`;
};

const formatClock = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number, z = 2) => String(n).padStart(z, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

const lerpPos = (a: LatLng, b: LatLng, t: number): LatLng => ({
  latitude: lerp(a.latitude, b.latitude, t),
  longitude: lerp(a.longitude, b.longitude, t),
});

const isActionableStep = (step?: NavStep | null) => {
  if (!step) return false;
  const t = (step.maneuverType || "").toLowerCase();
  const m = (step.modifier || "").toLowerCase();
  const actionableTypes = new Set([
    "turn",
    "end of road",
    "fork",
    "merge",
    "on ramp",
    "off ramp",
    "roundabout",
    "rotary",
    "roundabout turn",
    "exit roundabout",
    "exit rotary",
  ]);
  const actionableModifiers = new Set(["left", "right", "slight left", "slight right", "uturn", "sharp left", "sharp right"]);
  return actionableTypes.has(t) || actionableModifiers.has(m);
};

const turnTextFromStep = (step?: NavStep | null) => {
  if (!step) return "Siguiente giro";
  if (step.maneuverType === "arrive") return "Llegada al destino";

  switch (step.modifier) {
    case "left":
      return "Gira a la izquierda";
    case "right":
      return "Gira a la derecha";
    case "slight left":
      return "Giro leve a la izquierda";
    case "slight right":
      return "Giro leve a la derecha";
    case "uturn":
      return "Vuelta en U";
    case "straight":
      return "Sigue recto";
    default:
      return "Continua";
  }
};

const turnSymbolFromStep = (step?: NavStep | null) => {
  if (!step) return undefined;
  const modifier = step.modifier?.toLowerCase();
  const type = step.maneuverType?.toLowerCase();
  if (!modifier && !type) return undefined;
  if (type === "arrive") return "•";
  switch (modifier) {
    case "left":
    case "sharp left":
      return "←";
    case "right":
    case "sharp right":
      return "→";
    case "slight left":
      return "↰";
    case "slight right":
      return "↱";
    case "uturn":
      return "↺";
    case "straight":
      return "↑";
    default:
      return undefined;
  }
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
  const [region] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [etaText, setEtaText] = useState("--");
  const [etaDetail, setEtaDetail] = useState("ETA --");
  const [distanceText, setDistanceText] = useState("--");
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null);
  const [navSteps, setNavSteps] = useState<NavStep[]>([]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [heading, setHeading] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [tripStarted, setTripStarted] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [isFollowing, setIsFollowing] = useState(true);
  const [isAerialView, setIsAerialView] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const lastLocationRef = useRef<{ pos: LatLng; ts: number } | null>(null);
  const headingRef = useRef(0);
  const initialRegionSet = useRef(false);
  const routeRef = useRef<LatLng[]>([]);
  const displayPosRef = useRef<LatLng | null>(null);
  const isFollowingRef = useRef(true);
  const isAerialViewRef = useRef(false);
  const followResumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navStepsRef = useRef<NavStep[]>([]);
  const activeStepRef = useRef(0);
  const stepReachedRef = useRef(false);
  const lastRouteOriginRef = useRef<LatLng | null>(null);
  const lastRouteTargetRef = useRef<LatLng | null>(null);
  const lastRouteFetchTsRef = useRef(0);
  const lastVisualUpdateRef = useRef(0);
  const lastDebugLogRef = useRef(0);
  // Simple animation: just store target, no buffer
  const targetPosRef = useRef<LatLng | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const gpsReadyRef = useRef(false);
  const gpsWarmupTsRef = useRef(0);
  // Throttle state updates to reduce re-renders
  const lastHeadingUpdateRef = useRef(0);
  const lastHeadingValueRef = useRef(0);
  const lastDistanceUpdateRef = useRef(0);

  useEffect(() => {
    routeRef.current = routeCoords;
  }, [routeCoords]);

  useEffect(() => {
    navStepsRef.current = navSteps;
  }, [navSteps]);

  useEffect(() => {
    activeStepRef.current = activeStepIndex;
  }, [activeStepIndex]);

  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  useEffect(() => {
    isAerialViewRef.current = isAerialView;
  }, [isAerialView]);

  useEffect(() => () => clearFollowTimer(), [clearFollowTimer]);

  // Smooth camera helper to follow the vehicle like Google Maps
  const { animateCamera, resetCamera } = useNavigationCamera({
    lookAheadKm: 0.001,
    pitch: 60,
    zoom: 17.4,
    updateInterval: 20, // balanced cadence with buffer
    minMovement: 0.05,
    minHeadingChange: 0.6,
    animationDuration: 30,
  });

  const stopAnim = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const clearFollowTimer = useCallback(() => {
    if (followResumeTimerRef.current) {
      clearTimeout(followResumeTimerRef.current);
      followResumeTimerRef.current = null;
    }
  }, []);

  const setFollowing = useCallback((val: boolean) => {
    isFollowingRef.current = val;
    setIsFollowing(val);
  }, []);

  const goAerialView = useCallback(
    (center?: LatLng | null, opts?: { force?: boolean }) => {
      if (isAerialViewRef.current && !opts?.force) {
        const focus = center || navTarget || displayPosRef.current;
        if (mapRef.current && focus) {
          try {
            mapRef.current.animateCamera({ center: focus, pitch: 0, heading: 0, zoom: 16 }, { duration: 300 });
          } catch { /* ignore */ }
        }
        return;
      }
      clearFollowTimer();
      setFollowing(false);
      setIsAerialView(true);
      isAerialViewRef.current = true;
      const focus = center || navTarget || displayPosRef.current;
      if (mapRef.current && focus) {
        try {
          mapRef.current.animateCamera({ center: focus, pitch: 0, heading: 0, zoom: 16 }, { duration: 600 });
        } catch { /* ignore */ }
      }
    },
    [clearFollowTimer, navTarget, setFollowing]
  );

  const exitAerialView = useCallback(() => {
    setIsAerialView(false);
    isAerialViewRef.current = false;
  }, []);

  const resumeFollowing = useCallback(() => {
    clearFollowTimer();
    exitAerialView();
    if (!isFollowingRef.current) setFollowing(true);
    const pos = displayPosRef.current;
    if (pos) animateCamera(mapRef.current, pos, headingRef.current);
  }, [animateCamera, clearFollowTimer, exitAerialView, setFollowing]);

  const pauseFollowing = useCallback(() => {
    clearFollowTimer();
    if (isFollowingRef.current) setFollowing(false);
    goAerialView(undefined, { force: true });
    followResumeTimerRef.current = setTimeout(resumeFollowing, 3200);
  }, [goAerialView, resumeFollowing, clearFollowTimer, setFollowing]);

  // Store animateCamera in ref to avoid recreating smoothStep
  const animateCameraRef = useRef(animateCamera);
  useEffect(() => { animateCameraRef.current = animateCamera; }, [animateCamera]);

  // Simple smooth animation loop - uses refs to avoid dependency changes
  const lastRenderRef = useRef(0);
  const smoothStepRef = useRef<(() => void) | null>(null);

  // Define smoothStep once, use refs for everything
  useEffect(() => {
    const step = () => {
      const target = targetPosRef.current;
      const current = displayPosRef.current;
      if (!target || !current) {
        animFrameRef.current = requestAnimationFrame(step);
        return;
      }
      // Lerp 18% toward target
      const newPos = lerpPos(current, target, 0.18);
      const moved = milesBetween(current, newPos) * 1609.34;
      const now = Date.now();
      // Only update React state every 120ms to reduce re-renders
      if (moved > 0.08 && now - lastRenderRef.current > 120) {
        lastRenderRef.current = now;
        displayPosRef.current = newPos;
        setVehiclePos(newPos);
      } else if (moved > 0.01) {
        displayPosRef.current = newPos;
      }
      // Camera can update more often via ref (no re-render)
      if (moved > 0.03 && isFollowingRef.current && !isAerialViewRef.current) {
        animateCameraRef.current?.(mapRef.current, newPos, headingRef.current);
      }
      animFrameRef.current = requestAnimationFrame(step);
    };
    smoothStepRef.current = step;
    animFrameRef.current = requestAnimationFrame(step);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []); // Empty deps - only run once

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
    exitAerialView();
  }, [
    params.origin_latitude,
    params.origin_longitude,
    params.destination_lat,
    params.destination_lon,
    params.pickup_lat,
    params.pickup_lon,
    exitAerialView,
  ]);

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
        lastLocationRef.current = { pos: start, ts: Date.now() };
        displayPosRef.current = start;
        if (!initialRegionSet.current && mapRef.current) {
          initialRegionSet.current = true;
          mapRef.current.animateCamera(
            {
              center: start,
              pitch: 60,
              heading: headingRef.current,
              zoom: 17.6,
            },
            { duration: 0 }
          );
        }
        const sensorHeading =
          typeof loc.coords.heading === "number" && !Number.isNaN(loc.coords.heading) ? loc.coords.heading : null;
        const initialHeading = sensorHeading ?? headingRef.current;
        setHeading(initialHeading);
        headingRef.current = initialHeading;
        resetCamera();
        // Initialize target for smooth animation
        targetPosRef.current = start;
        // GPS warmup: wait 1.5s before considering GPS stable
        gpsWarmupTsRef.current = Date.now();
        if (!isAerialView) {
          animateCamera(mapRef.current, start, initialHeading);
        } else {
          goAerialView(start);
        }
        if (navTarget) {
          setDistanceToTarget(milesBetween(start, navTarget));
        }
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 150, // Less aggressive to reduce memory pressure
            distanceInterval: 1, // Only trigger on real movement
            mayShowUserSettingsDialog: false,
          },
          (l) => {
            if (!mounted) return;
            const now = Date.now();
            // GPS warmup: ignore first 1.5s of data to let GPS stabilize
            if (!gpsReadyRef.current) {
              if (now - gpsWarmupTsRef.current < 1500) return;
              gpsReadyRef.current = true;
            }
            const raw = { latitude: l.coords.latitude, longitude: l.coords.longitude };
            const prev = lastLocationRef.current;
            const activeRoute = routeRef.current;

            // Light map-matching to keep position on the drawn route
            let adjusted = raw;
            if (activeRoute.length > 1) {
              const { point: snapped, distanceMeters } = snapToRoute(activeRoute, raw);
              if (distanceMeters < 120) {
                adjusted = snapped;
              }
            }

            const movedMeters = prev ? milesBetween(prev.pos, adjusted) * 1609.34 : Infinity;
            // If huge jump (>500m), this is likely a route restart - reset position instead of ignoring
            if (movedMeters > 500) {
              if (__DEV__) console.log("[nav] GPS reset (jump):", movedMeters.toFixed(0), "m - accepting new position");
              // Reset: accept new position as starting point
              lastLocationRef.current = { pos: adjusted, ts: now };
              targetPosRef.current = adjusted;
              displayPosRef.current = adjusted;
              setVehiclePos(adjusted);
              // Recalculate route from new position
              if (navTarget) {
                lastRouteOriginRef.current = null;
                lastRouteFetchTsRef.current = 0;
              }
              return;
            }

            lastLocationRef.current = { pos: adjusted, ts: now };
            // Just update the target - the animation loop will smoothly interpolate
            targetPosRef.current = adjusted;

            // Debug log (less frequent)
            if (__DEV__ && now - lastDebugLogRef.current > 500) {
              lastDebugLogRef.current = now;
              console.log(
                "[nav]",
                formatClock(now),
                "moved", `${movedMeters.toFixed(1)}m`,
                "heading", `${headingRef.current.toFixed(0)}°`
              );
            }

            let nextHeading =
              typeof l.coords.heading === "number" && !Number.isNaN(l.coords.heading) ? l.coords.heading : null;
            if (!nextHeading && prev) {
              nextHeading = calculateBearing(prev.pos, adjusted);
            }
            const finalHeading = nextHeading ?? headingRef.current;
            headingRef.current = finalHeading;
            // Throttle heading state updates: only update when changed >3° OR every 300ms
            const headingDiff = Math.abs(finalHeading - lastHeadingValueRef.current);
            if (headingDiff > 3 || now - lastHeadingUpdateRef.current > 300) {
              lastHeadingUpdateRef.current = now;
              lastHeadingValueRef.current = finalHeading;
              setHeading(finalHeading);
            }

            if (navTarget) {
              const milesToTarget = milesBetween(adjusted, navTarget);
              // Throttle distance state updates: only every 400ms
              if (now - lastDistanceUpdateRef.current > 400) {
                lastDistanceUpdateRef.current = now;
                setDistanceToTarget(milesToTarget);
              }
              // 300 ft ≈ 0.0568 mi
              if (!isAerialViewRef.current && milesToTarget <= 0.0568) {
                goAerialView(navTarget);
              }
            }

            // Refresh route only when moved enough or target changed
            if (navTarget) {
              const movedFromRoute =
                lastRouteOriginRef.current ? milesBetween(lastRouteOriginRef.current, adjusted) * 1609.34 : Infinity;
              const targetChanged =
                !lastRouteTargetRef.current ||
                milesBetween(lastRouteTargetRef.current, navTarget) * 1609.34 > 2;
              if (
                (movedFromRoute > 50 || targetChanged) &&
                now - lastRouteFetchTsRef.current > 3000
              ) {
                lastRouteOriginRef.current = adjusted;
                lastRouteTargetRef.current = navTarget;
                lastRouteFetchTsRef.current = now;
                fetchRoute(adjusted, navTarget);
              }
            }
            const steps = navStepsRef.current;
            const activeIdx = activeStepRef.current;
            const activeStep = steps[activeIdx];
            if (activeStep) {
              const distMeters = milesBetween(adjusted, activeStep.location) * 1609.34;
              if (distMeters <= 18) {
                stepReachedRef.current = true;
              }
              if (stepReachedRef.current && distMeters > 18 && activeIdx < steps.length - 1) {
                activeStepRef.current = activeIdx + 1;
                setActiveStepIndex(activeIdx + 1);
                stepReachedRef.current = false;
              }
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
  }, [navTarget, animateCamera, resetCamera, goAerialView, isAerialView]);

  // Recenter when map becomes ready or when switching pickup -> dropoff
  useEffect(() => {
    if (!mapReady || !vehiclePos) return;
    if (isFollowing) {
      resetCamera();
      animateCamera(mapRef.current, vehiclePos, headingRef.current);
    } else if (isAerialView) {
      goAerialView(vehiclePos);
    }
  }, [mapReady, vehiclePos, navTarget, animateCamera, resetCamera, isFollowing, isAerialView, goAerialView]);

  const fetchRoute = useCallback(async (start: LatLng, dest: LatLng) => {
    try {
      const origin = `${start.longitude},${start.latitude}`;
      const destination = `${dest.longitude},${dest.latitude}`;
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=polyline&steps=true`
      );
      if (!res.ok) return;
      const data = await res.json();
      const route = data?.routes?.[0];
      const poly = route?.geometry;
      const leg = route?.legs?.[0];
      const steps: NavStep[] =
        leg?.steps?.map((s: any) => ({
          name: (s.name as string)?.trim() || s.ref || "Siguiente giro",
          distance: typeof s.distance === "number" ? s.distance : 0,
          maneuverType: s.maneuver?.type,
          modifier: s.maneuver?.modifier,
          location: {
            latitude: s.maneuver?.location?.[1] ?? dest.latitude,
            longitude: s.maneuver?.location?.[0] ?? dest.longitude,
          },
        })) ?? [];

      navStepsRef.current = steps;
      setNavSteps(steps);
      activeStepRef.current = 0;
      setActiveStepIndex(0);
      stepReachedRef.current = false;

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
    if (!navTarget) return;
    const origin = lastLocationRef.current?.pos ?? vehiclePos;
    if (!origin) return;
    const targetChanged =
      !lastRouteTargetRef.current ||
      milesBetween(lastRouteTargetRef.current, navTarget) * 1609.34 > 2;
    if (!targetChanged) return;

    lastRouteTargetRef.current = navTarget;
    lastRouteOriginRef.current = origin;
    lastRouteFetchTsRef.current = Date.now();
    fetchRoute(origin, navTarget);
  }, [navTarget, fetchRoute]);

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
  const bannerContext =
    primaryAddress?.split(",").slice(1).join(", ").trim() || (headingToDropoff ? "Destino" : "Recogida");
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
  const currentStep = navSteps[activeStepIndex] ?? null;
  const displayStep =
    navSteps.slice(activeStepIndex).find((s) => isActionableStep(s)) ||
    currentStep ||
    navSteps[activeStepIndex + 1] ||
    null;
  const displayDistMeters =
    displayStep && vehiclePos
      ? milesBetween(vehiclePos, displayStep.location) * 1609.34
      : displayStep?.distance ?? null;
  const nextStreetName =
    displayStep?.name || primaryAddress?.split(",")[0] || (headingToDropoff ? "Destino" : "Recogida");
  const nextTurnInstruction = turnTextFromStep(displayStep);
  const nextTurnSymbol = turnSymbolFromStep(displayStep);
  const nextStepDistanceText = displayDistMeters !== null ? formatStepDistance(displayDistMeters) : distanceStat;
  const bannerDistance = displayDistMeters !== null ? formatStepDistance(displayDistMeters) : undefined;
  const bannerContextLabel = headingToDropoff ? "Ir a destino" : "Ir a recogida";
  const bannerContextLine = bannerContext ? `${bannerContextLabel} - ${bannerContext}` : bannerContextLabel;
  const hudNextPrimary = nextStepDistanceText;
  const hudNextSecondary = nextTurnInstruction;
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
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        onMapReady={() => setMapReady(true)}
        onPanDrag={pauseFollowing}
        onTouchStart={pauseFollowing}
        customMapStyle={darkMapStyle}
        rotateEnabled
        pitchEnabled
        toolbarEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
        loadingEnabled={false}
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

        <Marker coordinate={vehicleForRender} anchor={{ x: 0.5, y: 0.5 }} flat tracksViewChanges={false}>
          <DriverCarMarker size={52} rotation={heading} variant="arrow" />
        </Marker>

        <Marker coordinate={destForRender} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
          <View style={styles.destPinWrap}>
            <View style={styles.destPin} />
            <View style={styles.destPinStem} />
          </View>
        </Marker>
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBannerOverlay} pointerEvents="box-none">
          <NavigationTopBanner
            distance={bannerDistance}
            instruction={nextTurnInstruction || undefined}
            street={nextStreetName || undefined}
            turnSymbol={nextTurnSymbol || undefined}
          />
        </View>
        <View style={styles.bottomWrap} pointerEvents="box-none">
          <BottomHUD
            distance={distanceStat}
            eta={etaStat}
            etaDetail={etaDetail}
            nextTurn={hudNextPrimary}
            nextTurnDetail={hudNextSecondary}
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

// TopInstructionBanner removed - now using NavigationTopBanner component

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
        <HudTile primary={props.distance} secondary="Distancia" />
        <HudTile primary={props.eta} secondary={props.etaDetail} />
        <HudTile primary={props.nextTurn} secondary={props.nextTurnDetail} isLast />
      </View>

      <View style={styles.arriveWrap}>
        <Pressable
          style={[
            styles.arriveBtn,
            !props.canArrive && styles.arriveBtnDisabled,
            props.arrived && !props.tripStarted && styles.arriveBtnReady,
            props.tripStarted && styles.arriveBtnActive,
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

function HudTile({ primary, secondary, isLast }: { primary: string; secondary?: string; isLast?: boolean }) {
  return (
    <View style={[styles.tile, isLast && styles.tileLast]}>
      <Text style={styles.tilePrimary}>{primary}</Text>
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

// Chevron3D removed - now using DriverCarMarker

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, position: "relative" },
  overlay: { flex: 1 },
  topPadding: { paddingHorizontal: 12, paddingTop: 8 },
  topBannerOverlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },

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
  tileLast: { borderRightWidth: 0 },
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



