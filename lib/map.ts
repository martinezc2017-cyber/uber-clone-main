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
    return data.map((driver) => {
        const latOffset = (Math.random() - 0.5) * 0.01; // Random offset between -0.005 and 0.005
        const lngOffset = (Math.random() - 0.5) * 0.01; // Random offset between -0.005 and 0.005

        return {
            latitude: userLatitude + latOffset,
            longitude: userLongitude + lngOffset,
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
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    }

    const minLat = Math.min(userLatitude, destinationLatitude);
    const maxLat = Math.max(userLatitude, destinationLatitude);
    const minLng = Math.min(userLongitude, destinationLongitude);
    const maxLng = Math.max(userLongitude, destinationLongitude);

    const latitudeDelta = Math.max((maxLat - minLat) * 1.5, 0.02); // Adding more padding and minimum zoom
    const longitudeDelta = Math.max((maxLng - minLng) * 1.5, 0.02); // Adding more padding and minimum zoom

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

type LatLng = { latitude: number; longitude: number };

const getRouteMetrics = async (
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
        // Uber pricing structure for Arizona
        const BASE_FARE = 2.50;  // Base fare
        const COST_PER_MILE = 1.15;  // Cost per mile (similar to UberX)
        const COST_PER_MINUTE = 0.22;  // Cost per minute
        const SERVICE_FEE = 2.75;  // Booking fee
        const MIN_FARE = 7.00;  // Minimum fare

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

        // Calculate price using Uber formula
        const calculatedPrice = BASE_FARE +
                               (distanceInMiles * COST_PER_MILE) +
                               (durationToDestinationMin * COST_PER_MINUTE) +
                               SERVICE_FEE;

        const finalPrice = Math.max(calculatedPrice, MIN_FARE).toFixed(2);

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
