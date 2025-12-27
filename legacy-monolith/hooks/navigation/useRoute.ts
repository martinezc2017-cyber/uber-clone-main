/**
 * useRoute - Route management for navigation
 *
 * Responsibilities:
 * - Fetch route from OSRM
 * - Decode polyline
 * - Simplify route for rendering performance
 * - Calculate closest point on route (snapping)
 * - Detect off-route condition
 * - Parse navigation steps
 * - Track current step
 */

import { useState, useCallback, useRef, useMemo } from "react";

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type NavigationStep = {
  instruction: string;
  name: string; // Street name
  distance: number; // meters
  maneuver: string;
  maneuverLocation: LatLng;
};

export type RouteState = {
  coordinates: LatLng[];
  steps: NavigationStep[];
  currentStepIndex: number;
  distanceMeters: number;
  durationSeconds: number;
  isOffRoute: boolean;
  isFetching: boolean;
  error: string | null;
};

type UseRouteOptions = {
  /** Minimum distance between points in simplified route (default: 8m) */
  simplifyDistance?: number;
  /** Distance threshold to consider off-route (default: 60m) */
  offRouteThreshold?: number;
  /** Minimum time between route fetches in ms (default: 3000) */
  fetchThrottle?: number;
  /** Minimum movement to trigger re-fetch in meters (default: 32) */
  fetchMovementThreshold?: number;
};

// Decode OSRM polyline (precision 5)
function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b,
      shift = 0,
      result = 0;
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
}

// Calculate distance between two points in meters
function metersBetween(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Simplify polyline by removing points too close together
function simplifyRoute(points: LatLng[], minDistanceMeters: number): LatLng[] {
  if (points.length <= 2) return points;

  const result: LatLng[] = [points[0]];
  let lastKept = points[0];

  for (let i = 1; i < points.length - 1; i++) {
    if (metersBetween(lastKept, points[i]) >= minDistanceMeters) {
      result.push(points[i]);
      lastKept = points[i];
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

// Find closest point index on route
function findClosestIndex(route: LatLng[], position: LatLng): number {
  if (!route.length) return 0;

  let minDist = Infinity;
  let closestIdx = 0;

  for (let i = 0; i < route.length; i++) {
    const dx = route[i].latitude - position.latitude;
    const dy = route[i].longitude - position.longitude;
    const dist = dx * dx + dy * dy; // Squared distance for performance
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  }

  return closestIdx;
}

export function useRoute(options: UseRouteOptions = {}) {
  const {
    simplifyDistance = 8,
    offRouteThreshold = 60,
    fetchThrottle = 3000,
    fetchMovementThreshold = 32,
  } = options;

  const [state, setState] = useState<RouteState>({
    coordinates: [],
    steps: [],
    currentStepIndex: 0,
    distanceMeters: 0,
    durationSeconds: 0,
    isOffRoute: false,
    isFetching: false,
    error: null,
  });

  const lastFetchRef = useRef<{ pos: LatLng; ts: number } | null>(null);
  const currentStepRef = useRef(0);

  // Fetch route from OSRM
  const fetchRoute = useCallback(
    async (origin: LatLng, destination: LatLng): Promise<boolean> => {
      const now = Date.now();
      const last = lastFetchRef.current;

      // Throttle fetches
      if (last) {
        const dt = now - last.ts;
        const dist = metersBetween(last.pos, origin);
        if (dt < fetchThrottle && dist < fetchMovementThreshold) {
          return false;
        }
      }

      lastFetchRef.current = { pos: origin, ts: now };
      setState((s) => ({ ...s, isFetching: true, error: null }));

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=polyline&steps=true`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`OSRM error: ${res.status}`);
        }

        const data = await res.json();
        const route = data?.routes?.[0];

        if (!route?.geometry) {
          throw new Error("No route found");
        }

        // Decode and simplify
        const decoded = decodePolyline(route.geometry);
        const simplified = simplifyRoute(decoded, simplifyDistance);

        // Parse steps
        const legSteps = route.legs?.[0]?.steps || [];
        const steps: NavigationStep[] = legSteps.map((s: any) => ({
          instruction: s.maneuver?.instruction || "",
          name: s.name || "",
          distance: s.distance || 0,
          maneuver: s.maneuver?.type || "",
          maneuverLocation: {
            latitude: s.maneuver?.location?.[1] || 0,
            longitude: s.maneuver?.location?.[0] || 0,
          },
        }));

        // Find starting step index
        const firstNonDepart = Math.max(
          0,
          steps.findIndex((s) => s.maneuver !== "depart")
        );

        const nearestStep = steps.reduce(
          (best, step, idx) => {
            if (!step.maneuverLocation.latitude) return best;
            const dist = metersBetween(origin, step.maneuverLocation);
            return dist < best.dist ? { idx, dist } : best;
          },
          { idx: firstNonDepart, dist: Infinity }
        ).idx;

        const startIdx = Math.max(
          currentStepRef.current,
          Math.max(firstNonDepart, nearestStep - 1)
        );

        currentStepRef.current = startIdx;

        setState({
          coordinates: simplified,
          steps,
          currentStepIndex: startIdx,
          distanceMeters: route.distance || 0,
          durationSeconds: route.duration || 0,
          isOffRoute: false,
          isFetching: false,
          error: null,
        });

        return true;
      } catch (e) {
        setState((s) => ({
          ...s,
          isFetching: false,
          error: e instanceof Error ? e.message : "Route fetch error",
        }));
        return false;
      }
    },
    [simplifyDistance, fetchThrottle, fetchMovementThreshold]
  );

  // Check if position is off-route
  const checkOffRoute = useCallback(
    (position: LatLng): boolean => {
      if (!state.coordinates.length) return true;

      const closestIdx = findClosestIndex(state.coordinates, position);
      const dist = metersBetween(state.coordinates[closestIdx], position);
      const isOff = dist > offRouteThreshold;

      if (isOff !== state.isOffRoute) {
        setState((s) => ({ ...s, isOffRoute: isOff }));
      }

      return isOff;
    },
    [state.coordinates, state.isOffRoute, offRouteThreshold]
  );

  // Advance to next step if close enough
  const advanceStep = useCallback(
    (position: LatLng, heading: number): void => {
      const { steps, currentStepIndex } = state;
      if (!steps.length || currentStepIndex >= steps.length - 1) return;

      const currentStep = steps[currentStepIndex];
      const nextStep = steps[currentStepIndex + 1];

      if (!currentStep?.maneuverLocation) return;

      const distToCurrent = metersBetween(position, currentStep.maneuverLocation);
      const distToNext = nextStep?.maneuverLocation
        ? metersBetween(position, nextStep.maneuverLocation)
        : Infinity;

      // Advance if very close to current step or closer to next step
      const shouldAdvance =
        distToCurrent < 12 || (distToNext !== Infinity && distToNext + 12 < distToCurrent);

      if (shouldAdvance) {
        const newIdx = Math.min(currentStepIndex + 1, steps.length - 1);
        currentStepRef.current = newIdx;
        setState((s) => ({ ...s, currentStepIndex: newIdx }));
      }
    },
    [state.steps, state.currentStepIndex]
  );

  // Get route segments for rendering (passed vs upcoming)
  const getRouteSegments = useCallback(
    (position: LatLng | null) => {
      const route = state.coordinates;
      if (!route.length || !position) {
        return { passed: [], upcoming: route };
      }

      const closestIdx = findClosestIndex(route, position);
      return {
        passed: route.slice(0, Math.min(closestIdx + 1, route.length)),
        upcoming: route.slice(closestIdx),
      };
    },
    [state.coordinates]
  );

  // Get current step info
  const currentStep = useMemo(() => {
    return state.steps[state.currentStepIndex] || null;
  }, [state.steps, state.currentStepIndex]);

  // Get formatted ETA
  const eta = useMemo(() => {
    const minutes = Math.max(1, Math.round(state.durationSeconds / 60));
    return `${minutes} min`;
  }, [state.durationSeconds]);

  // Get formatted distance
  const distance = useMemo(() => {
    const miles = (state.distanceMeters / 1609.34).toFixed(1);
    return `${miles} mi`;
  }, [state.distanceMeters]);

  // Clear route
  const clearRoute = useCallback(() => {
    lastFetchRef.current = null;
    currentStepRef.current = 0;
    setState({
      coordinates: [],
      steps: [],
      currentStepIndex: 0,
      distanceMeters: 0,
      durationSeconds: 0,
      isOffRoute: false,
      isFetching: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    currentStep,
    eta,
    distance,
    fetchRoute,
    checkOffRoute,
    advanceStep,
    getRouteSegments,
    clearRoute,
  };
}
