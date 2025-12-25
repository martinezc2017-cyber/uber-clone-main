import React, { useMemo, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SwissColors } from "@/constants/theme";
import { useFetch } from "@/lib/fetch";

type DriverPoint = { lat: number; lng: number; name: string; driver_id: number };
type RouteInfo = { distanceKm: number; durationMin: number; polyline: string | null };

const DEFAULT_CENTER: DriverPoint = { lat: 19.4326, lng: -99.1332, name: "CDMX", driver_id: 0 };

// Google encoded polyline encoder
const encodePolyline = (points: { latitude: number; longitude: number }[]) => {
  const encode = (num: number) => {
    let sgnNum = num < 0 ? ~(num << 1) : num << 1;
    let output = "";
    while (sgnNum >= 0x20) {
      output += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
      sgnNum >>= 5;
    }
    output += String.fromCharCode(sgnNum + 63);
    return output;
  };

  let lastLat = 0;
  let lastLng = 0;
  let result = "";

  for (const p of points) {
    const lat = Math.round(p.latitude * 1e5);
    const lng = Math.round(p.longitude * 1e5);
    const dLat = lat - lastLat;
    const dLng = lng - lastLng;
    lastLat = lat;
    lastLng = lng;
    result += encode(dLat) + encode(dLng);
  }

  return result;
};

const LiveMapPage = () => {
  const { data: statuses, loading, error } = useFetch<any[]>("/(api)/driver/status");
  const [selectedDriver, setSelectedDriver] = useState<DriverPoint | null>(null);
  const [activeRide, setActiveRide] = useState<any | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const coords = useMemo<DriverPoint[]>(() => {
    if (!statuses) return [];
    return statuses
      .filter((s) => s.status === "online")
      .map((s) => {
        const latRaw =
          typeof s.latitude === "number"
            ? s.latitude
            : s.latitude != null
              ? Number(s.latitude)
              : null;
        const lngRaw =
          typeof s.longitude === "number"
            ? s.longitude
            : s.longitude != null
              ? Number(s.longitude)
              : null;
        if (latRaw == null || lngRaw == null) return null;
        return {
          lat: latRaw,
          lng: lngRaw,
          name: `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Driver",
          driver_id: Number(s.driver_id),
        };
      })
      .filter((point): point is DriverPoint => Boolean(point));
  }, [statuses]);

  const mapUrl = useMemo(() => {
    const key = process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY;
    const hasCoords = coords.length > 0;
    const center = selectedDriver || (hasCoords ? coords[0] : DEFAULT_CENTER);
    const hasRoute = Boolean(routeInfo?.polyline);

    if (key) {
      const markers: string[] = coords.slice(0, 25).map(
        (d) =>
          `marker=lonlat:${Number(d.lng)},${Number(d.lat)};color:%2360a5fa;size:medium;type:material`,
      );

      if (activeRide?.origin_latitude && activeRide?.origin_longitude) {
        markers.push(
          `marker=lonlat:${Number(activeRide.origin_longitude)},${Number(
            activeRide.origin_latitude,
          )};color:%23f59e0b;size:medium;type:awesome`,
        );
      }
      if (activeRide?.destination_latitude && activeRide?.destination_longitude) {
        markers.push(
          `marker=lonlat:${Number(activeRide.destination_longitude)},${Number(
            activeRide.destination_latitude,
          )};color:%23ef4444;size:medium;type:awesome`,
        );
      }

      const markerQuery = markers.length ? `${markers.join("&")}&` : "";
      const pathQuery =
        hasRoute && routeInfo?.polyline
          ? `path=color:%230286ff;weight:3;enc:${routeInfo.polyline}&`
          : "";

      return `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=900&height=420&center=lonlat:${center.lng},${center.lat}&zoom=${
        hasCoords ? 12 : 11
      }&scaleFactor=2&${pathQuery}${markerQuery}apiKey=${key}`;
    }

    // Fallback simple OSM tile (always available) so the map never looks empty
    const z = 11;
    const x = Math.floor(((center.lng + 180) / 360) * Math.pow(2, z));
    const latRad = (center.lat * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z),
    );
    return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }, [coords, selectedDriver, activeRide, routeInfo]);

  const fetchRouteForDriver = async (driver: DriverPoint) => {
    setSelectedDriver(driver);
    setRouteLoading(true);
    setRouteError(null);
    setRouteInfo(null);
    setActiveRide(null);

    try {
      const res = await fetch(`/(api)/driver/active-ride?driver_id=${driver.driver_id}`);
      const json = await res.json();
      if (!json?.data) {
        setRouteError("Este driver no tiene ride activo.");
        return;
      }
      const ride = json.data;
      setActiveRide(ride);

      const originLat = Number(ride.origin_latitude);
      const originLng = Number(ride.origin_longitude);
      const destLat = Number(ride.destination_latitude);
      const destLng = Number(ride.destination_longitude);

      const buildUrl = (base: string) =>
        `${base}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=false&steps=true`;

      const parseRoute = async (res: Response) => {
        const jsonRoute = await res.json();
        const coordsRoute: number[][] = jsonRoute?.routes?.[0]?.geometry?.coordinates ?? [];
        if (!Array.isArray(coordsRoute) || coordsRoute.length === 0) {
          throw new Error("Sin coordenadas");
        }
        const points = coordsRoute.map((c) => ({ latitude: c[1], longitude: c[0] }));
        return {
          polyline: encodePolyline(points),
          distanceKm: Number((jsonRoute?.routes?.[0]?.distance ?? 0) / 1000),
          durationMin: Number((jsonRoute?.routes?.[0]?.duration ?? 0) / 60),
        };
      };

      // Try OSRM primary
      try {
        const resOsrm = await fetch(buildUrl("https://router.project-osrm.org"));
        if (resOsrm.ok) {
          setRouteInfo(await parseRoute(resOsrm));
          return;
        }
      } catch {
        // ignore
      }

      // Backup OSRM
      try {
        const resBackup = await fetch(buildUrl("https://routing.openstreetmap.de/routed-car"));
        if (resBackup.ok) {
          setRouteInfo(await parseRoute(resBackup));
          return;
        }
      } catch {
        // ignore
      }

      // ORS if available
      const orsKey = process.env.EXPO_PUBLIC_OPENROUTE_API_KEY;
      if (orsKey) {
        try {
          const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${originLng},${originLat}&end=${destLng},${destLat}`;
          const resOrs = await fetch(url);
          if (!resOrs.ok) throw new Error("ORS error");
          const jsonOrs = await resOrs.json();
          const coordsOrs: number[][] = jsonOrs?.features?.[0]?.geometry?.coordinates ?? [];
          if (!Array.isArray(coordsOrs) || coordsOrs.length === 0) throw new Error("ORS sin coords");
          const points = coordsOrs.map((c) => ({ latitude: c[1], longitude: c[0] }));
          const props = jsonOrs?.features?.[0]?.properties;
          setRouteInfo({
            polyline: encodePolyline(points),
            distanceKm: Number((props?.summary?.distance ?? 0) / 1000),
            durationMin: Number((props?.summary?.duration ?? 0) / 60),
          });
          return;
        } catch {
          // ignore
        }
      }

      throw new Error("No se pudo obtener ruta");
    } catch (e: any) {
      setRouteError(e?.message || "Error cargando ruta");
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32, paddingRight: 4, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: "SwissColors.surfaceDark",
          fontFamily: "Jakarta-Bold, system-ui, sans-serif",
        }}
      >
        Live map
      </Text>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "SwissColors.textPrimary",
          padding: 16,
          gap: 12,
        }}
      >
        <Text
          style={{
            color: "#475569",
            fontSize: 14,
            fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
          }}
        >
          Seguimiento con coordenadas reales. Si no hay drivers online, el mapa se queda
          listo para mostrar datos en cuanto lleguen.
        </Text>

        {loading ? (
          <Text style={{ color: "#475569" }}>Cargando...</Text>
        ) : error ? (
          <Text style={{ color: "SwissColors.error" }}>Error: {error}</Text>
        ) : null}

        {mapUrl ? (
          <Image
            source={{ uri: mapUrl }}
            style={{
              width: "100%",
              height: 360,
              borderRadius: 12,
              backgroundColor: "SwissColors.textPrimary",
              borderWidth: 1,
              borderColor: "SwissColors.textPrimary",
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: 360,
              borderRadius: 12,
              backgroundColor: "SwissColors.textPrimary",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: "#475569", textAlign: "center" }}>
              Agrega EXPO_PUBLIC_GEOAPIFY_API_KEY para usar el mapa en vivo (Geoapify, gratis).
              Mientras tanto, el backend sigue devolviendo las coordenadas reales de los drivers.
            </Text>
          </View>
        )}

        <View style={{ gap: 6 }}>
          <Text
            style={{
              color: "SwissColors.surfaceDark",
              fontSize: 13,
              fontFamily: "Jakarta-SemiBold, system-ui, sans-serif",
            }}
          >
            Drivers online: {coords.length}
          </Text>
          {coords.length ? (
            coords.slice(0, 8).map((d, idx) => (
              <Text
                key={`${d.lat}-${d.lng}-${idx}`}
                style={{
                  color: "#475569",
                  fontSize: 12,
                  fontFamily: "Jakarta-Regular, system-ui, sans-serif",
                }}
              >
                {idx + 1}. {d.name} ({d.lat.toFixed(4)}, {d.lng.toFixed(4)})
              </Text>
            ))
          ) : (
            <Text
              style={{
                color: "#475569",
                fontSize: 12,
                fontFamily: "Jakarta-Regular, system-ui, sans-serif",
              }}
            >
              No hay drivers online ahora mismo, pero el mapa queda conectado al endpoint
              /(api)/driver/status para mostrarlos apenas reporten.
            </Text>
          )}
        </View>

        {/* Driver selection to view active ride route */}
        <View style={{ gap: 8, marginTop: 8 }}>
          <Text style={{ color: "#0f172a", fontSize: 13, fontWeight: "700" }}>
            Ver ruta del ride activo (toca un driver)
          </Text>
          {coords.slice(0, 12).map((d) => (
            <TouchableOpacity
              key={`${d.driver_id}-${d.lat}-${d.lng}`}
              onPress={() => fetchRouteForDriver(d)}
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderColor: "#e2e8f0",
              }}
            >
              <Text style={{ color: "#0f172a", fontSize: 13, fontWeight: "600" }}>
                {d.name} (ID {d.driver_id})
              </Text>
              <Text style={{ color: "#475569", fontSize: 12 }}>
                {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
              </Text>
            </TouchableOpacity>
          ))}
          {coords.length === 0 && (
            <Text style={{ color: "#475569", fontSize: 12 }}>
              No hay drivers online para consultar.
            </Text>
          )}
        </View>

        {/* Active ride + route summary */}
        {routeLoading && (
          <Text style={{ color: "#475569", fontSize: 12, marginTop: 8 }}>
            Cargando ruta del driver...
          </Text>
        )}
        {routeError && (
          <Text style={{ color: SwissColors.error, fontSize: 12, marginTop: 8 }}>
            {routeError}
          </Text>
        )}
        {activeRide && (
          <View style={{ marginTop: 10, gap: 6 }}>
            <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "700" }}>
              Ride activo (driver seleccionado)
            </Text>
            <Text style={{ color: "#475569", fontSize: 12 }}>
              {activeRide.origin_address} → {activeRide.destination_address}
            </Text>
            <Text style={{ color: "#475569", fontSize: 12 }}>
              Estado: {activeRide.ride_status} · ID {activeRide.ride_id}
            </Text>
            {routeInfo && (
              <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "600" }}>
                {routeInfo.distanceKm.toFixed(1)} km · {Math.round(routeInfo.durationMin)} min (OSRM/ORS)
              </Text>
            )}
            {!process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY && (
              <Text style={{ color: "#ef4444", fontSize: 11 }}>
                Agrega EXPO_PUBLIC_GEOAPIFY_API_KEY para ver la ruta en el mapa estático.
              </Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default LiveMapPage;
