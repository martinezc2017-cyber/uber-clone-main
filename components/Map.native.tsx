import { icons } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { calculateDriverTimes, calculateRegion, generateMarkersFromData } from "@/lib/map";
import { useDriverStore, useLocationStore } from "@/store";
import { Driver, MarkerData } from "@/types/type";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";


const Map = () => {
    const { data: drivers, loading, error } = useFetch<Driver[]>("/(api)/driver")
     const {
        userLongitude,
        userLatitude,
        destinationLongitude,
        destinationLatitude,
        } = useLocationStore();
        const { selectedDriver, setDrivers } = useDriverStore();
        const [ markers, setMarkers ] = useState<MarkerData[]>([])
        const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
        const [directionsError, setDirectionsError] = useState<string | null>(null);
        const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
        const orsApiKey = process.env.EXPO_PUBLIC_OPENROUTE_API_KEY;

    console.log("Map component - userLatitude:", userLatitude, "userLongitude:", userLongitude);
    console.log("Map component - destinationLatitude:", destinationLatitude, "destinationLongitude:", destinationLongitude);
    console.log("Map component - drivers:", drivers?.length, "loading:", loading, "error:", error, "orsKey?", !!orsApiKey);

    const region = calculateRegion({
        userLatitude,
        userLongitude,
        destinationLatitude,
        destinationLongitude,
    });

    console.log("Map component - region:", region);
    console.log("Map component - Has destination?", !!destinationLatitude && !!destinationLongitude);

    useEffect(() => {
        
        if(Array.isArray(drivers)) {
            if( !userLatitude || !userLongitude ) return;

            const newMarkers = generateMarkersFromData({
                data: drivers,
                userLatitude,
                userLongitude,
            });

            setMarkers(newMarkers)
        }
    }, [drivers, userLatitude, userLongitude]) 

    useEffect (() => {
        if (markers.length > 0 && destinationLatitude  && destinationLongitude )
            {
            calculateDriverTimes({
                markers,
                userLatitude,
                userLongitude,
                destinationLatitude,
                destinationLongitude
            }).then((driver) => {
                setDrivers(driver as MarkerData[]);
            });
        }
    }, [markers, destinationLatitude, destinationLongitude]);

    useEffect(() => {
        const fetchFromOsrm = async (baseUrl: string) => {
            const url = `${baseUrl}/route/v1/driving/${userLongitude},${userLatitude};${destinationLongitude},${destinationLatitude}?overview=full&geometries=geojson&alternatives=false&steps=true`;
            const res = await fetch(url);
            if (!res.ok) {
                const body = await res.text();
                throw new Error(`OSRM ${baseUrl} ${res.status}: ${body.slice(0, 120)}`);
            }

            const json = await res.json();
            const coords = json?.routes?.[0]?.geometry?.coordinates;

            if (Array.isArray(coords) && coords.length > 0) {
                return {
                    coords: coords.map((c: number[]) => ({
                        latitude: c[1],
                        longitude: c[0],
                    })),
                    summary: {
                        distanceKm: Number((json?.routes?.[0]?.distance ?? 0) / 1000),
                        durationMin: Number((json?.routes?.[0]?.duration ?? 0) / 60),
                    },
                };
            }

            throw new Error(`OSRM ${baseUrl} sin coords`);
        };

        const fetchRoute = async () => {
            if (
                !userLatitude ||
                !userLongitude ||
                !destinationLatitude ||
                !destinationLongitude
            ) {
                setRouteCoordinates([]);
                return;
            }

            try {
                const primary = await fetchFromOsrm("https://router.project-osrm.org");
                setRouteCoordinates(primary.coords);
                setRouteInfo(primary.summary);
                setDirectionsError(null);
                return;
            } catch (primaryErr) {
                console.warn("OSRM primario fallo", primaryErr?.message || primaryErr);
            }

            try {
                const backup = await fetchFromOsrm("https://routing.openstreetmap.de/routed-car");
                setRouteCoordinates(backup.coords);
                setRouteInfo(backup.summary);
                setDirectionsError(null);
                return;
            } catch (backupErr) {
                console.warn("OSRM backup fallo", backupErr?.message || backupErr);
            }

            // Try OpenRouteService (needs key)
            if (orsApiKey) {
                try {
                    const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsApiKey}&start=${userLongitude},${userLatitude}&end=${destinationLongitude},${destinationLatitude}`;
                    const res = await fetch(orsUrl);
                    if (!res.ok) {
                        const body = await res.text();
                        throw new Error(`ORS ${res.status}: ${body.slice(0, 120)}`);
                    }
                    const json = await res.json();
                    const coords: number[][] = json?.features?.[0]?.geometry?.coordinates ?? [];
                    if (Array.isArray(coords) && coords.length > 0) {
                        setRouteCoordinates(
                            coords.map((c) => ({ latitude: c[1], longitude: c[0] }))
                        );
                        const props = json?.features?.[0]?.properties;
                        setRouteInfo({
                            distanceKm: Number((props?.summary?.distance ?? 0) / 1000),
                            durationMin: Number((props?.summary?.duration ?? 0) / 60),
                        });
                        setDirectionsError(null);
                        return;
                    }
                    throw new Error("ORS sin coords");
                } catch (orsErr) {
                    console.warn("ORS fallo", (orsErr as Error)?.message || orsErr);
                }
            }

            // Fallback: straight line + error
            setRouteCoordinates([
                { latitude: userLatitude, longitude: userLongitude },
                { latitude: destinationLatitude, longitude: destinationLongitude },
            ]);
            setRouteInfo(null);
            setDirectionsError("No se pudo obtener la ruta (OSRM/ORS)");
        };

        if (destinationLatitude && destinationLongitude) {
            fetchRoute();
        } else {
            setRouteCoordinates([]);
        }
    }, [destinationLatitude, destinationLongitude, userLatitude, userLongitude]);

    if (loading || !userLatitude || !userLongitude){
        console.log("Map - showing loading spinner");
        return (
            <View className="flex justify-between items-center w-full" >
                <ActivityIndicator size="small" color="#000" />
            </View>
            )
        }

        if(error) {
            console.log("Map - showing error:", error);
            return (
            <View className="flex justify-between items-center w-full" >
                <Text>Error: {error}</Text>
            </View>
            )
        }

    console.log("Map - rendering MapView");
    return (
    <>
        <MapView
            style={{ width: '100%', height: '100%', borderRadius: 16 }}
            initialRegion={region}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            showsTraffic
        >
            {markers.map((marker) => {
                if (marker.latitude == null || marker.longitude == null) return null;

                return (
                    <Marker
                        key={marker.id}
                        coordinate={{
                            latitude: marker.latitude,
                            longitude: marker.longitude,
                        }}
                        title={marker.title}
                        image={
                            selectedDriver === marker.id ? icons.selectedMarker : icons.marker
                        }
                    />
                );
            })}

            {destinationLatitude && destinationLongitude && (
                <>
                <Marker
                    key="destination"
                    coordinate={{
                        latitude: destinationLatitude,
                        longitude: destinationLongitude
                    }}
                    title="Destination"
                    image={icons.pin}
                    />

                    {routeCoordinates.length > 0 && (
                        <Polyline
                            coordinates={routeCoordinates}
                            strokeColor="#0286ff"
                            strokeWidth={4}
                        />
                    )}
                </>
            )}
        </MapView>
        {(routeInfo || directionsError) && (
            <View className="absolute bottom-2 left-2 right-2 bg-white rounded-md p-2 shadow-sm shadow-neutral-400 flex-row justify-between">
                {routeInfo ? (
                    <>
                        <Text className="text-xs text-gray-800">
                            {routeInfo.distanceKm.toFixed(1)} km · {Math.round(routeInfo.durationMin)} min
                        </Text>
                        <Text className="text-xs text-gray-600">Tráfico: Google/OSM</Text>
                    </>
                ) : (
                    <Text className="text-xs text-red-500">
                        {directionsError}
                    </Text>
                )}
            </View>
        )}
    </>
    )
}

export default Map;
