/**
 * useNavigationCamera - Smooth camera follow for navigation
 *
 * Responsibilities:
 * - Calculate look-ahead point (vehicle at bottom of screen)
 * - Smooth heading interpolation
 * - Throttle camera updates for performance
 * - Provide camera config for MapView.animateCamera()
 */

import { useRef, useCallback, useEffect } from "react";
import type { Camera } from "react-native-maps";

// requestAnimationFrame for smooth 60fps updates (like video games)
const raf = typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : (cb: () => void) => setTimeout(cb, 16);

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type CameraConfig = {
  center: LatLng;
  pitch: number;
  heading: number;
  zoom: number;
};

type UseNavigationCameraOptions = {
  /** Distance ahead to look in km (default: 0.00055 ~55m) */
  lookAheadKm?: number;
  /** Camera pitch angle (default: 65) */
  pitch?: number;
  /** Zoom level (default: 17.5) */
  zoom?: number;
  /** Minimum ms between camera updates (default: 50) */
  updateInterval?: number;
  /** Minimum movement in meters to trigger update (default: 0.2) */
  minMovement?: number;
  /** Minimum heading change in degrees to trigger update (default: 0.5) */
  minHeadingChange?: number;
  /** Camera animation duration in ms (default: 30) */
  animationDuration?: number;
};

type CameraState = {
  position: LatLng;
  heading: number;
  timestamp: number;
};

export function useNavigationCamera(options: UseNavigationCameraOptions = {}) {
  const {
    lookAheadKm = 0.00055,
    pitch = 65,
    zoom = 17.5,
    updateInterval = 50,
    minMovement = 0.2,
    minHeadingChange = 0.5,
    animationDuration = 30,
  } = options;

  const lastCameraRef = useRef<CameraState | null>(null);

  // Calculate look-ahead point (puts vehicle at bottom of screen)
  const calculateLookAhead = useCallback(
    (lat: number, lon: number, bearing: number): LatLng => {
      const R = 6371; // Earth radius in km
      const d = lookAheadKm;
      const toRad = (deg: number) => deg * (Math.PI / 180);
      const toDeg = (rad: number) => rad * (180 / Math.PI);

      const lat1 = toRad(lat);
      const lon1 = toRad(lon);
      const brng = toRad(bearing);

      const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(d / R) +
          Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng)
      );

      const lon2 =
        lon1 +
        Math.atan2(
          Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
          Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
        );

      return {
        latitude: toDeg(lat2),
        longitude: toDeg(lon2),
      };
    },
    [lookAheadKm]
  );

  // Calculate distance between two points in meters
  const metersBetween = useCallback((a: LatLng, b: LatLng): number => {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }, []);

  // Calculate heading difference (0-180)
  const headingDelta = useCallback((a: number, b: number): number => {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
  }, []);

  // Check if camera should update
  const shouldUpdateCamera = useCallback(
    (position: LatLng, heading: number): boolean => {
      const now = Date.now();
      const last = lastCameraRef.current;

      if (!last) return true;

      // Check time interval
      if (now - last.timestamp < updateInterval) return false;

      // Check movement
      const distance = metersBetween(last.position, position);
      const headingChange = headingDelta(last.heading, heading);

      return distance > minMovement || headingChange > minHeadingChange;
    },
    [updateInterval, minMovement, minHeadingChange, metersBetween, headingDelta]
  );

  // Get camera config for current position/heading
  const getCameraConfig = useCallback(
    (position: LatLng, heading: number): CameraConfig | null => {
      if (!shouldUpdateCamera(position, heading)) {
        return null;
      }

      const lookAhead = calculateLookAhead(position.latitude, position.longitude, heading);

      lastCameraRef.current = {
        position,
        heading,
        timestamp: Date.now(),
      };

      return {
        center: lookAhead,
        pitch,
        heading,
        zoom,
      };
    },
    [shouldUpdateCamera, calculateLookAhead, pitch, zoom]
  );

  // Pending animation ref for RAF batching
  const pendingAnimationRef = useRef<{
    mapRef: { animateCamera: (camera: Camera, options?: { duration?: number }) => void };
    config: CameraConfig;
  } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Execute animation on next frame (syncs with display refresh = 60fps)
  const executeAnimation = useCallback(() => {
    if (pendingAnimationRef.current) {
      const { mapRef, config } = pendingAnimationRef.current;
      try {
        mapRef.animateCamera(config, { duration: animationDuration });
      } catch (e) {
        // Silently ignore camera errors
      }
      pendingAnimationRef.current = null;
    }
    rafIdRef.current = null;
  }, [animationDuration]);

  // Animate camera helper - uses RAF for smooth 60fps
  const animateCamera = useCallback(
    (
      mapRef: { animateCamera: (camera: Camera, options?: { duration?: number }) => void } | null,
      position: LatLng,
      heading: number
    ): boolean => {
      if (!mapRef) return false;

      const config = getCameraConfig(position, heading);
      if (!config) return false;

      // Queue animation for next frame (batches multiple updates into one)
      pendingAnimationRef.current = { mapRef, config };

      // Schedule RAF if not already scheduled
      if (rafIdRef.current === null) {
        rafIdRef.current = raf(executeAnimation) as unknown as number;
      }

      return true;
    },
    [getCameraConfig, executeAnimation]
  );

  // Reset camera state (useful when switching destinations)
  const resetCamera = useCallback(() => {
    lastCameraRef.current = null;
  }, []);

  return {
    getCameraConfig,
    animateCamera,
    resetCamera,
    calculateLookAhead,
  };
}
