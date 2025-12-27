/**
 * useLocation - GPS tracking hook optimized for navigation
 *
 * Responsibilities:
 * - Request location permissions
 * - Watch position with high accuracy
 * - Provide current position, speed, and GPS heading
 * - Filter out emulator default locations
 * - Throttle updates for performance
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Location from "expo-location";

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type LocationState = {
  position: LatLng | null;
  speed: number | null; // mph
  gpsHeading: number | null; // degrees 0-360
  accuracy: number | null; // meters
  isReady: boolean;
  error: string | null;
};

type UseLocationOptions = {
  /** Minimum time between updates in ms (default: 100) */
  timeInterval?: number;
  /** Minimum distance change in meters (default: 0.5) */
  distanceInterval?: number;
  /** Skip emulator default location (default: true) */
  skipEmulatorDefault?: boolean;
  /** Fallback position if emulator default detected */
  fallbackPosition?: LatLng;
};

const EMULATOR_DEFAULT = { latitude: 37.4219983, longitude: -122.084 };
const DEFAULT_FALLBACK = { latitude: 33.4152, longitude: -111.8315 }; // Arizona

export function useLocation(options: UseLocationOptions = {}): LocationState {
  const {
    timeInterval = 100,
    distanceInterval = 0.5,
    skipEmulatorDefault = true,
    fallbackPosition = DEFAULT_FALLBACK,
  } = options;

  const [state, setState] = useState<LocationState>({
    position: null,
    speed: null,
    gpsHeading: null,
    accuracy: null,
    isReady: false,
    error: null,
  });

  const lastPositionRef = useRef<{ pos: LatLng; ts: number } | null>(null);
  const mountedRef = useRef(true);

  // Convert m/s to mph
  const mpsToMph = (mps: number | null | undefined): number | null => {
    if (mps === null || mps === undefined || Number.isNaN(mps)) return null;
    return Math.max(0, mps * 2.23694);
  };

  // Calculate speed from distance/time if GPS speed unavailable
  const calculateSpeed = useCallback(
    (prev: { pos: LatLng; ts: number }, next: LatLng, now: number): number | null => {
      const R = 3959; // Earth radius in miles
      const toRad = (deg: number) => deg * (Math.PI / 180);
      const dLat = toRad(next.latitude - prev.pos.latitude);
      const dLon = toRad(next.longitude - prev.pos.longitude);
      const lat1 = toRad(prev.pos.latitude);
      const lat2 = toRad(next.latitude);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      const miles = R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
      const hours = (now - prev.ts) / 3600000;
      return hours > 0 ? miles / hours : null;
    },
    []
  );

  // Check if position is emulator default
  const isEmulatorDefault = useCallback(
    (lat: number, lon: number): boolean => {
      return lat === EMULATOR_DEFAULT.latitude && lon === EMULATOR_DEFAULT.longitude;
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    let subscription: Location.LocationSubscription | null = null;
    let appStateSubscription: { remove: () => void } | null = null;
    let isActive = true;

    const startWatching = async () => {
      if (subscription) return; // Already watching

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval,
          distanceInterval,
        },
        (location) => {
          if (!mountedRef.current || !isActive) return;

          const { latitude, longitude, speed, heading, accuracy } = location.coords;

          // Skip emulator default
          if (skipEmulatorDefault && isEmulatorDefault(latitude, longitude)) {
            return;
          }

          const now = Date.now();
          const nextPos = { latitude, longitude };
          const prev = lastPositionRef.current;

          // Calculate speed (prefer GPS, fallback to calculated)
          let speedMph = mpsToMph(speed);
          if ((speedMph === null || Number.isNaN(speedMph)) && prev) {
            speedMph = calculateSpeed(prev, nextPos, now);
          }

          lastPositionRef.current = { pos: nextPos, ts: now };

          setState({
            position: nextPos,
            speed: speedMph !== null ? Math.round(speedMph) : null,
            gpsHeading: heading ?? null,
            accuracy: accuracy ?? null,
            isReady: true,
            error: null,
          });
        }
      );
    };

    const stopWatching = () => {
      if (subscription) {
        subscription.remove();
        subscription = null;
      }
    };

    const handleAppStateChange = (nextState: AppStateStatus) => {
      isActive = nextState === "active";

      if (nextState === "active") {
        // App came to foreground - resume GPS
        startWatching();
      } else {
        // App went to background - pause GPS (saves battery!)
        stopWatching();
      }
    };

    const setup = async () => {
      try {
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (mountedRef.current) {
            setState((s) => ({ ...s, error: "Location permission denied", isReady: true }));
          }
          return;
        }

        // Get initial position
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!mountedRef.current) return;

        // Handle emulator default
        let startPos: LatLng;
        if (skipEmulatorDefault && isEmulatorDefault(initial.coords.latitude, initial.coords.longitude)) {
          startPos = fallbackPosition;
        } else {
          startPos = {
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          };
        }

        lastPositionRef.current = { pos: startPos, ts: Date.now() };

        setState({
          position: startPos,
          speed: mpsToMph(initial.coords.speed),
          gpsHeading: initial.coords.heading ?? null,
          accuracy: initial.coords.accuracy ?? null,
          isReady: true,
          error: null,
        });

        // Start watching position
        await startWatching();

        // Listen for app state changes (pause GPS when backgrounded)
        appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
      } catch (e) {
        if (mountedRef.current) {
          setState((s) => ({
            ...s,
            error: e instanceof Error ? e.message : "Location error",
            isReady: true,
          }));
        }
      }
    };

    setup();

    return () => {
      mountedRef.current = false;
      stopWatching();
      appStateSubscription?.remove();
    };
  }, [timeInterval, distanceInterval, skipEmulatorDefault, fallbackPosition, isEmulatorDefault, calculateSpeed]);

  return state;
}
