/**
 * Navigation hooks - Clean separation of concerns
 *
 * useLocation - GPS tracking
 * useNavigationCamera - Smooth camera follow
 * useRoute - Route fetching and snapping
 * useVehicleState - Heading and movement
 */

export { useLocation } from "./useLocation";
export type { LatLng, LocationState } from "./useLocation";

export { useNavigationCamera } from "./useNavigationCamera";
export type { CameraConfig } from "./useNavigationCamera";

export { useRoute } from "./useRoute";
export type { RouteState, NavigationStep } from "./useRoute";

export { useVehicleState } from "./useVehicleState";
