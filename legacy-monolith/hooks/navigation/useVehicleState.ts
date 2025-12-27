/**
 * useVehicleState - Vehicle heading and movement tracking
 *
 * Responsibilities:
 * - Calculate movement bearing from position changes
 * - Smooth heading transitions (no jittery rotation)
 * - Provide stable heading for camera and marker
 * - Prioritize: movement bearing > GPS heading > previous heading
 */

import { useState, useRef, useCallback, useEffect } from "react";

export type LatLng = {
  latitude: number;
  longitude: number;
};

type UseVehicleStateOptions = {
  /** Maximum heading change per update in degrees (default: 45) */
  maxHeadingDelta?: number;
  /** Minimum movement in meters to calculate bearing (default: 0.3) */
  minMovementForBearing?: number;
};

// Calculate bearing between two points
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const toDeg = (rad: number) => rad * (180 / Math.PI);

  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Normalize heading to 0-360
function normalizeHeading(val: number | null | undefined): number | null {
  if (val === null || val === undefined || Number.isNaN(val)) return null;
  return ((val % 360) + 360) % 360;
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

// Limit turn rate for smooth transitions
function limitTurn(target: number, prev: number, maxDelta: number): number {
  let diff = target - prev;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  if (Math.abs(diff) > maxDelta) {
    return (((prev + Math.sign(diff) * maxDelta) % 360) + 360) % 360;
  }
  return target;
}

export function useVehicleState(options: UseVehicleStateOptions = {}) {
  const { maxHeadingDelta = 45, minMovementForBearing = 0.3 } = options;

  const [heading, setHeading] = useState(0);
  const prevPositionRef = useRef<LatLng | null>(null);
  const prevHeadingRef = useRef(0);

  // Update heading based on position change and GPS heading
  const updateHeading = useCallback(
    (position: LatLng, gpsHeading: number | null): number => {
      const prevPos = prevPositionRef.current;
      let chosenHeading: number | null = null;

      // 1. Calculate movement bearing if moved enough
      if (prevPos) {
        const moved = metersBetween(prevPos, position);
        if (moved >= minMovementForBearing) {
          const movementBearing = calculateBearing(
            prevPos.latitude,
            prevPos.longitude,
            position.latitude,
            position.longitude
          );
          chosenHeading = normalizeHeading(movementBearing);
        }
      }

      // 2. Fall back to GPS heading
      if (chosenHeading === null && gpsHeading !== null) {
        chosenHeading = normalizeHeading(gpsHeading);
      }

      // 3. Fall back to previous heading
      if (chosenHeading === null) {
        chosenHeading = prevHeadingRef.current;
      }

      // Smooth transition - limit turn rate
      const smoothHeading = limitTurn(chosenHeading, prevHeadingRef.current, maxHeadingDelta);

      // Update refs
      prevPositionRef.current = position;
      prevHeadingRef.current = smoothHeading;

      setHeading(smoothHeading);
      return smoothHeading;
    },
    [maxHeadingDelta, minMovementForBearing]
  );

  // Set initial heading (useful when starting navigation)
  const setInitialHeading = useCallback((h: number) => {
    const normalized = normalizeHeading(h) ?? 0;
    prevHeadingRef.current = normalized;
    setHeading(normalized);
  }, []);

  // Set initial position
  const setInitialPosition = useCallback((pos: LatLng) => {
    prevPositionRef.current = pos;
  }, []);

  // Reset state
  const reset = useCallback(() => {
    prevPositionRef.current = null;
    prevHeadingRef.current = 0;
    setHeading(0);
  }, []);

  return {
    heading,
    updateHeading,
    setInitialHeading,
    setInitialPosition,
    reset,
  };
}
