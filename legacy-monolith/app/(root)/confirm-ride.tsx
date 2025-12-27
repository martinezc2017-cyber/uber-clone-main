/**
 * ConfirmRide - Review ride details and confirm
 * TORO Design System
 */

import CustomButton from "@/components/CustomButton";
import RideLayout from "@/components/RideLayout";
import { useLocationStore } from "@/store";
import { getTaxRate } from "@/lib/pricing";
import { useDriverStore } from "@/store";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { useMemo, useEffect, useState } from "react";
import { useThemeStore, themeColors } from "@/store/themeStore";
import { useUser } from "@clerk/clerk-expo";
import { fetchAPI } from "@/lib/fetch";

const ConfirmRide = () => {
  const { user } = useUser();
  const { drivers } = useDriverStore();
  const { userAddress, destinationAddress, userLatitude, userLongitude, destinationLatitude, destinationLongitude } = useLocationStore();
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const isDark = activeTheme === "dark";
  const [activeRide, setActiveRide] = useState<any | null>(null);
  const [checkingActive, setCheckingActive] = useState(false);

  // Evita duplicar viajes: si hay uno activo, muéstralo y bloquea nueva creación
  useEffect(() => {
    const loadActive = async () => {
      if (!user?.id) return;
      try {
        setCheckingActive(true);
        const res = await fetchAPI(`/api/ride/active?clerk_id=${user.id}`);
        setActiveRide(res?.data ?? null);
      } catch (e) {
        setActiveRide(null);
      } finally {
        setCheckingActive(false);
      }
    };
    loadActive();
  }, [user?.id]);

  const rideInfo = drivers?.[0];

  // Simple haversine for fallback miles
  const fallbackDistance = useMemo(() => {
    if (!userLatitude || !userLongitude || !destinationLatitude || !destinationLongitude) return null;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 3959;
    const dLat = toRad(destinationLatitude - userLatitude);
    const dLon = toRad(destinationLongitude - userLongitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(userLatitude)) * Math.cos(toRad(destinationLatitude)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [userLatitude, userLongitude, destinationLatitude, destinationLongitude]);

  // Calculate price and ETA
  const distance = rideInfo?.distance ? parseFloat(rideInfo.distance) : (fallbackDistance ?? 0);
  const duration = rideInfo?.time ?? (distance > 0 ? Math.ceil(distance * 2.4) : 0);

  // Pricing (market-aligned)
  const BASE_FARE = 2.0;
  const SERVICE_FEE = 2.5;
  const COST_PER_MILE = 1.30;
  const COST_PER_MINUTE = 0.25;
  const MIN_FARE = 9.98;

  let subtotal = BASE_FARE + SERVICE_FEE + (distance * COST_PER_MILE) + (duration * COST_PER_MINUTE);
  if (subtotal < MIN_FARE) subtotal = MIN_FARE;

  const cityName = userAddress?.split(',')[1]?.trim() || "";
  const taxRate = getTaxRate("AZ", cityName);
  const tax = subtotal * taxRate;
  const totalFare = (subtotal + tax).toFixed(2);

  // Format arrival time
  const now = new Date();
  const arrivalTime = new Date(now.getTime() + duration * 60000);
  const arrivalFormatted = arrivalTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Card style
  const cardStyle = {
    backgroundColor: isDark ? colors.surface : "#FFFFFF",
    borderWidth: 1,
    borderColor: isDark ? "rgba(201, 165, 92, 0.15)" : "rgba(166, 124, 61, 0.1)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.15 : 0.08,
    shadowRadius: 12,
    elevation: 6,
  };

  return (
    <RideLayout title="" snapPoints={["45%", "70%"]}>
      <View style={{ paddingBottom: 16 }}>
        {/* Arrival Time - Hero Section */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <Text style={{ color: colors.muted, fontSize: 14, fontFamily: "Jakarta-Medium" }}>
            Estimated Arrival
          </Text>
          <Text style={{ fontSize: 40, fontFamily: "Jakarta-Bold", color: colors.gold, marginTop: 4 }}>
            {arrivalFormatted}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
            {Math.round(duration)} min • {distance.toFixed(1)} mi
          </Text>
        </View>

        {/* Route Info */}
        <View style={cardStyle}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: "#3B82F6",
              marginRight: 12,
            }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Pickup</Text>
              <Text style={{ color: colors.text, fontSize: 14, fontFamily: "Jakarta-SemiBold" }} numberOfLines={1}>
                {userAddress?.split(',')[0] || "Current location"}
              </Text>
            </View>
          </View>
          <View style={{
            marginLeft: 5,
            width: 2,
            height: 16,
            backgroundColor: colors.border,
            marginBottom: 12,
          }} />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: colors.success,
              marginRight: 12,
            }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Destination</Text>
              <Text style={{ color: colors.text, fontSize: 14, fontFamily: "Jakarta-SemiBold" }} numberOfLines={1}>
                {destinationAddress?.split(',')[0] || "Select destination"}
              </Text>
            </View>
          </View>
        </View>

        {/* Total Price - Big and Clear */}
        <View style={[cardStyle, { padding: 20 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: colors.muted, fontSize: 14 }}>Total</Text>
              <Text style={{ fontSize: 36, fontFamily: "Jakarta-Bold", color: colors.gold }}>
                ${totalFare}
              </Text>
            </View>
            <View style={{
              backgroundColor: isDark ? "rgba(201, 165, 92, 0.1)" : "rgba(166, 124, 61, 0.08)",
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: isDark ? "rgba(201, 165, 92, 0.2)" : "rgba(166, 124, 61, 0.15)",
            }}>
              <Text style={{ color: colors.gold, fontSize: 13, fontFamily: "Jakarta-SemiBold" }}>
                Standard
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              Incluye base + servicio + distancia + tiempo (0.25/min). Al iniciar el viaje,
              cualquier minuto extra por tráfico se factura a $0.40/min.
            </Text>
            {distance >= 100 && (
              <Text style={{ color: colors.gold, fontSize: 12, marginTop: 4 }}>
                Bonus largo: chofer mantiene 85% de la tarifa antes de impuestos.
              </Text>
            )}
          </View>
        </View>

        {/* Buttons */}
        <View style={{ marginTop: 8 }}>
          {activeRide ? (
            <View style={[cardStyle, { marginBottom: 12 }]}>
              <Text style={{ color: colors.accent, fontSize: 14, marginBottom: 6, fontFamily: "JakartaSemiBold" }}>
                Ya tienes un viaje en curso
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 10 }}>
                ¿Este viaje es para otra persona? Si es para ti, retoma el viaje activo antes de crear otro.
              </Text>
              <CustomButton
                title="Ver viaje activo"
                onPress={() => router.replace("/(root)/book-ride")}
              />
              <View style={{ height: 8 }} />
              <CustomButton
                title="Pedir para otra persona"
                bgVariant="outline"
                onPress={() => router.push("/(root)/book-ride?guest=1")}
              />
            </View>
          ) : null}
          <CustomButton
            title={checkingActive ? "Verificando..." : "Confirm Ride"}
            disabled={!!activeRide || checkingActive}
            onPress={() => router.push("/(root)/book-ride")}
          />
          <View style={{ height: 12 }} />
          <CustomButton
            title="Cancel"
            bgVariant="outline"
            onPress={() => router.back()}
          />
        </View>
      </View>
    </RideLayout>
  );
};

export default ConfirmRide;
