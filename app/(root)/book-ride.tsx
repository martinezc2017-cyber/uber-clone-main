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
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { router } from "expo-router";

import RideLayout from "@/components/RideLayout";
import RideChat from "@/components/RideChat";
import StripeProviderWrapper from "@/components/StripeProviderWrapper";
import { icons, images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";
import { useDriverStore, useLocationStore } from "@/store";
import type { Driver, Ride } from "@/types/type";

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

// Decode polyline (precision 5)
const decodePolyline = (encoded: string, precision: number = 5) => {
  const points: { latitude: number; longitude: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
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

    points.push({
      latitude: lat / factor,
      longitude: lng / factor,
    });
  }
  return points;
};

const BookRide = () => {
  const { user } = useUser();
  const {
    userAddress,
    destinationAddress,
    userLatitude,
    userLongitude,
    destinationLatitude,
    destinationLongitude,
  } = useLocationStore();
  const { drivers, selectedDriver } = useDriverStore();
  const [pendingRide, setPendingRide] = useState<Ride | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<DriverWithContact | null>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [driverETA, setDriverETA] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "idle" | "creating" | "searching" | "assigned" | "ontrip"
  >("idle");
  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [routeToPickup, setRouteToPickup] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPollCount = useRef<number>(0);
  const driverPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulse = useRef(new Animated.Value(0.95)).current;
  const searchLaser = useRef(new Animated.Value(0)).current;
  const rideCreatedRef = useRef(false);
  const lastPanRef = useRef<number>(0);
  const recenterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView>(null);
  const lastRouteDurationRef = useRef<number | null>(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const chatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAssigned = (status === "assigned" || status === "ontrip") && !!assignedDriver;
  const rideSnapPoints = isAssigned ? ["20%", "55%", "90%"] : ["20%", "60%", "88%"];

  const driverDetails = useMemo(
    () => drivers?.find((driver) => +driver.id === selectedDriver),
    [drivers, selectedDriver],
  );

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
    return () => clearPolling();
  }, []);

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

  // Laser animation for searching
  useEffect(() => {
    if (status !== "searching") return;
    const anim = Animated.loop(
      Animated.timing(searchLaser, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [status, searchLaser]);

  // Check for existing active ride or create new one
  useEffect(() => {
    const initRide = async () => {
      if (rideCreatedRef.current || !user) {
        return;
      }

      setStatus("idle");
      // First, check if user has an active ride
      try {
        const activeRes = await fetchAPI(`/api/ride/active?clerk_id=${user.id}`);
        if (activeRes?.data) {
          console.log("=== Found existing active ride ===", activeRes.data);
          rideCreatedRef.current = true;
          setPendingRide(activeRes.data);

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
            const isOnTrip = rideState === "in_progress" || rideState === "arrived";
            setStatus(isOnTrip ? "ontrip" : "assigned");
          } else {
            setStatus("searching");
          }
          return;
        }
      } catch (e) {
        console.warn("Error checking for active ride:", e);
      }

      // No active ride found, create new one
      if (!userLatitude || !destinationLatitude || !driverDetails) {
        console.log("Skipping ride creation - missing data:", {
          hasUserLocation: !!(userLatitude && userLongitude),
          hasDestination: !!(destinationLatitude && destinationLongitude),
          hasDriverDetails: !!driverDetails,
        });
        setStatus("idle"); // show idle UI instead of spinning forever
        rideCreatedRef.current = false;
        return;
      }

      setStatus("creating");
      console.log("=== Auto-creating ride on book-ride mount ===");
      rideCreatedRef.current = true;

      try {
        const amountInCents = Math.round(
          Number(driverDetails.price ?? 0) * 100,
        );

        console.log("Creating ride with data:", {
          origin_address: userAddress,
          destination_address: destinationAddress,
          origin_latitude: userLatitude,
          origin_longitude: userLongitude,
          destination_latitude: destinationLatitude,
          destination_longitude: destinationLongitude,
          ride_time: driverDetails.time,
          fare_price: amountInCents,
          user_email: user.emailAddresses[0].emailAddress,
          user_name: user.fullName,
        });

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
            ride_time: driverDetails.time
              ? driverDetails.time.toFixed(0)
              : null,
            fare_price: amountInCents,
            payment_status: "pending",
            driver_id: null,
            user_id: null,
            clerk_id: user.id,
            user_name:
              user.fullName ||
              user.emailAddresses?.[0]?.emailAddress.split("@")[0] ||
              "Guest",
            user_email: user.emailAddresses?.[0]?.emailAddress || "",
          }),
        });

        console.log("Ride creation response:", created);

        if (created?.data) {
          setPendingRide(created.data);
          setStatus("searching");
          console.log("Ride created successfully, now searching for driver");
        } else {
          setStatus("idle");
        }
      } catch (e: any) {
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
  ]);

  // Poll for driver assignment and ride state (keeps running through on-trip)
  useEffect(() => {
    if (!pendingRide) return;

    const poll = async () => {
      try {
        const res = await fetchAPI(
          `/api/ride/status?ride_id=${pendingRide!.ride_id}`,
        );
        const ride = res?.data as Ride | null;
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
          // Don't set fake location - wait for real data from /api/ride/locations
          setDriverLocation(null);
          setDriverETA(null);

          const rideState = ride.ride_status;
          const isOnTrip = rideState === "in_progress" || rideState === "arrived";
          setStatus(isOnTrip ? "ontrip" : "assigned");
          setPendingRide(ride || pendingRide);
          pendingPollCount.current = 0; // reset counter once assigned/ontrip
        } else if (!ride?.driver_id || ride?.ride_status === "pending") {
          // Driver canceled or ride returned to pool -> resume searching, but avoid endless loop
          pendingPollCount.current += 1;
          setAssignedDriver(null);
          setDriverLocation(null);
          setRouteToPickup([]);
          setStatus("searching");
          setPendingRide(ride || pendingRide);

          if (pendingPollCount.current >= 15) { // ~1 min at 6s interval
            clearPolling();
            setPendingRide(null);
            rideCreatedRef.current = false;
            setStatus("idle");
          }
        } else {
          // Unknown state -> reset after some time
          pendingPollCount.current += 1;
          if (pendingPollCount.current >= 20) {
            clearPolling();
            setPendingRide(null);
            rideCreatedRef.current = false;
            setStatus("idle");
          }
        }
      } catch (err) {
        console.warn("Ride status poll error", err);
        pendingPollCount.current += 1;
        if (pendingPollCount.current >= 10) {
          clearPolling();
          setPendingRide(null);
          rideCreatedRef.current = false;
          setStatus("idle");
        }
      }
    };

    poll();
    pendingPollCount.current = 0;
    pollRef.current = setInterval(poll, 6000);
  }, [pendingRide, userLatitude, userLongitude]);

  // Poll backend for real driver location and compute route (both en camino and en viaje)
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
        const last = points[points.length - 1];
        if (!last || !last.lat || !last.lng) return;

        const liveLoc = { latitude: Number(last.lat), longitude: Number(last.lng) };
        setDriverLocation(liveLoc);

        // Choose target: pickup before trip start, destination after trip start
        const targetLat = status === "ontrip" ? destinationLatitude : userLatitude;
        const targetLng = status === "ontrip" ? destinationLongitude : userLongitude;

        if (targetLat == null || targetLng == null) {
          return;
        }

        // Quick straight-line estimate while route loads
        const straightDistance = getDistanceInMiles(
          liveLoc.latitude,
          liveLoc.longitude,
          targetLat,
          targetLng,
        );
        setDriverETA(Math.max(1, estimateETA(straightDistance)));

        // Fetch driving route for blue line + precise ETA
        const origin = `${liveLoc.longitude},${liveLoc.latitude}`;
        const destination = `${targetLng},${targetLat}`;
        const routeRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=polyline`,
        );
        if (routeRes.ok) {
          const data = await routeRes.json();
          const poly = data?.routes?.[0]?.geometry;
          const duration = data?.routes?.[0]?.duration; // seconds
          if (poly) {
            const decoded = decodePolyline(poly, 5);
            setRouteToPickup(decoded);
          }
          if (duration) {
            lastRouteDurationRef.current = duration / 60;
            setDriverETA(Math.max(1, Math.ceil(duration / 60)));
          }
        }
      } catch (err) {
        console.warn("Driver location poll error", err);
      }
    };

    fetchDriverLocation();
    driverPollRef.current = setInterval(fetchDriverLocation, 5000);

    return () => {
      if (driverPollRef.current) {
        clearInterval(driverPollRef.current);
      }
    };
  }, [status, pendingRide?.ride_id, userLatitude, userLongitude]);

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

  // Fit map to show driver->pickup unless user just panned (zoom in as driver gets closer)
  useEffect(() => {
    const now = Date.now();
    const recentlyPanned = now - lastPanRef.current < 4000;
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
      const coordsToFit =
        routeToPickup.length > 1
          ? routeToPickup
          : [driverLocation, { latitude: userLatitude, longitude: userLongitude }];

      mapRef.current.fitToCoordinates(coordsToFit, {
        edgePadding: { top: pad, right: pad, bottom: pad, left: pad },
        animated: true,
      });
    }
  }, [status, driverLocation, userLatitude, userLongitude, routeToPickup]);

  // Fetch full route (pickup -> destination) and fit map
  useEffect(() => {
    const hasCoords =
      userLatitude &&
      userLongitude &&
      destinationLatitude &&
      destinationLongitude;
    if (!hasCoords) return;

    const fetchRoute = async () => {
      try {
        const origin = `${userLongitude},${userLatitude}`;
        const destination = `${destinationLongitude},${destinationLatitude}`;
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin};${destination}?overview=full&geometries=polyline`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const poly = data?.routes?.[0]?.geometry;
        if (poly) {
          const decoded = decodePolyline(poly, 5);
          setRouteCoords(decoded);
          if (mapRef.current && decoded.length) {
            mapRef.current.fitToCoordinates(decoded, {
              edgePadding: { top: 80, right: 50, bottom: 80, left: 50 },
              animated: true,
            });
          }
        }
      } catch (e) {
        console.warn("Error fetching route polyline", e);
      }
    };

    fetchRoute();
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

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

  const assignedMap =
    isAssigned && driverLocation && userLatitude && userLongitude ? (
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        showsTraffic={true}
        rotateEnabled={false}
        mapType="standard"
        customMapStyle={darkRoadMapStyle}
        initialRegion={
          routeCoords.length > 0
            ? {
                latitude: routeCoords[0].latitude,
                longitude: routeCoords[0].longitude,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }
            : {
                latitude: (driverLocation.latitude + userLatitude) / 2,
                longitude: (driverLocation.longitude + userLongitude) / 2,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
        }
        onPanDrag={() => {
          lastPanRef.current = Date.now();
          if (recenterTimeoutRef.current) clearTimeout(recenterTimeoutRef.current);
          recenterTimeoutRef.current = setTimeout(() => {
            lastPanRef.current = 0;
            if (mapRef.current) {
              if (routeCoords.length) {
                mapRef.current.fitToCoordinates(routeCoords, {
                  edgePadding: { top: 80, right: 50, bottom: 80, left: 50 },
                  animated: true,
                });
              } else if (driverLocation && userLatitude && userLongitude) {
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
        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeColor="#2563eb" strokeWidth={4} />
        )}

        <Marker coordinate={driverLocation} title="Tu conductor">
          <View className="bg-blue-500 p-2 rounded-full">
            <Image source={icons.car} className="w-6 h-6" tintColor="#fff" />
          </View>
        </Marker>

        <Marker
          coordinate={{
            latitude: userLatitude,
            longitude: userLongitude,
          }}
          title="Tu ubicaci¢n"
        >
          <View className="bg-green-500 p-2 rounded-full">
            <Image source={icons.person} className="w-5 h-5" tintColor="#fff" />
          </View>
        </Marker>

        {destinationLatitude && destinationLongitude && (
          <Marker
            coordinate={{
              latitude: destinationLatitude,
              longitude: destinationLongitude,
            }}
            title="Destino"
          >
            <View className="bg-red-500 p-2 rounded-full">
              <Image source={icons.flag} className="w-5 h-5" tintColor="#fff" />
            </View>
          </Marker>
        )}

        {routeToPickup.length > 1 ? (
          <Polyline coordinates={routeToPickup} strokeColor="#2563eb" strokeWidth={4} />
        ) : (
          <Polyline
            coordinates={[
              driverLocation,
              { latitude: userLatitude, longitude: userLongitude },
            ]}
            strokeColor="#3b82f6"
            strokeWidth={3}
            lineDashPattern={[10, 5]}
          />
        )}
      </MapView>
    ) : isAssigned ? (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0286ff" />
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
        mapContent={assignedMap}
      >
        <View className="flex-1">
          {status === "searching" && (
            <View className="flex-1 items-center justify-center py-8 gap-4">
              <Animated.View
                style={{
                  width: 220,
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: "transparent",
                  overflow: "hidden",
                  transform: [
                    {
                      translateX: searchLaser.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-40, 40],
                      }),
                    },
                  ],
                }}
              >
                <Animated.View
                  style={{
                    width: 220,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: "#22d3ee",
                    shadowColor: "#22d3ee",
                    shadowOpacity: 0.5,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 0 },
                  }}
                />
              </Animated.View>

              <Text className="text-lg font-JakartaSemiBold mt-2 text-center px-6">
                Waiting for a driver to accept your ride…
              </Text>
              <Text className="text-sm text-center text-gray-600 px-6">
                Connecting you with a nearby driver. We’ll notify you once it’s accepted.
              </Text>

              {/* Cancel button while searching */}
              <TouchableOpacity
                onPress={handleCancelRide}
                className="mt-6 px-6 py-3 bg-red-100 rounded-full"
              >
                <Text className="text-red-600 font-JakartaSemiBold">
                  Cancelar solicitud
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {status === "creating" && (
            <View className="flex-1 items-center justify-center py-8 gap-4">
              <ActivityIndicator size="large" color="#0286ff" />
              <Text className="text-lg font-JakartaSemiBold">
                Creando tu solicitud de viaje...
              </Text>
            </View>
          )}

          {(status === "assigned" || status === "ontrip") && assignedDriver && (
            <View className="flex-1">
              {/* ETA Banner */}
              <View className="bg-blue-500 rounded-2xl p-4 mb-4">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-white text-sm font-JakartaMedium">
                      {status === "ontrip" ? "Viaje en progreso" : "Tiempo estimado de llegada"}
                    </Text>
                    <Text className="text-white text-3xl font-JakartaBold">
                      {status === "ontrip" ? "En viaje" : `${driverETA ?? "--"} min`}
                    </Text>
                  </View>
                  <View className="bg-white/20 px-4 py-2 rounded-full">
                    <Text className="text-white font-JakartaSemiBold">
                      {status === "ontrip" ? "En viaje" : "En camino"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Driver info card */}
              <View className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                <View className="flex-row items-center mb-3">
                  <Image
                    source={{ uri: assignedDriver.profile_image_url }}
                    className="w-14 h-14 rounded-full mr-3"
                  />
                  <View className="flex-1">
                    <Text className="text-lg font-JakartaSemiBold">
                      {assignedDriver.first_name} {assignedDriver.last_name}
                    </Text>
                    <View className="flex-row items-center">
                      <Image source={icons.star} className="w-4 h-4 mr-1" />
                      <Text className="text-sm text-gray-600">
                        {assignedDriver.rating ?? "-"} -{" "}
                        {assignedDriver.car_seats} asientos
                      </Text>
                    </View>
                  </View>

                  {/* Chat button */}
                  <TouchableOpacity
                    onPress={handleOpenChat}
                    className="bg-blue-500 p-3 rounded-full relative"
                  >
                    <Image
                      source={icons.chat}
                      className="w-5 h-5"
                      tintColor="#fff"
                    />
                    {unreadMessages > 0 && (
                      <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                        <Text className="text-white text-xs font-bold">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Pickup & Destination */}
                <View className="border-t border-gray-100 pt-3">
                  <View className="flex-row items-start mb-2">
                    <View className="w-3 h-3 rounded-full bg-green-500 mt-1 mr-3" />
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500">Recogida</Text>
                      <Text
                        className="text-sm font-JakartaMedium"
                        numberOfLines={1}
                      >
                        {userAddress}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-start">
                    <View className="w-3 h-3 rounded-full bg-red-500 mt-1 mr-3" />
                    <View className="flex-1">
                      <Text className="text-xs text-gray-500">Destino</Text>
                      <Text
                        className="text-sm font-JakartaMedium"
                        numberOfLines={1}
                      >
                        {destinationAddress}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Contact options */}
                <View className="border-t border-gray-100 pt-3 mt-3">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-xs text-gray-500">Contacto</Text>
                      <Text className="text-sm font-JakartaMedium" numberOfLines={1}>
                        {assignedDriver.phone_number || "Teléfono no disponible"}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        disabled={!assignedDriver.allow_calls || !assignedDriver.phone_number}
                        onPress={handleCallDriver}
                        className={`px-3 py-2 rounded-full ${
                          assignedDriver.allow_calls && assignedDriver.phone_number
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        }`}
                      >
                        <Text
                          className={`text-sm font-JakartaSemiBold ${
                            assignedDriver.allow_calls && assignedDriver.phone_number
                              ? "text-blue-700"
                              : "text-gray-400"
                          }`}
                        >
                          Llamar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleOpenChat}
                        className="px-3 py-2 rounded-full bg-green-100 relative"
                      >
                        <Text className="text-sm font-JakartaSemiBold text-green-700">Mensaje</Text>
                        {unreadMessages > 0 && (
                          <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-5 px-1 items-center justify-center">
                            <Text className="text-white text-[10px] font-JakartaBold" numberOfLines={1}>
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
                className="bg-red-50 border border-red-200 rounded-full py-3 px-6 items-center"
              >
                <Text className="text-red-600 font-JakartaSemiBold">
                  Cancelar viaje
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {status === "idle" && (
            <View className="flex-1 items-center justify-center py-8 gap-4 px-6">
              <Text className="text-xl font-JakartaSemiBold text-center">
                Selecciona un destino para continuar
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                Elige tu destino para calcular tiempo y costo antes de buscar chofer.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(root)/find-ride")}
                className="mt-4 px-6 py-3 bg-blue-600 rounded-full"
              >
                <Text className="text-white font-JakartaSemiBold">Elegir destino</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                className="px-6 py-3"
              >
                <Text className="text-gray-500 font-JakartaSemiBold">Volver</Text>
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
