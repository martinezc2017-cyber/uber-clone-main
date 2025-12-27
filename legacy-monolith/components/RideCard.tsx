import { useState } from "react";
import { Image, Text, View, TouchableOpacity, Animated, Alert, Share } from "react-native";

import { icons } from "@/constants";
import { formatDate, formatTimeOfDay } from "@/lib/utils";
import { Ride } from "@/types/type";
import { fetchAPI } from "@/lib/fetch";
import { useGlassStyle } from "@/components/layout/GlassCard";
import { useThemeStore, themeColors } from "@/store/themeStore";

const RideCard = ({ ride, onDeleted, userRole = "user" }: { ride: Ride; onDeleted?: () => void; userRole?: "user" | "driver" | "admin" }) => {
  const [expanded, setExpanded] = useState(false);
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const glassStyle = useGlassStyle();
  const [deleting, setDeleting] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Format price from cents to dollars
  const formatPrice = (cents: number | string | null | undefined) => {
    if (!cents) return "$0.00";
    const numCents = typeof cents === 'string' ? parseFloat(cents) : cents;
    if (isNaN(numCents)) return "$0.00";
    return `$${(numCents / 100).toFixed(2)}`;
  };

  // Calcular duración del viaje (tiempo online)
  const calculateDuration = () => {
    if (!ride.created_at || !ride.completed_at) return null;
    const start = new Date(ride.created_at).getTime();
    const end = new Date(ride.completed_at).getTime();
    const minutes = Math.floor((end - start) / 60000);
    return minutes > 0 ? `${minutes} min` : null;
  };

  // Estimar millas basado en distancia (aproximado)
  const calculateDistance = () => {
    if (!ride.origin_latitude || !ride.origin_longitude || !ride.destination_latitude || !ride.destination_longitude) {
      return null;
    }
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const R = 3959; // miles
    const dLat = toRad(Number(ride.destination_latitude) - Number(ride.origin_latitude));
    const dLon = toRad(Number(ride.destination_longitude) - Number(ride.origin_longitude));
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(Number(ride.origin_latitude))) *
        Math.cos(toRad(Number(ride.destination_latitude))) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance > 0 ? distance.toFixed(1) : null;
  };

  // Eliminar viaje
  const handleDelete = () => {
    Alert.alert(
      "Eliminar viaje",
      "¿Estás seguro que deseas eliminar este viaje del historial?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await fetchAPI(`/api/ride/${ride.ride_id}`, { method: "DELETE" });
              Alert.alert("Éxito", "Viaje eliminado del historial");
              onDeleted?.();
            } catch (e) {
              Alert.alert("Error", "No se pudo eliminar el viaje");
            }
            setDeleting(false);
          },
        },
      ]
    );
  };

  // Descargar/Exportar datos del viaje para registros fiscales (PRIVACIDAD: sin info personal)
  const handleDownloadRecord = async () => {
    try {
      const pickupAddressSanitized = sanitizePickupAddress(ride.origin_address);

      const rideRecord = `
REPORTE DE VIAJE - REGISTRO FISCAL
===================================
Viaje #${ride.trip_number || "N/A"}
ID Viaje: ${ride.ride_id}
Fecha: ${formatDate(ride.created_at)}
Hora Inicio: ${formatTimeOfDay(ride.created_at)}
Ubicación Recogida: ${pickupAddressSanitized}
Destino: ${ride.destination_address}
Distancia: ${distance || "N/A"} millas
Duración: ${duration || "N/A"}
Tarifa: ${formatPrice(ride.fare_price)}
Estado Pago: ${ride.payment_status === "paid" ? "Pagado" : "Pendiente"}
Estado Viaje: ${rideStatus === "completed" ? "Completado" : rideStatus === "cancelled" ? "Cancelado" : "En progreso"}

NOTA: Esta información se proporciona para propósitos fiscales y contables únicamente.
No incluye datos personales de cliente o conductor por motivos de privacidad.
      `.trim();

      // Compartir o descargar
      await Share.share({
        message: rideRecord,
        title: `Viaje #${ride.trip_number || ride.ride_id}`,
      });
    } catch (e) {
      Alert.alert("Error", "No se pudo descargar el registro");
    }
  };

  const duration = calculateDuration();
  const distance = calculateDistance();
  const rideStatus = ride.ride_status || "pending";
  const isCompleted = rideStatus === "completed" || rideStatus === "cancelled";

  // Limpia dirección del pickup removiendo números (privacidad)
  const sanitizePickupAddress = (address: string | null | undefined) => {
    if (!address) return "Ubicación de recogida";
    // Remove numbers from the street address, keep only letters and key words
    return address.replace(/\d+/g, "").replace(/,\s+/g, ", ").trim();
  };

  return (
    <View style={[glassStyle, { padding: 0, marginBottom: 12, overflow: "hidden" }]}>
      {/* Header - Always visible, tap to expand */}
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.7}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: activeTheme === "dark" ? "rgba(201, 165, 92, 0.15)" : "rgba(166, 124, 61, 0.1)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12
          }}>
            <Image source={icons.point} className="w-5 h-5" style={{ tintColor: colors.gold }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16 }} className="font-JakartaBold">
              {ride.created_at ? formatDate(ride.created_at) : "No date"}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14 }} className="font-JakartaMedium">
              Viaje #{ride.trip_number || "N/A"} • {ride.created_at ? formatTimeOfDay(ride.created_at) : ""}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: colors.success, fontSize: 16, marginRight: 8 }} className="font-JakartaBold">
            {formatPrice(ride.fare_price)}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 16, transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            ▼
          </Text>
        </View>
      </TouchableOpacity>

      {/* Expandable content */}
      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
          {/* Map preview */}
          <View style={{ marginTop: 12, flexDirection: "row" }}>
            <Image
              source={{
                uri: `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:${ride.destination_longitude},${ride.destination_latitude}&zoom=14&apiKey=${process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY}`,
              }}
              style={{ width: 80, height: 90, borderRadius: 8 }}
            />

            <View style={{ marginLeft: 16, flex: 1, justifyContent: "center", gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.success }} />
                <Text style={{ color: colors.muted, fontSize: 14 }} className="font-JakartaMedium" numberOfLines={1}>
                  {ride.origin_address}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger }} />
                <Text style={{ color: colors.muted, fontSize: 14 }} className="font-JakartaMedium" numberOfLines={1}>
                  {ride.destination_address}
                </Text>
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={{
            marginTop: 16,
            backgroundColor: activeTheme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.border
          }}>
            {/* Driver info - visible to user and admin (only while trip is active) */}
            {(userRole === "user" || userRole === "admin") && !isCompleted && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ color: colors.muted, fontSize: 14 }} className="font-JakartaMedium">
                    Conductor
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 14 }} className="font-JakartaBold">
                    {ride.driver?.first_name && ride.driver?.last_name
                      ? `${ride.driver.first_name} ${ride.driver.last_name}`
                      : "Asignando..."}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ color: colors.muted, fontSize: 14 }} className="font-JakartaMedium">
                    Asientos del auto
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 14 }} className="font-JakartaBold">
                    {ride.driver?.car_seats || "-"}
                  </Text>
                </View>
              </>
            )}

            {/* Client info - visible to driver and admin (only while trip is active) */}
            {(userRole === "driver" || userRole === "admin") && !isCompleted && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ color: colors.muted, fontSize: 14 }} className="font-JakartaMedium">
                    Pasajero
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 14 }} className="font-JakartaBold">
                    {ride.user_name || "Cliente"}
                  </Text>
                </View>
              </>
            )}

            {/* Privacy notice when trip is completed or cancelled */}
            {isCompleted && (
              <View style={{
                backgroundColor: activeTheme === "dark" ? "rgba(59, 130, 246, 0.15)" : "#dbeafe",
                borderWidth: 1,
                borderColor: activeTheme === "dark" ? "rgba(59, 130, 246, 0.3)" : "#bfdbfe",
                borderRadius: 8,
                padding: 12,
                marginBottom: 12
              }}>
                <Text style={{ color: "#3b82f6", fontSize: 12 }} className="font-JakartaMedium">
                  🔒 Viaje finalizado: Los perfiles de cliente y conductor no están disponibles por privacidad.
                </Text>
              </View>
            )}

            {/* Payment Status - visible to all */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ color: colors.muted, fontSize: 14 }} className="font-JakartaMedium">
                Estado de pago
              </Text>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: ride.payment_status === "paid"
                  ? (activeTheme === "dark" ? "rgba(22, 163, 74, 0.15)" : "#dcfce7")
                  : (activeTheme === "dark" ? "rgba(217, 119, 6, 0.15)" : "#fef3c7")
              }}>
                <Text style={{
                  color: ride.payment_status === "paid" ? colors.success : colors.warning,
                  fontSize: 12,
                  textTransform: "capitalize"
                }} className="font-JakartaBold">
                  {ride.payment_status === "paid" ? "Pagado" : "Pendiente"}
                </Text>
              </View>
            </View>

            {/* Ride status - visible to all */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
              <Text style={{ color: colors.muted, fontSize: 14 }} className="font-JakartaMedium">
                Estado
              </Text>
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: rideStatus === "completed"
                  ? (activeTheme === "dark" ? "rgba(22, 163, 74, 0.15)" : "#dcfce7")
                  : rideStatus === "cancelled"
                  ? (activeTheme === "dark" ? "rgba(239, 68, 68, 0.15)" : "#fee2e2")
                  : (activeTheme === "dark" ? "rgba(59, 130, 246, 0.15)" : "#dbeafe")
              }}>
                <Text style={{
                  color: rideStatus === "completed" ? colors.success
                    : rideStatus === "cancelled" ? colors.danger
                    : "#3b82f6",
                  fontSize: 12,
                  textTransform: "capitalize"
                }} className="font-JakartaBold">
                  {rideStatus === "completed" ? "Completado" : rideStatus === "cancelled" ? "Cancelado" : "En progreso"}
                </Text>
              </View>
            </View>

            {/* Duration - visible to all */}
            {duration && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 14 }} className="font-JakartaMedium">
                  Duración
                </Text>
                <Text style={{ color: colors.text, fontSize: 14 }} className="font-JakartaBold">
                  {duration}
                </Text>
              </View>
            )}

            {/* Distance - visible to all */}
            {distance && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 14 }} className="font-JakartaMedium">
                  Distancia
                </Text>
                <Text style={{ color: colors.text, fontSize: 14 }} className="font-JakartaBold">
                  {distance} mi
                </Text>
              </View>
            )}
          </View>

          {/* Download button - for all users to download record for tax purposes */}
          <TouchableOpacity
            onPress={handleDownloadRecord}
            style={{
              marginTop: 16,
              backgroundColor: activeTheme === "dark" ? "rgba(59, 130, 246, 0.15)" : "#dbeafe",
              borderRadius: 12,
              paddingVertical: 10,
              paddingHorizontal: 12
            }}
            activeOpacity={0.7}
          >
            <Text style={{ color: "#3b82f6", textAlign: "center", fontSize: 14 }} className="font-JakartaSemiBold">
              📥 Descargar Registro (Impuestos)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default RideCard;
