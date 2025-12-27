import { icons } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { calculateDriverTimes, calculateRegion, generateMarkersFromData, calculateBearing } from "@/lib/map";
import { useDriverStore, useLocationStore } from "@/store";
import { Driver, MarkerData } from "@/types/type";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import DriverCarMarker from "./DriverCarMarker";


type MapProps = {
    showDestination?: boolean;
};

const Map = ({ showDestination = true }: MapProps) => {
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
        const mapRef = useRef<MapView>(null);

    const destLat = showDestination ? destinationLatitude : null;
    const destLng = showDestination ? destinationLongitude : null;
    const deg2rad = Math.PI / 180;
    const metersToLat = (m: number) => m / 111_000;
    const metersToLng = (m: number, lat: number) => m / (111_000 * Math.cos((lat || 0) * deg2rad || 1));

    const region = calculateRegion({
        userLatitude,
        userLongitude,
        destinationLatitude: destLat,
        destinationLongitude: destLng,
    });

    // Animar automáticamente cuando cambien las coordenadas
    useEffect(() => {
        if (mapRef.current && region) {
            mapRef.current.animateToRegion(region, 1000); // Animar en 1 segundo
        }
    }, [userLatitude, userLongitude, destLat, destLng]);

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
        if (!showDestination) return;

        if (markers.length > 0 && destLat  && destLng )
            {
            calculateDriverTimes({
                markers,
                userLatitude,
                userLongitude,
                destinationLatitude: destLat,
                destinationLongitude: destLng
            }).then((driver) => {
                setDrivers(driver as MarkerData[]);
            });
        }
    }, [markers, destLat, destLng, showDestination]);

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
                !destLat ||
                !destLng ||
                !showDestination
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
                console.warn("OSRM primario fallo", (primaryErr as Error)?.message || primaryErr);
            }

            try {
                const backup = await fetchFromOsrm("https://routing.openstreetmap.de/routed-car");
                setRouteCoordinates(backup.coords);
                setRouteInfo(backup.summary);
                setDirectionsError(null);
                return;
            } catch (backupErr) {
                console.warn("OSRM backup fallo", (backupErr as Error)?.message || backupErr);
            }

            // Try OpenRouteService (needs key)
            if (orsApiKey) {
                try {
                    const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsApiKey}&start=${userLongitude},${userLatitude}&end=${destLng},${destLat}`;
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
                { latitude: destLat, longitude: destLng },
            ]);
            setRouteInfo(null);
            setDirectionsError("No se pudo obtener la ruta (OSRM/ORS)");
        };

        if (destLat && destLng && showDestination) {
            fetchRoute();
        } else {
            setRouteCoordinates([]);
        }
    }, [destLat, destLng, userLatitude, userLongitude, showDestination]);

    // Movimiento automático suave para marcadores simulados (sin coords reales)
    useEffect(() => {
        const id = setInterval(() => {
            setMarkers((prev) =>
                prev.map((m, idx) => {
                    if (!m.dynamic || m.latitude == null || m.longitude == null) return m;
                    const driftMeters = 20 + Math.random() * 30; // 20-50 m
                    const angle = ((Date.now() / 1000) * 25 + idx * 47) % 360; // variación por marcador
                    const latOffset = metersToLat(driftMeters * Math.cos(angle * deg2rad));
                    const lngOffset = metersToLng(driftMeters * Math.sin(angle * deg2rad), m.latitude);
                    return {
                        ...m,
                        latitude: m.latitude + latOffset,
                        longitude: m.longitude + lngOffset,
                    };
                })
            );
        }, 4200);

        return () => clearInterval(id);
    }, []);

    if (!userLatitude || !userLongitude){
        return (
            <View className="flex justify-between items-center w-full" >
                <ActivityIndicator size="small" color="#000" />
            </View>
            )
        }

        if(error) {
            return (
            <View className="flex justify-between items-center w-full" >
                <Text>Error: {error}</Text>
            </View>
            )
        }

    return (
    <>
        <MapView
            ref={mapRef}
            style={{ width: '100%', height: '100%', borderRadius: 16 }}
            initialRegion={region}
            provider={PROVIDER_GOOGLE}
            showsUserLocation={true}
            customMapStyle={[]}
        >
            {markers.map((marker) => {
                if (marker.latitude == null || marker.longitude == null) return null;
                
                // Calcular el ángulo del carro hacia la ubicación del usuario
                let carRotation = 0;
                if (userLatitude && userLongitude) {
                    const bearing = calculateBearing(
                        marker.latitude,
                        marker.longitude,
                        userLatitude,
                        userLongitude
                    );
                    // Ajustar el ángulo para que el carro apunte correctamente
                    // El icono del carro por defecto apunta hacia arriba (0°)
                    carRotation = bearing;
                }

                return (
                    <Marker
                        key={marker.id}
                        coordinate={{
                            latitude: marker.latitude,
                            longitude: marker.longitude,
                        }}
                        title={marker.title}
                        flat={true}
                        anchor={{ x: 0.5, y: 0.5 }}
                    >
                        <DriverCarMarker
                            size={44}
                            selected={selectedDriver === marker.id}
                            rotation={carRotation}
                        />
                    </Marker>
                );
            })}

            {showDestination && destLat && destLng && (
                <>
                <Marker
                    key="destination"
                    coordinate={{
                        latitude: destLat,
                        longitude: destLng
                    }}
                    title="Destination"
                    image={icons.pin}
                    />

                    {/* Sin polyline de ruta */}
                </>
            )}
        </MapView>
    </>
    )
}

export default Map;

