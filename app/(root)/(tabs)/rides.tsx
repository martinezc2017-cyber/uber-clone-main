import { useUser } from "@clerk/clerk-expo";
import { ActivityIndicator, FlatList, Image, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import RideCard from "@/components/RideCard";
import { images } from "@/constants";
import { useFetch } from "@/lib/fetch";
import { Ride } from "@/types/type";
import Screen from "@/components/layout/Screen";
import { useGlassStyle } from "@/components/layout/GlassCard";
import { useThemeStore, themeColors } from "@/store/themeStore";

const Rides = () => {
  const { user } = useUser();
  const { activeTheme } = useThemeStore();
  const colors = themeColors[activeTheme];
  const glassStyle = useGlassStyle();

  const rideHistoryUrl = user?.id ? `/api/ride/${user.id}` : "";
  const activeRideUrl = user?.id ? `/api/ride/active?clerk_id=${user.id}` : "";

  const {
    data: recentRides,
    loading,
    error,
  } = useFetch<Ride[]>(rideHistoryUrl);
  const { data: activeRide } = useFetch<Ride>(activeRideUrl);

  const hasActive =
    !!activeRide &&
    ["pending", "accepted", "active", "in_progress", "arrived"].includes(
      String(activeRide.ride_status),
    );

  return (
    <Screen>
      <SafeAreaView className="flex-1">
      <FlatList
        data={recentRides}
        renderItem={({ item }) => <RideCard ride={item} />}
        keyExtractor={(item, index) => index.toString()}
        className="px-5"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 100,
        }}
        ListEmptyComponent={() => (
          <View style={[glassStyle, { alignItems: "center", justifyContent: "center", paddingVertical: 32 }]}>
            {!loading ? (
              <>
                <Image
                  source={images.noResult}
                  className="w-40 h-40"
                  alt="No recent rides found"
                  resizeMode="contain"
                />
                <Text style={{ color: colors.muted, fontSize: 14, marginTop: 12 }}>No recent rides found</Text>
              </>
            ) : (
              <ActivityIndicator size="small" color={colors.accent} />
            )}
          </View>
        )}
        ListHeaderComponent={
          <>
            {hasActive && (
              <View style={[glassStyle, { marginTop: 16, borderLeftWidth: 4, borderLeftColor: colors.accent }]}>
                <Text style={{ color: colors.accent, fontSize: 12, marginBottom: 4 }} className="font-JakartaBold">
                  Viaje en progreso
                </Text>
                <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 12 }}>
                  Tienes un viaje activo que no ha terminado. Retómalo para ver el seguimiento.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(root)/book-ride")}
                  style={{
                    backgroundColor: colors.accent,
                    borderRadius: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    alignSelf: "flex-start",
                    shadowColor: colors.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#1A1A1A", fontSize: 14 }} className="font-JakartaSemiBold">Retomar viaje</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={{ color: colors.text, fontSize: 24, marginVertical: 20 }} className="font-JakartaBold">All Rides</Text>
          </>
        }
      />
      </SafeAreaView>
    </Screen>
  );
};

export default Rides;
