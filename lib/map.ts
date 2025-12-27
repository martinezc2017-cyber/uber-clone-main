import { Driver, MarkerData } from "@/types/type";

const openRouteApiKey = process.env.EXPO_PUBLIC_OPENROUTE_API_KEY;

export const generateMarkersFromData = ({
                                            data,
                                            userLatitude,
                                            userLongitude,
                                        }: {
    data: Driver[];
    userLatitude: number;
    userLongitude: number;
}): MarkerData[] => {
    const deg2rad = Math.PI / 180;
    const metersToLat = (m: number) => m / 111_000;
    const metersToLng = (m: number, lat: number) => m / (111_000 * Math.cos(lat * deg2rad || 1));
    const goldenAngle = 137.5;

    return data.map((driver, idx) => {
        const hasCoords =
            driver.latitude != null &&
            driver.longitude != null &&
            !Number.isNaN(Number(driver.latitude)) &&
            !Number.isNaN(Number(driver.longitude));

        const id = driver.id ?? driver.driver_id ?? Math.round(Math.random() * 1_000_000);
        const baseLat = hasCoords ? Number(driver.latitude) : userLatitude;
        const baseLng = hasCoords ? Number(driver.longitude) : userLongitude;

        let latitude = baseLat;
        let longitude = baseLng;
        let dynamic = false;

        // Si no hay coordenadas reales, dispersamos en un anillo alrededor del usuario con un patrón de ángulo dorado
        if (!hasCoords && userLatitude && userLongitude) {
          dynamic = true;
          const angle = ((idx + 1) * goldenAngle) % 360;
          const radiusMeters = 300 + (idx % 9) * 120 + Math.random() * 80; // 300m-1400m
          const latOffset = metersToLat(radiusMeters * Math.cos(angle * deg2rad));
          const lngOffset = metersToLng(radiusMeters * Math.sin(angle * deg2rad), baseLat);
          latitude = baseLat + latOffset;
          longitude = baseLng + lngOffset;
        }

        return {
            id,
            latitude,
            longitude,
            dynamic,
            title: `${driver.first_name} ${driver.last_name}`,
            ...driver,
        };
    });
};

export const calculateRegion = ({
                                    userLatitude,
                                    userLongitude,
                                    destinationLatitude,
                                    destinationLongitude,
                                }: {
    userLatitude: number | null;
    userLongitude: number | null;
    destinationLatitude?: number | null;
    destinationLongitude?: number | null;
}) => {
    if (!userLatitude || !userLongitude) {
        return {
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    }

    if (!destinationLatitude || !destinationLongitude) {
        return {
            latitude: userLatitude,
            longitude: userLongitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        };
    }

    const minLat = Math.min(userLatitude, destinationLatitude);
    const maxLat = Math.max(userLatitude, destinationLatitude);
    const minLng = Math.min(userLongitude, destinationLongitude);
    const maxLng = Math.max(userLongitude, destinationLongitude);

    const latitudeDelta = Math.max((maxLat - minLat) * 2.5, 0.08); // Zoom más alejado para ver toda la ruta
    const longitudeDelta = Math.max((maxLng - minLng) * 2.5, 0.08); // Zoom más alejado para ver toda la ruta

    const latitude = (userLatitude + destinationLatitude) / 2;
    const longitude = (userLongitude + destinationLongitude) / 2;

    return {
        latitude,
        longitude,
        latitudeDelta,
        longitudeDelta,
    };
};

// Calculate distance between two coordinates in kilometers using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Calculate bearing (angle) between two coordinates in degrees
export const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    
    // Normalize to 0-360
    bearing = (bearing + 360) % 360;
    
    return bearing;
};

type LatLng = { latitude: number; longitude: number };

// Simple polyline decimator: keeps at most maxPoints by sampling
export const simplifyPolyline = (
    coords: LatLng[],
    maxPoints: number = 140
): LatLng[] => {
    if (!Array.isArray(coords) || coords.length <= maxPoints) return coords ?? [];
    const step = Math.ceil(coords.length / maxPoints);
    const simplified: LatLng[] = [];
    for (let i = 0; i < coords.length; i += step) {
        simplified.push(coords[i]);
    }
    // Always include last point
    if (simplified[simplified.length - 1] !== coords[coords.length - 1]) {
        simplified.push(coords[coords.length - 1]);
    }
    return simplified;
};

// Return full route geometry (LatLng[]) using OSRM, fallback to OpenRouteService
export const fetchRoutePolyline = async (
    origin: LatLng,
    destination: LatLng
): Promise<LatLng[] | null> => {
    // Try OSRM first (free, no key required)
    const osrmServers = [
        "https://router.project-osrm.org",
        "https://routing.openstreetmap.de/routed-car"
    ];

    for (const baseUrl of osrmServers) {
        try {
            const url = `${baseUrl}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            if (!res.ok) continue;
            const json = await res.json();
            const coords = json?.routes?.[0]?.geometry?.coordinates as Array<[number, number]> | undefined;
            if (coords && coords.length) {
                const poly = coords.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
                return simplifyPolyline(poly, 140);
            }
        } catch (error) {
            console.warn(`OSRM polyline ${baseUrl} failed:`, error);
        }
    }

    // Fallback: OpenRouteService (requires key)
    if (openRouteApiKey) {
        try {
            const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${origin.longitude},${origin.latitude}&end=${destination.longitude},${destination.latitude}`;
            const res = await fetch(url, {
                headers: {
                    'Authorization': openRouteApiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            if (!res.ok) return null;
            const json = await res.json();
            const coords = json?.features?.[0]?.geometry?.coordinates as Array<[number, number]> | undefined;
            if (coords && coords.length) {
                const poly = coords.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
                return simplifyPolyline(poly, 140);
            }
        } catch (error) {
            console.error("OpenRouteService polyline error:", error);
        }
    }

    return null;
};

// Fetch route metrics from OSRM (free, no API key needed)
const getOsrmMetrics = async (
    origin: LatLng,
    destination: LatLng
): Promise<{ distanceKm: number; durationMin: number } | null> => {
    const osrmServers = [
        "https://router.project-osrm.org",
        "https://routing.openstreetmap.de/routed-car"
    ];

    for (const baseUrl of osrmServers) {
        try {
            const url = `${baseUrl}/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false`;
            const res = await fetch(url);

            if (!res.ok) continue;

            const json = await res.json();
            const route = json?.routes?.[0];

            if (route && route.distance != null && route.duration != null) {
                return {
                    distanceKm: route.distance / 1000,
                    durationMin: route.duration / 60,
                };
            }
        } catch (error) {
            console.warn(`OSRM ${baseUrl} failed:`, error);
        }
    }

    return null;
};

// Fallback to OpenRouteService if OSRM fails
const getOpenRouteMetrics = async (
    origin: LatLng,
    destination: LatLng
): Promise<{ distanceKm: number; durationMin: number } | null> => {
    if (!openRouteApiKey) return null;

    try {
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?start=${origin.longitude},${origin.latitude}&end=${destination.longitude},${destination.latitude}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': openRouteApiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
            }
        });
        const json = await res.json();
        const summary = json?.features?.[0]?.properties?.summary;

        if (!summary) return null;

        const distanceKm = (summary.distance ?? 0) / 1000;
        const durationMin = (summary.duration ?? 0) / 60;

        return { distanceKm, durationMin };
    } catch (error) {
        console.error("OpenRouteService metrics error:", error);
        return null;
    }
};

// Combined function: try OSRM first (free), then OpenRouteService
const getRouteMetrics = async (
    origin: LatLng,
    destination: LatLng
): Promise<{ distanceKm: number; durationMin: number } | null> => {
    // Try OSRM first (free, no key needed)
    const osrmResult = await getOsrmMetrics(origin, destination);
    if (osrmResult) return osrmResult;

    // Fallback to OpenRouteService
    const orsResult = await getOpenRouteMetrics(origin, destination);
    if (orsResult) return orsResult;

    return null;
};

// Public helper: ETA en minutos basado en ruta (incluye perfil de velocidad/tráfico de la fuente)
export const fetchRouteEtaMinutes = async (
    origin: LatLng,
    destination: LatLng
): Promise<number | null> => {
    const metrics = await getRouteMetrics(origin, destination);
    if (!metrics) return null;
    return metrics.durationMin;
};

export const calculateDriverTimes = async ({
                                               markers,
                                               userLatitude,
                                               userLongitude,
                                               destinationLatitude,
                                               destinationLongitude,
                                           }: {
    markers: MarkerData[];
    userLatitude: number | null;
    userLongitude: number | null;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
}) => {
    if (
        !userLatitude ||
        !userLongitude ||
        !destinationLatitude ||
        !destinationLongitude
    )
        return;

    try {
        // Market-aligned pricing (matches confirm screen / rate card)
        const BASE_FARE = 2.0;
        const SERVICE_FEE = 2.5;
        const COST_PER_MILE = 1.30;
        const COST_PER_MINUTE = 0.25;
        const MIN_FARE = 9.98;
        const TAX_RATE = 0.086; // Phoenix/AZ blended default tax rate

        const destinationRoute = await getRouteMetrics(
            { latitude: userLatitude, longitude: userLongitude },
            { latitude: destinationLatitude, longitude: destinationLongitude }
        );

        const distanceToDestinationKm =
            destinationRoute?.distanceKm ??
            calculateDistance(userLatitude, userLongitude, destinationLatitude, destinationLongitude);

        const durationToDestinationMin =
            destinationRoute?.durationMin ?? (distanceToDestinationKm / 50) * 60;

        // Convert km to miles (1 km = 0.621371 miles)
        const distanceInMiles = distanceToDestinationKm * 0.621371;

        // Calculate subtotal (base + service + distance + time)
        const distanceFare = distanceInMiles * COST_PER_MILE;
        const timeFare = durationToDestinationMin * COST_PER_MINUTE;
        let subtotal = BASE_FARE + SERVICE_FEE + distanceFare + timeFare;

        // Apply minimum fare
        if (subtotal < MIN_FARE) {
            subtotal = MIN_FARE;
        }

        // Add tax
        const tax = subtotal * TAX_RATE;
        const totalPrice = subtotal + tax;

        const finalPrice = totalPrice.toFixed(2);

        const timesPromises = markers.map(async (marker) => {
            try {
                return {
                    ...marker,
                    time: durationToDestinationMin,
                    price: finalPrice,
                    distance: distanceInMiles.toFixed(1)
                };
            } catch (error) {
                console.error("Error calculating time for driver", marker.id, error);
                return {...marker, time: 0, price: "0.00", distance: "0.0"};
            }
        });

        return await Promise.all(timesPromises);
    } catch (error) {
        console.error("Error calculating driver times:", error);
    }
};
