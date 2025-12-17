import { icons } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { calculateDriverTimes, calculateRegion, generateMarkersFromData } from "@/lib/map";
import { useDriverStore, useLocationStore } from "@/store";
import { Driver, MarkerData } from "@/types/type";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";


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
                console.log("OSRM request", {
                    start: { lat: userLatitude, lon: userLongitude },
                    end: { lat: destinationLatitude, lon: destinationLongitude },
                });

                // Using OSRM (Open Source Routing Machine) - completely free, no API key needed
                const url = `https://router.project-osrm.org/route/v1/driving/${userLongitude},${userLatitude};${destinationLongitude},${destinationLatitude}?overview=full&geometries=geojson`;

                const res = await fetch(url);
                if (!res.ok) {
                    const body = await res.text();
                    console.warn("OSRM non-OK", res.status, body);
                    setRouteCoordinates([
                        { latitude: userLatitude, longitude: userLongitude },
                        { latitude: destinationLatitude, longitude: destinationLongitude },
                    ]);
                    setDirectionsError(`Routing error: ${res.status}`);
                    return;
                }

                const json = await res.json();
                console.log("OSRM response code:", json?.code);
                const coords = json?.routes?.[0]?.geometry?.coordinates;

                if (Array.isArray(coords) && coords.length > 0) {
                    const mapped = coords.map((c: number[]) => ({
                        latitude: c[1],
                        longitude: c[0],
                    }));
                    setRouteCoordinates(mapped);
                    console.log("OSRM polyline points:", mapped.length);
                    setDirectionsError(null);
                } else {
                    console.warn("OSRM sin coords", json);
                    setRouteCoordinates([
                        { latitude: userLatitude, longitude: userLongitude },
                        { latitude: destinationLatitude, longitude: destinationLongitude },
                    ]);
                    setDirectionsError("No se pudo obtener la ruta");
                }
            } catch (e: any) {
                console.warn("OSRM directions error:", e?.message || e);
                setRouteCoordinates([
                    { latitude: userLatitude!, longitude: userLongitude! },
                    { latitude: destinationLatitude!, longitude: destinationLongitude! },
                ]);
                setDirectionsError("Error obteniendo ruta");
            }
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
            showsUserLocation={true}
        >
            {markers.map((marker) => (
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
            ))}

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
        {directionsError && (
            <View className="absolute bottom-2 left-2 right-2 bg-white rounded-md p-2 shadow-sm shadow-neutral-400">
                <Text className="text-xs text-red-500">
                    {directionsError}
                </Text>
            </View>
        )}
    </>
    )
}

export default Map;
