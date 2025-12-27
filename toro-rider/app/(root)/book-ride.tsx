import { useUser } from "@clerk/clerk-expo";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  View,
  Animated,
  Easing,
  TouchableOpacity,
  Alert,
  Dimensions,
  Linking,
  Vibration,
  Platform,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, AnimatedRegion } from "react-native-maps";
import { router, useLocalSearchParams } from "expo-router";

import RideLayout from "@/components/RideLayout";
import RideChat from "@/components/RideChat";
import StripeProviderWrapper from "@/components/StripeProviderWrapper";
import { icons, images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { fetchRoutePolyline, fetchRouteEtaMinutes, simplifyPolyline } from "@/lib/map";
import DriverCarMarker from "@/components/DriverCarMarker";
import { useDriverStore, useLocationStore } from "@/store";
import { useThemeStore, themeColors } from "@/store/themeStore";
import type { Driver, Ride } from "@/types/type";
// Local car PNG (user-provided asset).
const driverCarAsset = require("@/assets/skins/cars/driver-car-3d.png");

// Extended driver type with contact info
interface DriverWithContact extends Driver {
  phone_number?: string;
  allow_calls?: boolean;
  allow_messages?: boolean;
}

const { width } = Dimensions.get("window");

const darkRoadMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#111418" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6f7a86" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b0d11" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#161b22" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f1318" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1a2029" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b0f14" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0d1116" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

// Calculate distance between two points in miles
const getDistanceInMiles = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const R = 3959;
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

// Estimate ETA based on distance (assuming average 25 mph in city)
const estimateETA = (distanceMiles: number): number => {
  return Math.ceil(distanceMiles * 2.4); // minutes
};

const formatTimer = (seconds: number) => {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const toNumberOrNull = (value: any): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const ensureRouteEndsAtTarget = (
  coords: { latitude: number; longitude: number }[] | null,
  target: { latitude: number; longitude: number },
) => {
  if (!coords || !coords.length) return coords;
  const last = coords[coords.length - 1];
  const closeEnough = Math.abs(last.latitude - target.latitude) < 1e-5 && Math.abs(last.longitude - target.longitude) < 1e-5;
  return closeEnough ? coords : [...coords, target];
};

const BookRide = () => {
  const params = useLocalSearchParams();
  const isGuestRide = params?.guest === "1" || params?.for === "guest";
  const { user } = useUser();
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const {
    userAddress,
    destinationAddress,
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
    destinationHistory,
    setDestinationLocation,
  } = useLocationStore();
  const { drivers, selectedDriver } = useDriverStore();
  const [pendingRide, setPendingRide] = useState<Ride | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<DriverWithContact | null>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [prevDriverLocation, setPrevDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [driverHeadingFromGPS, setDriverHeadingFromGPS] = useState<number>(0);
  const driverAnimatedCoord = useRef<AnimatedRegion | null>(null);
  const [driverETA, setDriverETA] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const lastRouteRef = useRef<{ driver?: { latitude: number; longitude: number }; target?: { latitude: number; longitude: number } } | null>(null);
  const lastEtaFetchRef = useRef<number>(0);
  const lastEtaKeyRef = useRef<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "creating" | "searching" | "assigned" | "ontrip"
  >("idle");
  // No dibujamos rutas; omitimos estados de ruta para evitar llamadas innecesarias
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driverPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulse = useRef(new Animated.Value(0.95)).current;
  const searchLaser = useRef(new Animated.Value(0)).current;
  const rideCreatedRef = useRef(false);
  const lastPanRef = useRef<number>(0);
  const recenterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);
  // ETA se estima en base a distancia en línea recta
  const [chatVisible, setChatVisible] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [searchElapsed, setSearchElapsed] = useState(0);
  const searchStartRef = useRef<number | null>(null);
  const isAssigned = (status === "assigned" || status === "ontrip") && !!assignedDriver;
  const rideSnapPoints = isAssigned ? ["20%", "55%", "90%"] : ["15%", "35%", "70%"];
  const bottomSheetIndex = status === "searching" ? 1 : 0;
  const hasCenteredOnUser = useRef(false);

  // Fase pickup:
  // - searching/assigned siempre van al pickup
  // - se cambia al destino solo cuando el flujo pasa a "ontrip" (autorizado por driver/admin)
  const enRutaAPickup = useMemo(() => status !== "ontrip", [status]);

  // Distancia dinámica al pickup para decidir si aún vamos por el cliente
  const distanceToPickup = useMemo(() => {
    if (!pickupPosition || !driverLocation) return null;
    return getDistanceInMiles(
      driverLocation.latitude,
      driverLocation.longitude,
      pickupPosition.latitude,
      pickupPosition.longitude,
    );
  }, [driverLocation, pickupPosition]);

  // Distancia al destino
  const distanceToDestination = useMemo(() => {
    if (!driverLocation || destinationLatitude == null || destinationLongitude == null) return null;
    return getDistanceInMiles(
      driverLocation.latitude,
      driverLocation.longitude,
      Number(destinationLatitude),
      Number(destinationLongitude),
    );
  }, [driverLocation, destinationLatitude, destinationLongitude]);

  // Distancia al target actual (pickup o destino según fase)
  const remainingDistance = useMemo(() => {
    return enRutaAPickup ? distanceToPickup : distanceToDestination;
  }, [enRutaAPickup, distanceToPickup, distanceToDestination]);

  const showPickupMarker = enRutaAPickup && !!pickupPosition;
  const showDestinationMarker = !enRutaAPickup && !!destinationLatitude && !!destinationLongitude;

  const vehicleColor = useMemo(() => {
    const raw = (assignedDriver as any)?.vehicle_color
      ?? (assignedDriver as any)?.car_color
      ?? (assignedDriver as any)?.carColor
      ?? null;
    if (typeof raw === "string" && raw.trim()) return raw;
    return "#00E0FF";
  }, [assignedDriver]);

  // Si regresamos a fase pickup (ej. status ontrip pero lejos), borra polyline a destino para no mostrar línea roja
  useEffect(() => {
    if (enRutaAPickup && routeCoords?.length) {
      setRouteCoords(null);
      lastRouteRef.current = null;
    }
  }, [enRutaAPickup]);

  // Debug log
  useEffect(() => {
    console.log("📍 Status:", status, "enRutaAPickup:", enRutaAPickup, "distPickup:", distanceToPickup, "driverLoc:", !!driverLocation);
  }, [status, enRutaAPickup, distanceToPickup, driverLocation]);

  const pickupPosition = useMemo(() => {
    const lat = Number(pendingRide?.origin_latitude ?? NaN);
    const lon = Number(pendingRide?.origin_longitude ?? NaN);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { latitude: lat, longitude: lon };
    }
    if (userLatitude && userLongitude) {
      return { latitude: userLatitude, longitude: userLongitude };
    }
    return null;
  }, [pendingRide?.origin_latitude, pendingRide?.origin_longitude, userLatitude, userLongitude]);

  useEffect(() => {
    // If we only have a fallback driver position from status API, still fit once
    if (!mapRef.current || !userLatitude || !userLongitude) return;
    if (!driverLocation) return;
    mapRef.current.fitToCoordinates(
      [driverLocation, { latitude: userLatitude, longitude: userLongitude }],
      { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true },
    );
  }, [driverLocation?.latitude, driverLocation?.longitude, userLatitude, userLongitude]);

  const prevHeadingRef = useRef<number>(0);

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
    
    // Use GPS movement-based heading if available (more realistic)
    if (prevDriverLocation && driverLocation) {
      const distMoved = getDistanceInMiles(
        prevDriverLocation.latitude,
        prevDriverLocation.longitude,
        driverLocation.latitude,
        driverLocation.longitude
      );
      // Only update heading if moved enough to avoid jitter (>25m)
      if (distMoved > 0.015) {
        const newHeading = bearingFromPoints(prevDriverLocation, driverLocation);
        // Smooth heading change: don't jump more than 45° per update
        const diff = Math.abs(newHeading - prevHeadingRef.current);
        const smoothedHeading = diff > 45 ? prevHeadingRef.current : newHeading;
        prevHeadingRef.current = smoothedHeading;
        console.log(`🔄 Heading actualizado (GPS): ${smoothedHeading.toFixed(1)}° | moved: ${(distMoved * 1609).toFixed(0)}m | from ${prevDriverLocation.latitude.toFixed(5)},${prevDriverLocation.longitude.toFixed(5)} to ${driverLocation.latitude.toFixed(5)},${driverLocation.longitude.toFixed(5)}`);
        return smoothedHeading;
      }
      // Not moved enough, keep previous GPS heading
      console.log(`⏸️ Heading sin cambio (movimiento insuficiente): ${(distMoved * 1609).toFixed(0)}m < 25m`);
      return prevHeadingRef.current;
    }
    
    // Fallback: use target-based heading (only when stationary)
    if (driverLocation && status !== "ontrip") {
      const targetLat = pickupPosition?.latitude ?? userLatitude;
      const targetLng = pickupPosition?.longitude ?? userLongitude;
      if (targetLat && targetLng) {
        const newHeading = bearingFromPoints(driverLocation, { latitude: targetLat, longitude: targetLng });
        const diff = Math.abs(newHeading - prevHeadingRef.current);
        const smoothedHeading = diff > 45 ? prevHeadingRef.current : newHeading;
        prevHeadingRef.current = smoothedHeading;
        console.log(`🎯 Heading hacia destino: ${smoothedHeading.toFixed(1)}° | target: ${targetLat?.toFixed(5)},${targetLng?.toFixed(5)}`);
        return smoothedHeading;
      }
    }

    console.log(`⚪ Heading sin cambios: ${prevHeadingRef.current.toFixed(1)}°`);
    return prevHeadingRef.current;
  }, [driverLocation, prevDriverLocation, status, destinationLatitude, destinationLongitude, userLatitude, userLongitude, pickupPosition]);

  // Car asset faces “up”; map bearing is towards target, so add 180° to avoid showing upside down in top-down view
  // PNG asset orientation correction
  const ICON_HEADING_OFFSET = 180; // rotamos 90° extra sentido horario
  const displayHeading = (driverHeading + ICON_HEADING_OFFSET) % 360;

  const driverDetails = useMemo(
    () => drivers?.find((driver) => +driver.id === selectedDriver),
    [drivers, selectedDriver],
  );

  const primaryDriver = useMemo(() => {
    if (driverDetails) return driverDetails;
    if (drivers && drivers.length > 0) return drivers[0];
    return null;
  }, [driverDetails, drivers]);

  const fallbackDistanceMiles = useMemo(() => {
    if (
      userLatitude == null ||
      userLongitude == null ||
      destinationLatitude == null ||
      destinationLongitude == null
    ) {
      return null;
    }
    return getDistanceInMiles(
      userLatitude,
      userLongitude,
      destinationLatitude,
      destinationLongitude,
    );
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

  const fallbackETA = useMemo(
    () => (fallbackDistanceMiles != null ? estimateETA(fallbackDistanceMiles) : null),
    [fallbackDistanceMiles],
  );

  const syncDestinationFromRide = (ride: any) => {
    if (
      ride &&
      ride.destination_latitude &&
      ride.destination_longitude
    ) {
      const lat = Number(ride.destination_latitude);
      const lon = Number(ride.destination_longitude);
      const addr = ride.destination_address || destinationAddress || "Destino";

      if (
        destinationLatitude !== lat ||
        destinationLongitude !== lon ||
        !destinationAddress
      ) {
        setDestinationLocation({
          latitude: lat,
          longitude: lon,
          address: addr,
        });
      }
    }
  };

  const fallbackPrice = useMemo(() => {
    if (primaryDriver?.price) return Number(primaryDriver.price);
    if (fallbackDistanceMiles == null || fallbackETA == null) return null;

    const BASE_FARE = 2.0;
    const COST_PER_MILE = 1.3;
    const COST_PER_MINUTE = 0.25;
    const SERVICE_FEE = 2.5;
    const MIN_FARE = 9.98;

    const price =
      BASE_FARE +
      fallbackDistanceMiles * COST_PER_MILE +
      fallbackETA * COST_PER_MINUTE +
      SERVICE_FEE;

    return Number(Math.max(price, MIN_FARE).toFixed(2));
  }, [primaryDriver?.price, fallbackDistanceMiles, fallbackETA]);

  const clearPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (driverPollRef.current) {
      clearInterval(driverPollRef.current);
      driverPollRef.current = null;
    }
    if (chatPollRef.current) {
      clearInterval(chatPollRef.current);
      chatPollRef.current = null;
    }
  };

  useEffect(() => {
    // If destination got cleared, restore last destination from history so Book Ride can continue
    if (
      !destinationLatitude ||
      !destinationLongitude ||
      !destinationAddress
    ) {
      const last = destinationHistory?.[0];
      if (last) {
        setDestinationLocation({
          latitude: last.latitude,
          longitude: last.longitude,
          address: last.address,
        });
      }
    }
  }, [
    destinationLatitude,
    destinationLongitude,
    destinationAddress,
    destinationHistory,
    setDestinationLocation,
  ]);

  useEffect(() => {
    return () => clearPolling();
  }, []);

  // Si hay una solicitud pendiente pero el estado quedó en idle por algún fallback,
  // forzamos a mostrar la sala de espera (barra led + cronómetro) en lugar de pedir destino.
  useEffect(() => {
    if (pendingRide && status === "idle") {
      setStatus("searching");
    }
  }, [pendingRide, status]);

  // Animate pulse effect for logo
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  // Futuristic laser animation - smooth continuous flow
  useEffect(() => {
    if (status !== "searching") return;
    searchLaser.setValue(0);
    const anim = Animated.loop(
      Animated.timing(searchLaser, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [status, searchLaser]);

  // Timer for searching elapsed time - simple approach
  useEffect(() => {
    if (status !== "searching") {
      setSearchElapsed(0);
      return;
    }

    const startTime = Date.now();

    const interval = setInterval(() => {
      setSearchElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 500); // Update every 500ms for smoother display

    return () => clearInterval(interval);
  }, [status === "searching"]);

  // Check for existing active ride or create new one (guest rides skip active check)
  useEffect(() => {
    const initRide = async () => {
      if (rideCreatedRef.current) {
        return;
      }
      if (!user && !isGuestRide) {
        return;
      }
      // No forzamos 'idle' al iniciar para evitar parpadeo si hay viaje activo
      // First, check if user has an active ride (skip if guest ride)
      if (!isGuestRide) {
        try {
          const activeRes = await fetchAPI(`/api/ride/active?clerk_id=${user.id}`);
          if (activeRes?.data) {
            rideCreatedRef.current = true;
            syncDestinationFromRide(activeRes.data);
            setPendingRide(activeRes.data);
            console.log("dYs Ride activo", {
              origin: activeRes.data.origin_address,
              destination: activeRes.data.destination_address,
              origin_lat: activeRes.data.origin_latitude,
              origin_lng: activeRes.data.origin_longitude,
              dest_lat: activeRes.data.destination_latitude,
              dest_lng: activeRes.data.destination_longitude,
              ride_id: activeRes.data.ride_id,
            });

            // Set status based on ride state
            if (activeRes.data.driver_id && activeRes.data.driver) {
              const driverData = activeRes.data.driver;
              setAssignedDriver({
                id: driverData.id,
                first_name: driverData.first_name ?? "",
                last_name: driverData.last_name ?? "",
                profile_image_url: driverData.profile_image_url ?? "",
                car_image_url: driverData.car_image_url ?? "",
                car_seats: driverData.car_seats ?? 0,
                rating: driverData.rating ?? 0,
                phone_number: driverData.phone_number ?? "",
                allow_calls: driverData.allow_calls ?? false,
                allow_messages: driverData.allow_messages ?? true,
              });

              const rideState = activeRes.data.ride_status;
              const isOnTrip = rideState === "in_progress" || rideState === "arrived"; // solo ontrip cuando driver/admin inician
              setStatus(isOnTrip ? "ontrip" : "assigned");
            } else {
              setStatus("searching");
            }
            return;
          }
        } catch (e) {
          console.warn("Error checking for active ride:", e);
        }
      }

      // No active ride found, create new one
      if (!userLatitude || !userLongitude || !destinationLatitude || !destinationLongitude) {
        setStatus("idle");
        rideCreatedRef.current = false;
        return;
      }

      setStatus("creating");
      rideCreatedRef.current = true;

      try {
        const rideTimeMinutes =
          primaryDriver?.time != null
            ? Number(primaryDriver.time)
            : fallbackETA;

        const priceDollars =
          primaryDriver?.price != null
            ? Number(primaryDriver.price)
            : fallbackPrice ?? 0;

        const amountInCents = Math.round(priceDollars * 100);

        const created = await fetchAPI("/api/ride/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            origin_address: userAddress ?? "",
            destination_address: destinationAddress ?? "",
            origin_latitude: userLatitude ?? 0,
            origin_longitude: userLongitude ?? 0,
            destination_latitude: destinationLatitude ?? 0,
            destination_longitude: destinationLongitude ?? 0,
            ride_time: rideTimeMinutes != null
              ? rideTimeMinutes.toFixed(0)
              : null,
            fare_price: amountInCents,
            payment_status: "pending",
            driver_id: null,
            user_id: null,
            clerk_id: user?.id ?? null,
            user_name:
              user?.fullName ||
              user?.emailAddresses?.[0]?.emailAddress.split("@")[0] ||
              "Guest",
            user_email: user?.emailAddresses?.[0]?.emailAddress || "",
          }),
        });

        if (created?.data) {
          setPendingRide(created.data);
          setStatus("searching");
        } else {
          setStatus("idle");
        }
      } catch (e) {
        console.error("Auto ride creation error:", e?.message || e, e);
        setStatus("idle");
      }
    };

    initRide();
  }, [
    user,
    userAddress,
    destinationAddress,
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
    driverDetails,
    isGuestRide,
  ]);

  // Poll for driver assignment// Poll for driver assignment and ride state (keeps running through on-trip)
  useEffect(() => {
    if (!pendingRide) return;

    const poll = async () => {
      try {
        const res = await fetchAPI(
          `/api/ride/status?ride_id=${pendingRide!.ride_id}`,
        );
        const ride = res?.data as Ride | null;
        syncDestinationFromRide(ride);
        if (ride?.ride_status === "cancelled" || ride?.ride_status === "completed") {
          // Ride ended/cancelled on server -> exit to home
          clearPolling();
          setAssignedDriver(null);
          setPendingRide(null);
          rideCreatedRef.current = false;
          setStatus("idle");
          router.replace("/(root)/(tabs)/home");
        } else if (ride?.driver_id && (ride.driver || ride.driver_id)) {
          const driverObj = ride.driver || {} as any;
          setAssignedDriver({
            id: driverObj.id ?? Number(ride.driver_id),
            first_name: driverObj.first_name ?? "",
            last_name: driverObj.last_name ?? "",
            profile_image_url: driverObj.profile_image_url ?? "",
            car_image_url: driverObj.car_image_url ?? "",
            car_seats: driverObj.car_seats ?? 0,
            rating: driverObj.rating ?? 0,
            phone_number: driverObj.phone_number ?? "",
            allow_calls: driverObj.allow_calls ?? false,
            allow_messages: driverObj.allow_messages ?? true, // Messages always enabled by default
          });

          // Driver location will be fetched from real GPS via polling
          // Only reset if driver changed, not on every poll
          if (assignedDriver?.id !== driverObj.id) {
            setDriverLocation(null);
            setDriverETA(null);
          }

          const rideState = ride.ride_status;
          const isOnTrip = rideState === "in_progress" || rideState === "arrived"; // ontrip solo tras start/arrived
          setStatus(isOnTrip ? "ontrip" : "assigned");
          setPendingRide(ride || pendingRide);

          // Fallback: if we still don't have a live GPS point, seed the map with last known driver_status coords
          if (!driverLocation && ride.driver_latitude && ride.driver_longitude) {
            const lat = Number(ride.driver_latitude);
            const lng = Number(ride.driver_longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
              setDriverLocation({ latitude: lat, longitude: lng });
            }
          }
        } else if (!ride?.driver_id || ride?.ride_status === "pending") {
          // Driver canceled or ride volvió a la pool -> mantenemos modo búsqueda sin botar al usuario
          setAssignedDriver(null);
          setDriverLocation(null);
          setStatus("searching");
          setPendingRide(ride || pendingRide);
        } else {
          // Unknown state -> mantenemos la espera en lugar de reiniciar el flujo
          setStatus((prev) => (prev === "ontrip" ? prev : "searching"));
          setPendingRide(ride || pendingRide);
        }
      } catch (err) {
        console.warn("Ride status poll error", err);
        // Mantén la sala de espera visible ante fallos de red esporádicos
        setStatus((prev) => (prev === "ontrip" || prev === "assigned" ? prev : "searching"));
      }
    };

    poll();
    pollRef.current = setInterval(poll, 6000);
  }, [pendingRide, userLatitude, userLongitude]);

  // Poll backend for real driver location y ETA estimada (sin pedir ruta)
  useEffect(() => {
    if (
      (status !== "assigned" && status !== "ontrip") ||
      !pendingRide?.ride_id ||
      !userLatitude ||
      !userLongitude
    ) {
      return;
    }

    const fetchDriverLocation = async () => {
      try {
        const res = await fetchAPI(`/api/ride/locations?ride_id=${pendingRide.ride_id}`);
        const points = (res?.data as any[]) || [];
        if (!points.length) {
          console.log("📡 Sin puntos de ubicación para el conductor");
          return;
        }

        const latest = points[0];
        const lat = Number(latest?.lat ?? latest?.latitude ?? 0);
        const lng = Number(latest?.lng ?? latest?.longitude ?? 0);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
          console.log("📡 Coordenadas inválidas del conductor:", { lat, lng });
          return;
        }

        const newCoord = { latitude: lat, longitude: lng };
        console.log(`🚗 UBICACIÓN DEL CONDUCTOR ACTUALIZADA: [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
        
        // Store previous for heading calculation
        if (driverLocation) {
          setPrevDriverLocation(driverLocation);
          const distMoved = getDistanceInMiles(driverLocation.latitude, driverLocation.longitude, lat, lng);
          console.log(`   ↳ Distancia movida: ${(distMoved * 1609).toFixed(0)}m desde [${driverLocation.latitude.toFixed(5)}, ${driverLocation.longitude.toFixed(5)}]`);
        }
        
        // Initialize animated coordinate on first location
        if (!driverAnimatedCoord.current) {
          driverAnimatedCoord.current = new AnimatedRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0,
            longitudeDelta: 0,
          });
          setDriverLocation(newCoord);
        } else {
          // Animate to new position (smooth movement)
          driverAnimatedCoord.current.timing({
            latitude: lat,
            longitude: lng,
            duration: 1000,
            useNativeDriver: false,
          }).start();
          setDriverLocation(newCoord);
        }
        
        setDriverHeadingFromGPS(driverHeading);

        // Determina target según fase (pickup o destino)
        const targetPickup = pickupPosition || (userLatitude && userLongitude
          ? { latitude: userLatitude, longitude: userLongitude }
          : null);
        const targetDest = destinationLatitude != null && destinationLongitude != null
          ? { latitude: Number(destinationLatitude), longitude: Number(destinationLongitude) }
          : null;
        const target = (status !== "ontrip" || !targetDest) ? targetPickup : targetDest;
        
        if (target) {
          const dist = getDistanceInMiles(lat, lng, target.latitude, target.longitude);
          const fallbackEta = estimateETA(dist);
          setDriverETA(Math.max(1, fallbackEta));
          console.log(`🚗 ETA fallback: ${fallbackEta}min para ${dist.toFixed(2)}mi`);
          
          // Intenta refinar con ruta real (~15s throttle)
          const etaKey = `${lat.toFixed(3)},${lng.toFixed(3)}|${target.latitude.toFixed(3)},${target.longitude.toFixed(3)}`;
          const now = Date.now();
          if (now - lastEtaFetchRef.current > 15000 || lastEtaKeyRef.current !== etaKey) {
            lastEtaFetchRef.current = now;
            lastEtaKeyRef.current = etaKey;
            fetchRouteEtaMinutes({ latitude: lat, longitude: lng }, target)
              .then((eta) => {
                if (eta != null && eta > 0) {
                  const roundedEta = Math.max(1, Math.round(eta));
                  setDriverETA(roundedEta);
                  console.log(`✅ ETA ruta: ${roundedEta}min (duración API: ${eta.toFixed(1)})`);
                } else {
                  console.warn("⚠️ ETA ruta sin datos, manteniendo fallback");
                }
              })
              .catch((e) => console.warn("❌ Error ETA ruta:", e));
          }
          // Fetch routed polyline between driver and target
          try {
            const driverPt = { latitude: lat, longitude: lng };
            const targetPt = { latitude: targetLat, longitude: targetLng };
            const movedEnough = (() => {
              const prev = lastRouteRef.current;
              if (!prev?.driver || !prev?.target) return true;
              const distMi = getDistanceInMiles(prev.driver.latitude, prev.driver.longitude, driverPt.latitude, driverPt.longitude);
              const targetChanged = prev.target.latitude !== targetPt.latitude || prev.target.longitude !== targetPt.longitude;
              return distMi > 0.05 || targetChanged; // ~80m
            })();

            if (movedEnough || !routeCoords?.length) {
              const poly = await fetchRoutePolyline(driverPt, targetPt);
              const simplified = poly ? simplifyPolyline(poly, 120) : null;
              setRouteCoords(ensureRouteEndsAtTarget(simplified, targetPt));
              lastRouteRef.current = { driver: driverPt, target: targetPt };
            }
          } catch {}
        }
      } catch (err) {
        // silently fail
      }
    };

    fetchDriverLocation();
    driverPollRef.current = setInterval(fetchDriverLocation, 10000);

    return () => {
      if (driverPollRef.current) {
        clearInterval(driverPollRef.current);
      }
    };
  }, [status, pendingRide?.ride_id, userLatitude, userLongitude]);

  // If we only have fallback driver coords (from status API), still fetch a routed polyline once
  useEffect(() => {
    if (!driverLocation) return;
    const targetPickup = pickupPosition || (userLatitude && userLongitude
      ? { latitude: userLatitude, longitude: userLongitude }
      : null);
    const targetDest = destinationLatitude != null && destinationLongitude != null
      ? { latitude: Number(destinationLatitude), longitude: Number(destinationLongitude) }
      : null;
    const target = (status !== "ontrip" || !targetDest) ? targetPickup : targetDest;
    
    if (!target) return;

    const driverPt = { latitude: driverLocation.latitude, longitude: driverLocation.longitude };
    const targetPt = target;
    const movedEnough = (() => {
      const prev = lastRouteRef.current;
      if (!prev?.driver || !prev?.target) return true;
      const distMi = getDistanceInMiles(prev.driver.latitude, prev.driver.longitude, driverPt.latitude, driverPt.longitude);
      const targetChanged = prev.target.latitude !== targetPt.latitude || prev.target.longitude !== targetPt.longitude;
      return distMi > 0.05 || targetChanged; // ~80m
    })();

    if (!movedEnough && routeCoords?.length) return;

    (async () => {
      try {
        const poly = await fetchRoutePolyline(driverPt, targetPt);
        const simplified = poly ? simplifyPolyline(poly, 120) : null;
        setRouteCoords(ensureRouteEndsAtTarget(simplified, targetPt));
        lastRouteRef.current = { driver: driverPt, target: targetPt };
      } catch {}
    })();
  }, [driverLocation?.latitude, driverLocation?.longitude, status, destinationLatitude, destinationLongitude, pickupPosition?.latitude, pickupPosition?.longitude, userLatitude, userLongitude]);

  // Calcula ETA siempre que hay driver location y target válido
  useEffect(() => {
    if (!driverLocation || status === "idle" || status === "creating") {
      setDriverETA(null);
      return;
    }

    const targetPickup = pickupPosition || (userLatitude && userLongitude
      ? { latitude: userLatitude, longitude: userLongitude }
      : null);
    const targetDest = destinationLatitude != null && destinationLongitude != null
      ? { latitude: Number(destinationLatitude), longitude: Number(destinationLongitude) }
      : null;
    const target = (status !== "ontrip" || !targetDest) ? targetPickup : targetDest;

    if (!target) {
      console.warn("⚠️ Sin target para ETA", { status, targetPickup, targetDest });
      return;
    }

    const dist = getDistanceInMiles(
      driverLocation.latitude,
      driverLocation.longitude,
      target.latitude,
      target.longitude
    );
    const fallbackEta = Math.max(1, estimateETA(dist));
    setDriverETA(fallbackEta);
    console.log(`📍 ETA calculada: ${fallbackEta}min (dist: ${dist.toFixed(2)}mi)`);
  }, [driverLocation?.latitude, driverLocation?.longitude, status, pickupPosition?.latitude, pickupPosition?.longitude, userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

  // Notification when driver is assigned - vibration alert
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevStatusRef.current === "searching" && status === "assigned") {
      // Driver just accepted! Notify user with vibration
      try {
        // Vibration pattern: short-pause-long-pause-short (celebration pattern)
        if (Platform.OS === "android") {
          Vibration.vibrate([0, 200, 100, 400, 100, 200]);
        } else {
          // iOS - simple vibration
          Vibration.vibrate();
        }
      } catch (e) {
        console.warn("Notification vibration error:", e);
      }
    }
    prevStatusRef.current = status;
  }, [status]);

  // Poll for unread messages when ride is assigned
  useEffect(() => {
    if ((status !== "assigned" && status !== "ontrip") || !pendingRide?.ride_id) {
      setUnreadMessages(0);
      return;
    }

    const fetchUnread = async () => {
      try {
        const res = await fetchAPI(
          `/api/messages/unread?ride_id=${pendingRide.ride_id}&reader_type=user`
        );
        if (res?.data?.unread_count !== undefined) {
          setUnreadMessages(res.data.unread_count);
        }
      } catch (err) {
        console.warn("Error fetching unread messages:", err);
      }
    };

    fetchUnread();
    chatPollRef.current = setInterval(fetchUnread, 5000);

    return () => {
      if (chatPollRef.current) {
        clearInterval(chatPollRef.current);
        chatPollRef.current = null;
      }
    };
  }, [status, pendingRide?.ride_id]);

  // Fit map to show driver->pickup/destination, evitando zooms si el usuario acaba de mover
  useEffect(() => {
    const now = Date.now();
    const recentlyPanned = now - lastPanRef.current < 6000; // Aumentado a 6s
    if (
      status === "assigned" &&
      driverLocation &&
      userLatitude &&
      userLongitude &&
      mapRef.current &&
      !recentlyPanned
    ) {
      const distance = getDistanceInMiles(
        driverLocation.latitude,
        driverLocation.longitude,
        userLatitude,
        userLongitude,
      );
      const pad = distance < 0.2 ? 40 : distance < 1 ? 60 : 80;
      const coordsToFit = [
        driverLocation,
        { latitude: userLatitude, longitude: userLongitude },
      ];
      
      console.log(`📍 Auto-center activado | driver: [${driverLocation.latitude.toFixed(5)}, ${driverLocation.longitude.toFixed(5)}] | user: [${userLatitude.toFixed(5)}, ${userLongitude.toFixed(5)}] | distance: ${distance.toFixed(2)}mi | padding: ${pad}px`);

      mapRef.current.fitToCoordinates(coordsToFit, {
        edgePadding: { top: pad, right: pad, bottom: pad, left: pad },
        animated: true,
      });
    } else if (recentlyPanned) {
      console.log(`⏸️ Auto-center bloqueado: usuario panó hace ${(now - lastPanRef.current) / 1000}s`);
    }
  }, [status, driverLocation, userLatitude, userLongitude]);

  // Al cargar, centra la cámara en la ubicación del usuario una sola vez
  useEffect(() => {
    if (hasCenteredOnUser.current) return;
    if (!mapRef.current || !userLatitude || !userLongitude) return;
    hasCenteredOnUser.current = true;
    mapRef.current.animateToRegion(
      {
        latitude: userLatitude,
        longitude: userLongitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      600,
    );
  }, [userLatitude, userLongitude]);

  // Cancel ride handler - checks for cancellation fee first
  const handleCancelRide = async () => {
    if (!pendingRide?.ride_id) {
      clearPolling();
      router.replace("/(root)/(tabs)/home");
      return;
    }

    try {
      // First, check if there's a cancellation fee
      const feeResponse = await fetchAPI(
        `/api/ride/cancel?ride_id=${pendingRide.ride_id}`,
      );
      const feeData = feeResponse?.data;

      if (!feeData) {
        // If we can't get fee info, show simple confirmation
        Alert.alert(
          "Cancelar viaje",
          "¿Estás seguro que deseas cancelar este viaje?",
          [
            { text: "No", style: "cancel" },
            {
              text: "Sí, cancelar",
              style: "destructive",
              onPress: () => confirmCancel(false),
            },
          ],
        );
        return;
      }

      // Build message based on cancellation fee
      let message = "";
      let confirmText = "Sí, cancelar";

      if (feeData.can_cancel_free) {
        message =
          "¿Estás seguro que deseas cancelar este viaje?\n\nNo se aplicará ningún cargo.";
      } else if (feeData.ride_was_started) {
        // Ride was in progress - charge for distance + base fee
        message =
          `¿Estás seguro que deseas cancelar este viaje?\n\n` +
          `Se te cobrará:\n` +
          `â€¢ Fee de cancelación: $5.00\n` +
          `â€¢ Distancia recorrida: ${feeData.miles_traveled.toFixed(1)} millas\n\n` +
          `Total: ${feeData.cancellation_fee_display}`;
        confirmText = `Cancelar (${feeData.cancellation_fee_display})`;
      } else {
        // Ride was accepted but not started - just base fee
        message =
          `¿Estás seguro que deseas cancelar este viaje?\n\n` +
          `Se aplicará un cargo de ${feeData.cancellation_fee_display} ` +
          `porque el conductor ya fue asignado.`;
        confirmText = `Cancelar (${feeData.cancellation_fee_display})`;
      }

      Alert.alert("Cancelar viaje", message, [
        { text: "No, continuar viaje", style: "cancel" },
        {
          text: confirmText,
          style: "destructive",
          onPress: () => confirmCancel(true),
        },
      ]);
    } catch (e) {
      console.warn("Error checking cancellation fee:", e);
      // Fallback to simple confirmation
      Alert.alert(
        "Cancelar viaje",
        "¿Estás seguro que deseas cancelar este viaje?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Sí, cancelar",
            style: "destructive",
            onPress: () => confirmCancel(false),
          },
        ],
      );
    }
  };

  // Handle opening chat
  const handleOpenChat = () => {
    setChatVisible(true);
    setUnreadMessages(0);
  };

  const handleCallDriver = () => {
    if (!assignedDriver?.phone_number || !assignedDriver.allow_calls) return;
    try {
      Linking.openURL(`tel:${assignedDriver.phone_number}`);
    } catch (e) {
      console.warn("call open failed", e);
    }
  };

  // Actually perform the cancellation
  const confirmCancel = async (confirmFee: boolean) => {
    try {
      if (pendingRide?.ride_id) {
        const response = await fetchAPI("/api/ride/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ride_id: pendingRide.ride_id,
            confirm_fee: confirmFee,
          }),
        });

        // If API returns requires_confirmation, user needs to confirm fee
        if (response?.requires_confirmation) {
          const feeDisplay = response.data?.cancellation_fee_display || "$5.00";
          Alert.alert(
            "Confirmar cargo",
            `Se aplicará un cargo de ${feeDisplay}. ¿Deseas continuar?`,
            [
              { text: "No", style: "cancel" },
              {
                text: `Aceptar y cancelar`,
                style: "destructive",
                onPress: () => confirmCancel(true),
              },
            ],
          );
          return;
        }

        // Show confirmation message if there was a fee
        if (response?.cancellation_fee_cents > 0) {
          Alert.alert(
            "Viaje cancelado",
            response.message ||
              `Se ha aplicado un cargo de ${response.cancellation_fee_display}`,
            [{ text: "OK" }],
          );
        }
      }
      clearPolling();
      router.replace("/(root)/(tabs)/home");
    } catch (e) {
      console.warn("Error canceling ride:", e);
      clearPolling();
      router.replace("/(root)/(tabs)/home");
    }
  };

  // Idle map refs
  const idleMapRef = useRef<MapView>(null);
  const idleRecenterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userLatRef = useRef(userLatitude);
  const userLngRef = useRef(userLongitude);
  const [idleMapReady, setIdleMapReady] = useState(false);

  // Delay idle map load for smoother app startup
  useEffect(() => {
    if (status === "idle" && !idleMapReady) {
      const timer = setTimeout(() => setIdleMapReady(true), 500);
      return () => clearTimeout(timer);
    }
  }, [status, idleMapReady]);

  // Keep refs updated
  useEffect(() => {
    userLatRef.current = userLatitude;
    userLngRef.current = userLongitude;
  }, [userLatitude, userLongitude]);

  // Cleanup idle map timeout
  useEffect(() => {
    return () => {
      if (idleRecenterTimeoutRef.current) {
        clearTimeout(idleRecenterTimeoutRef.current);
      }
    };
  }, []);

  // Idle map - centered on user with 5 mile radius view (delayed load)
  const idleMap =
    status === "idle" && idleMapReady && userLatitude && userLongitude ? (
      <View style={{ flex: 1 }}>
        <MapView
          ref={idleMapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          rotateEnabled={false}
          mapType="standard"
          showsUserLocation
          showsMyLocationButton
          initialRegion={{
            latitude: userLatitude,
            longitude: userLongitude,
            latitudeDelta: 0.145, // ~5 mile radius (10 mile span)
            longitudeDelta: 0.145,
          }}
          onPanDrag={() => {
            if (idleRecenterTimeoutRef.current) {
              clearTimeout(idleRecenterTimeoutRef.current);
            }
            idleRecenterTimeoutRef.current = setTimeout(() => {
              const lat = userLatRef.current;
              const lng = userLngRef.current;
              if (idleMapRef.current && lat && lng) {
                idleMapRef.current.animateToRegion(
                  {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.145,
                    longitudeDelta: 0.145,
                  },
                  600
                );
              }
            }, 10000);
          }}
        >
          {/* User location marker */}
          <Marker
            coordinate={{
              latitude: userLatitude,
              longitude: userLongitude,
            }}
            title="Tu ubicación"
            pinColor="blue"
            anchor={{ x: 0.5, y: 1 }}
          />
        </MapView>
      </View>
    ) : null;

  const assignedMap =
    isAssigned && userLatitude && userLongitude ? (
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          showsTraffic={status === "ontrip"}
          rotateEnabled={false}
          mapType="standard"
          initialRegion={{
            latitude: driverLocation?.latitude ?? userLatitude,
            longitude: driverLocation?.longitude ?? userLongitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPanDrag={() => {
            lastPanRef.current = Date.now();
            if (recenterTimeoutRef.current) clearTimeout(recenterTimeoutRef.current);
            recenterTimeoutRef.current = setTimeout(() => {
              lastPanRef.current = 0;
              if (mapRef.current) {
                if (driverLocation && userLatitude && userLongitude) {
                  mapRef.current.fitToCoordinates(
                    [
                      driverLocation,
                      { latitude: userLatitude, longitude: userLongitude },
                    ],
                    {
                      edgePadding: { top: 80, right: 50, bottom: 50, left: 50 },
                      animated: true,
                    },
                  );
                }
              }
            }, 4500);
          }}
        >
          {/* Sin ruta dibujada durante el viaje */}

          {/* Pickup marker - shown mientras vamos por el cliente */}
          {showPickupMarker && pickupPosition && (
            <Marker
              coordinate={pickupPosition}
              title="Recogida"
              pinColor="green"
              anchor={{ x: 0.5, y: 1 }}
            />
          )}

          {/* Destination marker - only show during ontrip */}
          {showDestinationMarker && (
            <Marker
              coordinate={{
                latitude: Number(destinationLatitude),
                longitude: Number(destinationLongitude),
              }}
              title="Destino"
              pinColor="red"
              anchor={{ x: 0.5, y: 1 }}
            />
          )}

          {/* Solo flecha del conductor */}
          {/* Ruta por carretera entre conductor y objetivo */}
          {driverLocation && routeCoords?.length ? (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#00E0FF"
              strokeWidth={8}
              geodesic
            />
          ) : driverLocation && (
            enRutaAPickup
              ? (pickupPosition || (userLatitude && userLongitude))
              : (destinationLatitude && destinationLongitude)
          ) ? (
            <Polyline
              coordinates={[
                { latitude: driverLocation.latitude, longitude: driverLocation.longitude },
                {
                  latitude: enRutaAPickup
                    ? (pickupPosition?.latitude ?? (userLatitude as number))
                    : (destinationLatitude != null ? Number(destinationLatitude) : (pickupPosition?.latitude ?? (userLatitude as number))),
                  longitude: enRutaAPickup
                    ? (pickupPosition?.longitude ?? (userLongitude as number))
                    : (destinationLongitude != null ? Number(destinationLongitude) : (pickupPosition?.longitude ?? (userLongitude as number))),
                },
              ]}
              strokeColor="#00E0FF"
              strokeWidth={8}
              geodesic
            />
          ) : null}

          {/* Driver marker - animated if available, static otherwise */}
          {driverLocation && (
            driverAnimatedCoord.current ? (
              <Marker.Animated
                coordinate={driverAnimatedCoord.current}
                title="Conductor"
                flat
                rotation={displayHeading}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={true}
                zIndex={9999}
              >
                {assignedDriver?.car_image_url ? (
                  <Image
                    source={{ uri: assignedDriver.car_image_url }}
                    style={{ width: 60, height: 60 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    source={driverCarAsset}
                    style={{ width: 60, height: 60 }}
                    resizeMode="contain"
                  />
                )}
              </Marker.Animated>
            ) : (
              <Marker
                coordinate={driverLocation}
                title="Conductor"
                flat
                rotation={displayHeading}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={true}
                zIndex={9999}
              >
                {assignedDriver?.car_image_url ? (
                  <Image
                    source={{ uri: assignedDriver.car_image_url }}
                    style={{ width: 60, height: 60 }}
                    resizeMode="contain"
                  />
                ) : (
                  <Image
                    source={driverCarAsset}
                    style={{ width: 60, height: 60 }}
                    resizeMode="contain"
                  />
                )}
              </Marker>
            )
          )}

          {/* Sin línea de ruta: solo flecha del conductor */}
        </MapView>

        {/* Overlay message while waiting for driver location */}
      </View>
    ) : isAssigned ? (
      <View className="flex-1 items-center justify-center bg-app-surface">
        <ActivityIndicator size="large" color="#8B6A3F" />
        <Text className="mt-4 text-app-muted font-JakartaMedium">
          Conectando con tu conductor...
        </Text>
      </View>
    ) : undefined;

  return (
    <StripeProviderWrapper>
      <RideLayout
        title={
          status === "assigned"
            ? "Tu conductor viene en camino"
            : status === "ontrip"
              ? "Viaje en progreso"
              : "Book Ride"
        }
        showMap
        snapPoints={rideSnapPoints}
        sheetIndex={bottomSheetIndex}
        mapContent={status === "idle" ? idleMap : assignedMap}
      >
        <View style={{ flex: 1 }}>
          {status === "searching" && (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 24,
                paddingVertical: 24,
                transform: [{ translateY: -24 }],
              }}
            >
              <View style={{
                width: "100%",
                maxWidth: 480,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 24,
                padding: 24,
                alignItems: "center",
                shadowColor: colors.gold,
                shadowOpacity: 0.15,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}>
                {/* Futuristic Laser Bar */}
                <View style={{ width: "100%", marginBottom: 24 }}>
                  <View
                    style={{
                      width: "100%",
                      height: 4,
                      backgroundColor: "transparent",
                      overflow: "hidden",
                    }}
                  >
                    <Animated.View
                      style={{
                        position: "absolute",
                        width: 120,
                        height: 4,
                        backgroundColor: colors.gold,
                        shadowColor: colors.gold,
                        shadowOpacity: 1,
                        shadowRadius: 20,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 10,
                        transform: [
                          {
                            translateX: searchLaser.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-120, width - 64],
                            }),
                          },
                        ],
                      }}
                    />
                    {/* Glow trail effect */}
                    <Animated.View
                      style={{
                        position: "absolute",
                        width: 200,
                        height: 4,
                        opacity: 0.3,
                        backgroundColor: colors.gold,
                        transform: [
                          {
                            translateX: searchLaser.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-200, width - 64 - 80],
                            }),
                          },
                        ],
                      }}
                    />
                  </View>
                </View>

                {/* Status Text */}
                <Text style={{ fontSize: 24, fontFamily: "Jakarta-Bold", color: colors.text, marginBottom: 4, textAlign: "center" }}>
                  Buscando chofer
                </Text>
                <Text style={{ fontSize: 16, color: colors.muted, marginBottom: 4 }}>
                  {formatTimer(searchElapsed)}
                </Text>
                <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", paddingHorizontal: 16, marginBottom: 24 }}>
                  Conectando con conductores cercanos
                </Text>

                {/* Cancel Button with Fee Warning */}
                <TouchableOpacity
                  onPress={handleCancelRide}
                  style={{
                    width: "100%",
                    paddingVertical: 16,
                    backgroundColor: colors.accent,
                    borderRadius: 16,
                    shadowColor: colors.gold,
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                  }}
                >
                  <Text style={{ color: "#1A1A1A", fontFamily: "Jakarta-SemiBold", textAlign: "center", fontSize: 16 }}>
                    Cancelar viaje
                  </Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 12, color: colors.muted, textAlign: "center", paddingHorizontal: 16, marginTop: 12 }}>
                  Fee de cancelación de $5.00 si ya hay conductor asignado
                </Text>
              </View>
            </View>
          )}

          {status === "creating" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 16 }}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={{ fontSize: 18, fontFamily: "Jakarta-SemiBold", color: colors.text }}>
                Creando tu solicitud de viaje...
              </Text>
            </View>
          )}

          {(status === "assigned" || status === "ontrip") && assignedDriver && (
            <View style={{ flex: 1 }}>
              {/* ETA Banner */}
              <View style={{
                backgroundColor: colors.accent,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: colors.gold,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ color: "#FFFFFF", fontSize: 14, fontFamily: "Jakarta-Medium" }}>
                      {status === "ontrip" ? "Viaje en progreso" : "Distancia restante"}
                    </Text>
                    <Text style={{ color: "#FFFFFF", fontSize: 30, fontFamily: "Jakarta-Bold" }}>
                      {status === "ontrip"
                        ? "En viaje"
                        : remainingDistance != null
                          ? `${remainingDistance.toFixed(1)} mi`
                          : "Calculando..."}
                    </Text>
                    {!driverLocation && status === "assigned" && (
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Jakarta-Medium", marginTop: 4 }}>
                        Esperando GPS del conductor
                      </Text>
                    )}
                  </View>
                  <View style={{
                    backgroundColor: colors.surface,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                    <Text style={{ color: colors.text, fontFamily: "Jakarta-Bold", fontSize: 18, textAlign: "center" }}>
                      {status === "ontrip"
                        ? "En viaje"
                        : driverETA
                          ? `${driverETA} min`
                          : driverLocation
                            ? "Calculando..."
                            : "Conectando..."}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Driver info card */}
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: colors.gold,
                shadowOpacity: 0.1,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 4,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                  <Image
                    source={{ uri: assignedDriver.profile_image_url }}
                    style={{ width: 56, height: 56, borderRadius: 28, marginRight: 12, borderWidth: 2, borderColor: colors.gold }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontFamily: "Jakarta-SemiBold", color: colors.text }}>
                      {assignedDriver.first_name} {assignedDriver.last_name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Image source={icons.star} style={{ width: 16, height: 16, marginRight: 4, tintColor: colors.gold }} />
                      <Text style={{ fontSize: 14, color: colors.muted }}>
                        {assignedDriver.rating ?? "-"} - {assignedDriver.car_seats} asientos
                      </Text>
                    </View>
                  </View>

                  {/* Chat button */}
                  <TouchableOpacity
                    onPress={handleOpenChat}
                    style={{
                      backgroundColor: colors.accent,
                      padding: 12,
                      borderRadius: 999,
                      position: "relative",
                    }}
                  >
                    <Image
                      source={icons.chat}
                      style={{ width: 20, height: 20, tintColor: "#FFFFFF" }}
                    />
                    {unreadMessages > 0 && (
                      <View style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        backgroundColor: colors.danger,
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }}>
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Pickup & Destination */}
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success, marginTop: 4, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: colors.muted }}>Recogida</Text>
                      <Text style={{ fontSize: 14, fontFamily: "Jakarta-Medium", color: colors.text }} numberOfLines={1}>
                        {userAddress}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger, marginTop: 4, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: colors.muted }}>Destino</Text>
                      <Text style={{ fontSize: 14, fontFamily: "Jakarta-Medium", color: colors.text }} numberOfLines={1}>
                        {destinationAddress}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Contact options */}
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View>
                      <Text style={{ fontSize: 12, color: colors.muted }}>Contacto</Text>
                      <Text style={{ fontSize: 14, fontFamily: "Jakarta-Medium", color: colors.text }} numberOfLines={1}>
                        {assignedDriver.phone_number || "Teléfono no disponible"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        disabled={!assignedDriver.allow_calls || !assignedDriver.phone_number}
                        onPress={handleCallDriver}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: assignedDriver.allow_calls && assignedDriver.phone_number ? colors.accent : colors.border,
                          backgroundColor: assignedDriver.allow_calls && assignedDriver.phone_number ? colors.accent : colors.bg,
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontFamily: "Jakarta-SemiBold",
                          color: assignedDriver.allow_calls && assignedDriver.phone_number ? "#FFFFFF" : colors.muted,
                        }}>
                          Llamar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleOpenChat}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          backgroundColor: colors.accent,
                          position: "relative",
                        }}
                      >
                        <Text style={{ fontSize: 14, fontFamily: "Jakarta-SemiBold", color: "#FFFFFF" }}>Mensaje</Text>
                        {unreadMessages > 0 && (
                          <View style={{
                            position: "absolute",
                            top: -4,
                            right: -4,
                            backgroundColor: colors.danger,
                            borderRadius: 10,
                            minWidth: 18,
                            height: 20,
                            paddingHorizontal: 4,
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            <Text style={{ color: "#FFFFFF", fontSize: 10, fontFamily: "Jakarta-Bold" }} numberOfLines={1}>
                              {unreadMessages > 9 ? "9+" : unreadMessages}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* Cancel button */}
              <TouchableOpacity
                onPress={handleCancelRide}
                style={{
                  backgroundColor: colors.bg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 999,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.accent, fontFamily: "Jakarta-SemiBold" }}>
                  Cancelar viaje
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {status === "idle" && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 16, paddingHorizontal: 24 }}>
              <Text style={{ fontSize: 20, fontFamily: "Jakarta-SemiBold", textAlign: "center", color: colors.text }}>
                Selecciona un destino para continuar
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}>
                Elige tu destino para calcular tiempo y costo antes de buscar chofer.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(root)/find-ride")}
                style={{
                  marginTop: 16,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  backgroundColor: colors.accent,
                  borderRadius: 999,
                  shadowColor: colors.gold,
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 6,
                }}
              >
                <Text style={{ color: "#1A1A1A", fontFamily: "Jakarta-SemiBold" }}>Elegir destino</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ paddingHorizontal: 24, paddingVertical: 12 }}
              >
                <Text style={{ color: colors.muted, fontFamily: "Jakarta-SemiBold" }}>Volver</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </RideLayout>

      {/* Chat Modal */}
      {pendingRide?.ride_id && pendingRide?.user_id && (
        <RideChat
          rideId={pendingRide.ride_id}
          userId={pendingRide.user_id}
          userType="user"
          driverName={
            assignedDriver
              ? `${assignedDriver.first_name} ${assignedDriver.last_name}`
              : "Conductor"
          }
          visible={chatVisible}
          onClose={() => setChatVisible(false)}
        />
      )}
    </StripeProviderWrapper>
  );
};

export default BookRide;
